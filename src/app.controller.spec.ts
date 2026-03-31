import { mock } from 'vitest-mock-extended';
import { AppController } from './app.controller';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from '@shared/observability/redis.health';

describe('AppController', () => {
  let controller: AppController;
  const mockHealthService = mock<HealthCheckService>();
  const mockDb = mock<TypeOrmHealthIndicator>();
  const mockMemory = mock<MemoryHealthIndicator>();
  const mockRedis = mock<RedisHealthIndicator>();

  beforeEach(() => {
    controller = new AppController(mockHealthService, mockDb, mockMemory, mockRedis);
  });

  it('should call health.check with three indicator functions', () => {
    mockHealthService.check.mockResolvedValue({ status: 'ok', info: {}, error: {}, details: {} });

    controller.check();

    expect(mockHealthService.check).toHaveBeenCalledWith([
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    ]);
  });

  it('should invoke db.pingCheck, redis.isHealthy, and memory.checkHeap when health check runs', async () => {
    mockDb.pingCheck.mockResolvedValue({ database: { status: 'up' } });
    mockRedis.isHealthy.mockResolvedValue({ redis: { status: 'up' } });
    mockMemory.checkHeap.mockResolvedValue({ memory: { status: 'up' } });
    mockHealthService.check.mockImplementation(async (checks) => {
      for (const check of checks) await check();
      return { status: 'ok', info: {}, error: {}, details: {} } as any;
    });

    await controller.check();

    expect(mockDb.pingCheck).toHaveBeenCalledWith('database');
    expect(mockRedis.isHealthy).toHaveBeenCalledWith('redis');
    expect(mockMemory.checkHeap).toHaveBeenCalledWith('memory', 500 * 1024 * 1024);
  });
});
