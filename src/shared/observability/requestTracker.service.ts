import { Injectable, Logger } from '@nestjs/common';

export interface RequestMetrics {
  requestId: string;
  path: string;
  method: string;
  startTime: number;
  startHeapUsedMB: number;
  startCpuUser: number;
  startCpuSystem: number;

  // User context (from RequestContext)
  userId?: string;
  userEmail?: string;
  role?: string;
  userType?: string; // INTERNAL | EXTERNAL
  applicationType?: string;
  profileType?: string; // ADMINISTRATOR | POC | BDR | DRIVER | etc.
}

export interface CompletedRequestMetrics extends RequestMetrics {
  durationMs: number;
  memoryDeltaMB: number; // Memory consumed by this request
  cpuDeltaMs: number; // CPU time consumed by this request
  statusCode: number;
}

@Injectable()
export class RequestTrackerService {
  private readonly logger = new Logger(RequestTrackerService.name);
  private readonly activeRequests = new Map<string, RequestMetrics>();
  private readonly recentCompletedRequests: CompletedRequestMetrics[] = [];
  private readonly MAX_COMPLETED_HISTORY = 100; // Keep last 100 completed requests

  // Cooldown for high-cost request alerts to avoid spamming Slack
  private readonly HIGH_COST_ALERT_COOLDOWN_MS = 60000; // 1 minute between alerts
  private lastHighCostAlertTime = 0;

  // Thresholds for high-cost request detection
  private readonly HIGH_COST_MEMORY_THRESHOLD_MB = 50;
  private readonly HIGH_COST_CPU_THRESHOLD_MS = 500;

  startRequest(metrics: RequestMetrics): void {
    this.activeRequests.set(metrics.requestId, metrics);
  }

  endRequest(requestId: string, statusCode: number): CompletedRequestMetrics | null {
    const startMetrics = this.activeRequests.get(requestId);
    if (!startMetrics) return null;

    this.activeRequests.delete(requestId);

    const now = Date.now();
    const currentMemory = process.memoryUsage();
    const currentCpu = process.cpuUsage();
    const endHeapUsedMB = currentMemory.heapUsed / 1024 / 1024;

    const completed: CompletedRequestMetrics = {
      ...startMetrics,
      durationMs: now - startMetrics.startTime,
      memoryDeltaMB: Math.round((endHeapUsedMB - startMetrics.startHeapUsedMB) * 100) / 100,
      cpuDeltaMs: Math.round(
        (currentCpu.user -
          startMetrics.startCpuUser +
          currentCpu.system -
          startMetrics.startCpuSystem) /
          1000,
      ),
      statusCode,
    };

    // Store in recent history (bounded)
    this.recentCompletedRequests.push(completed);
    if (this.recentCompletedRequests.length > this.MAX_COMPLETED_HISTORY) {
      this.recentCompletedRequests.shift();
    }

    // Log and alert on high-cost requests
    if (
      completed.memoryDeltaMB > this.HIGH_COST_MEMORY_THRESHOLD_MB ||
      completed.cpuDeltaMs > this.HIGH_COST_CPU_THRESHOLD_MS
    ) {
      this.logger.warn(
        `[HIGH COST REQUEST] ${completed.method} ${completed.path} ` +
          `| User: ${completed.userId || 'anonymous'} (${completed.role || 'N/A'}) ` +
          `| App: ${completed.applicationType || 'N/A'} ` +
          `| Memory: +${completed.memoryDeltaMB}MB | CPU: ${completed.cpuDeltaMs}ms ` +
          `| Duration: ${completed.durationMs}ms`,
      );

      // Send Slack alert with cooldown to avoid spamming
      this.sendHighCostAlertWithCooldown(completed);
    }

    return completed;
  }

  private sendHighCostAlertWithCooldown(completed: CompletedRequestMetrics): void {
    const now = Date.now();
    if (now - this.lastHighCostAlertTime < this.HIGH_COST_ALERT_COOLDOWN_MS) {
      return; // Skip - within cooldown period
    }

    this.lastHighCostAlertTime = now;

    // Fire and forget - don't await to avoid blocking the request
    this.logger.warn({
      requestId: completed.requestId,
      method: completed.method,
      path: completed.path,
      durationMs: completed.durationMs,
      memoryDeltaMB: completed.memoryDeltaMB,
      cpuDeltaMs: completed.cpuDeltaMs,
      statusCode: completed.statusCode,
      userId: completed.userId,
      userEmail: completed.userEmail,
      role: completed.role,
      userType: completed.userType,
      applicationType: completed.applicationType,
      profileType: completed.profileType,
    });
  }

  getActiveRequests(): Array<RequestMetrics & { durationMs: number }> {
    const now = Date.now();
    return Array.from(this.activeRequests.values()).map((r) => ({
      ...r,
      durationMs: now - r.startTime,
    }));
  }

  getRecentHighCostRequests(minMemoryMB = 20, minCpuMs = 200): CompletedRequestMetrics[] {
    return this.recentCompletedRequests.filter(
      (r) => r.memoryDeltaMB > minMemoryMB || r.cpuDeltaMs > minCpuMs,
    );
  }

  // For memory spike alerts - get formatted active request summary
  getActiveRequestsSummary(): string {
    const active = this.getActiveRequests();
    if (active.length === 0) return 'No active requests';

    return [...active]
      .sort((a, b) => b.durationMs - a.durationMs) // Longest running first
      .slice(0, 10) // Top 10
      .map(
        (r) =>
          `  - ${r.method} ${r.path} (${r.durationMs}ms) ` +
          `| User: ${r.userId || 'anon'} | Role: ${r.role || 'N/A'} | App: ${r.applicationType || 'N/A'}`,
      )
      .join('\n');
  }

  // Get count of active requests
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  // Get recent high cost requests formatted for alerts
  getRecentHighCostSummary(minMemoryMB = 30, minCpuMs = 300, limit = 5): string {
    const highCost = this.getRecentHighCostRequests(minMemoryMB, minCpuMs);
    if (highCost.length === 0) return 'None';

    return highCost
      .slice(-limit) // Most recent
      .map(
        (r) =>
          `${r.method} ${r.path} | +${r.memoryDeltaMB}MB | ${r.cpuDeltaMs}ms CPU | User: ${r.userId || 'anon'}`,
      )
      .join('\n');
  }
}
