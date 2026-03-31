import { Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { RedisProvider } from '@adapters/cache/providers/redis.provider';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly redis: RedisProvider,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      await this.redis.ping();
      return indicator.up();
    } catch (error) {
      console.error(error);
      return indicator.down({ message: 'Redis check failed' });
    }
  }
}
