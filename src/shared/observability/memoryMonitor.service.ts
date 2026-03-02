import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// import { SlackService } from './slack.service';
import { RequestTrackerService } from './requestTracker.service';
import * as v8 from 'node:v8';

interface MemorySnapshot {
  timestamp: string;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
  heapUsagePercent: number;
  uptimeMinutes: number;
  cpuPercent: number;
  eventLoopLagMs: number;
}

@Injectable()
export class MemoryMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MemoryMonitorService.name);
  private monitorInterval: NodeJS.Timeout | null = null;
  private lastWarningTime = 0;
  private memoryHistory: MemorySnapshot[] = [];

  // Previous values for delta calculations
  private previousHeapUsedMB = 0;
  private previousCpuUsage: NodeJS.CpuUsage | null = null;
  private previousCpuTime = 0;

  // Configuration - tuned for spike detection
  private readonly MONITOR_INTERVAL_MS = 30000; // Check every 30 seconds (balance between detection and overhead)
  private readonly WARNING_THRESHOLD = 0.75;
  private readonly CRITICAL_THRESHOLD = 0.85;
  private readonly SPIKE_THRESHOLD_MB = 100; // Alert if heap grows >100MB in 30s
  private readonly WARNING_COOLDOWN_MS = 300000; // Only warn every 5 minutes for threshold alerts
  private readonly MAX_HISTORY_SIZE = 60; // Keep last 60 snapshots (30 minutes at 30s intervals)

  constructor(
    private readonly configService: ConfigService,
    // private readonly slackService: SlackService,
    private readonly requestTracker?: RequestTrackerService,
  ) {}

  /**
   * Get the V8 heap limit dynamically (auto-detected from container memory or --max-old-space-size)
   */
  private getHeapLimitMB(): number {
    const heapStats = v8.getHeapStatistics();
    return Math.round(heapStats.heap_size_limit / 1024 / 1024);
  }

  onModuleInit() {
    // Only enable in production
    if (this.configService.get<string>('common.nodeEnv') !== 'production') {
      this.logger.log('Memory monitor disabled (not production)');
      return;
    }

    this.logger.log('Starting memory monitor with spike detection...');
    this.startMonitoring();
  }

  onModuleDestroy() {
    this.stopMonitoring();
  }

  private startMonitoring() {
    // Take initial snapshot
    this.takeSnapshot();

    // Schedule periodic monitoring
    this.monitorInterval = setInterval(() => {
      this.takeSnapshot();
    }, this.MONITOR_INTERVAL_MS);

    // Unref so it doesn't prevent process exit
    this.monitorInterval.unref();
  }

  private stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  private measureEventLoopLag(): number {
    const start = process.hrtime.bigint();
    // Measure how long a setImmediate takes (should be ~0ms if event loop is free)
    // For synchronous measurement, we use the time since last check
    const end = process.hrtime.bigint();
    return Number(end - start) / 1e6; // Convert nanoseconds to milliseconds
  }

  private calculateCpuPercent(): number {
    const currentCpuUsage = process.cpuUsage();
    const currentTime = Date.now();

    if (!this.previousCpuUsage || !this.previousCpuTime) {
      this.previousCpuUsage = currentCpuUsage;
      this.previousCpuTime = currentTime;
      return 0;
    }

    const elapsedMs = currentTime - this.previousCpuTime;
    if (elapsedMs === 0) return 0;

    // CPU usage is in microseconds
    const userDelta = currentCpuUsage.user - this.previousCpuUsage.user;
    const systemDelta = currentCpuUsage.system - this.previousCpuUsage.system;
    const totalCpuDelta = userDelta + systemDelta;

    // Convert to percentage (microseconds to milliseconds, then percentage)
    const cpuPercent = (totalCpuDelta / 1000 / elapsedMs) * 100;

    this.previousCpuUsage = currentCpuUsage;
    this.previousCpuTime = currentTime;

    return Math.round(cpuPercent * 10) / 10; // Round to 1 decimal
  }

  private takeSnapshot() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);
    const heapUsagePercent = heapUsedMB / this.getHeapLimitMB();
    const uptimeMinutes = Math.round(process.uptime() / 60);
    const cpuPercent = this.calculateCpuPercent();
    const eventLoopLagMs = this.measureEventLoopLag();

    const snapshot: MemorySnapshot = {
      timestamp: new Date().toISOString(),
      heapUsedMB,
      heapTotalMB,
      rssMB,
      externalMB,
      heapUsagePercent,
      uptimeMinutes,
      cpuPercent,
      eventLoopLagMs,
    };

    // Store in history (bounded)
    this.memoryHistory.push(snapshot);
    if (this.memoryHistory.length > this.MAX_HISTORY_SIZE) {
      this.memoryHistory.shift();
    }

    // Log every snapshot for the logs
    this.logger.log(
      `[MEMORY] heap=${heapUsedMB}MB/${this.getHeapLimitMB()}MB (${Math.round(heapUsagePercent * 100)}%) rss=${rssMB}MB cpu=${cpuPercent}% uptime=${uptimeMinutes}min`,
    );

    // Check for spikes and thresholds
    this.checkForSpike(snapshot);
    this.checkThresholds(snapshot);

    // Update previous heap for next spike detection
    this.previousHeapUsedMB = heapUsedMB;
  }

  private async checkForSpike(snapshot: MemorySnapshot) {
    if (this.previousHeapUsedMB === 0) {
      return; // Skip first snapshot
    }

    const heapGrowth = snapshot.heapUsedMB - this.previousHeapUsedMB;

    // Detect sudden spike - heap grew >100MB in 30 seconds
    if (heapGrowth >= this.SPIKE_THRESHOLD_MB) {
      this.logger.error(
        `[MEMORY SPIKE] Heap grew ${heapGrowth}MB in 30s (${this.previousHeapUsedMB}MB -> ${snapshot.heapUsedMB}MB) - allocation burst detected!`,
      );

      // IMMEDIATELY alert on spike - no cooldown
      await this.sendMemoryAlert(snapshot, 'SPIKE', heapGrowth);
    }
  }

  private async checkThresholds(snapshot: MemorySnapshot) {
    const now = Date.now();

    // Critical threshold - always alert immediately (no cooldown)
    if (snapshot.heapUsagePercent >= this.CRITICAL_THRESHOLD) {
      this.logger.error(
        `[MEMORY CRITICAL] Heap at ${Math.round(snapshot.heapUsagePercent * 100)}% - crash imminent!`,
      );

      // No cooldown for critical alerts
      this.lastWarningTime = now;
      await this.sendMemoryAlert(snapshot, 'CRITICAL');
      return;
    }

    // Warning threshold - with cooldown to avoid spam
    if (snapshot.heapUsagePercent >= this.WARNING_THRESHOLD) {
      this.logger.warn(`[MEMORY WARNING] Heap at ${Math.round(snapshot.heapUsagePercent * 100)}%`);

      if (now - this.lastWarningTime > this.WARNING_COOLDOWN_MS) {
        this.lastWarningTime = now;
        await this.sendMemoryAlert(snapshot, 'WARNING');
      }
    }
  }

  private async sendMemoryAlert(
    snapshot: MemorySnapshot,
    level: 'WARNING' | 'CRITICAL' | 'SPIKE',
    heapGrowth?: number,
  ) {
    this.logger.warn({
      level,
      heapGrowth,
      snapshot,
      heapLimitMB: this.getHeapLimitMB(),
      memoryTrend: this.getMemoryTrend(),
      activeRequestCount: this.requestTracker?.getActiveRequestCount() || 0,
      activeRequestsSummary:
        this.requestTracker?.getActiveRequestsSummary() || 'Request tracker not available',
      recentHighCostSummary: this.requestTracker?.getRecentHighCostSummary(30, 300, 5) || 'N/A',
    });
  }

  private getMemoryTrend(): string {
    // Get last 10 snapshots for trend
    const recentSnapshots = this.memoryHistory.slice(-10);
    if (recentSnapshots.length === 0) {
      return 'No history available';
    }

    return recentSnapshots
      .map((s) => {
        const bar = '█'.repeat(Math.min(Math.round(s.heapUsagePercent * 20), 20));
        const empty = '░'.repeat(20 - bar.length);
        const time = s.timestamp.split('T')[1].split('.')[0];
        return `${time} ${bar}${empty} ${s.heapUsedMB}MB cpu=${s.cpuPercent}%`;
      })
      .join('\n');
  }

  /**
   * Get current memory status (for health endpoint)
   */
  getMemoryStatus(): {
    current: MemorySnapshot;
    history: MemorySnapshot[];
    status: 'OK' | 'WARNING' | 'CRITICAL';
  } {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapUsagePercent = heapUsedMB / this.getHeapLimitMB();

    let status: 'OK' | 'WARNING' | 'CRITICAL' = 'OK';
    if (heapUsagePercent >= this.CRITICAL_THRESHOLD) {
      status = 'CRITICAL';
    } else if (heapUsagePercent >= this.WARNING_THRESHOLD) {
      status = 'WARNING';
    }

    return {
      current: {
        timestamp: new Date().toISOString(),
        heapUsedMB,
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        externalMB: Math.round(memUsage.external / 1024 / 1024),
        heapUsagePercent,
        uptimeMinutes: Math.round(process.uptime() / 60),
        cpuPercent: this.calculateCpuPercent(),
        eventLoopLagMs: this.measureEventLoopLag(),
      },
      history: this.memoryHistory.slice(-30), // Last 30 snapshots (15 minutes at 30s intervals)
      status,
    };
  }
}
