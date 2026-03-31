import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import * as v8 from 'node:v8';
import { ConfigService } from '@nestjs/config';

function getHeapLimitMB(): number {
  const heapStats = v8.getHeapStatistics();
  return heapStats.heap_size_limit / 1024 / 1024;
}

@Injectable()
export class MemoryGuard implements CanActivate {
  private readonly logger = new Logger(MemoryGuard.name);
  private lastCheck = 0;
  private lastHeapUsedMB = 0;
  private readonly heapLimitMB: number = 0;
  private readonly thresholdMB: number = 0;
  private readonly MEMORY_THRESHOLD_PERCENT = 0.75;
  private readonly INTER_SERVICE_PASS: string;

  constructor(private readonly configService: ConfigService) {
    this.heapLimitMB = getHeapLimitMB();
    this.thresholdMB = this.heapLimitMB * this.MEMORY_THRESHOLD_PERCENT;
    this.INTER_SERVICE_PASS = this.configService.get<string>('common.auth.serviceAccessName')!;

    this.logger.log(
      `MemoryGuard initialized: heap limit=${this.heapLimitMB.toFixed(0)}MB, threshold=${this.thresholdMB.toFixed(0)}MB (${this.MEMORY_THRESHOLD_PERCENT * 100}%)`,
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Bypass 1: Allow specific paths
    const path = request.url?.split('?')[0]; // Remove query params
    if (path && ['/health'].some((bypassPath) => path.startsWith(bypassPath))) {
      return true;
    }

    if (request.headers[this.INTER_SERVICE_PASS] == 'true') {
      return true;
    }

    // Memory check with rate limiting
    const now = Date.now();
    if (now - this.lastCheck > 1000) {
      this.lastHeapUsedMB = process.memoryUsage().heapUsed / 1024 / 1024;
      this.lastCheck = now;
    }

    if (this.lastHeapUsedMB > this.thresholdMB) {
      const endpoint = `${request.method} ${path}`;
      this.logger.warn(
        `[MemoryGuard] Rejecting ${endpoint} - memory: ${this.lastHeapUsedMB.toFixed(0)}MB > ${this.thresholdMB.toFixed(0)}MB threshold (${this.MEMORY_THRESHOLD_PERCENT * 100}% of ${this.heapLimitMB.toFixed(0)}MB limit)`,
      );
      throw new ServiceUnavailableException(`Please retry shortly.`);
    }

    return true;
  }
}
