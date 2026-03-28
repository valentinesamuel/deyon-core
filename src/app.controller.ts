import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@shared/decorators/isPublic.decorator';
import { SkipAbortCheck } from '@shared/decorators/skipAbortCheck.decorator';
import { RedisHealthIndicator } from '@shared/observability/redis.health';

const HEAP_THRESHOLD_BYTES = 500 * 1024 * 1024; // 500 MB

@Controller('health')
export class AppController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get('/')
  @Public()
  @SkipAbortCheck()
  @HealthCheck()
  @ApiOperation({ operationId: 'checkHealth', summary: 'Check health of the service' })
  @ApiResponse({ status: 200, description: 'Service is healthy.' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy.' })
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
      () => this.memory.checkHeap('memory', HEAP_THRESHOLD_BYTES),
    ]);
  }
}
