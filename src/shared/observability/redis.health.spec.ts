import { mock } from 'vitest-mock-extended';
import { RedisHealthIndicator } from './redis.health';
import { HealthIndicatorService } from '@nestjs/terminus';
import { RedisProvider } from '@adapters/cache/providers/redis.provider';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  const mockHealthIndicatorService = mock<HealthIndicatorService>();
  const mockRedisProvider = mock<RedisProvider>();

  beforeEach(() => {
    indicator = new RedisHealthIndicator(mockHealthIndicatorService, mockRedisProvider);
  });

  it('should return up status when Redis ping succeeds', async () => {
    const upResult = { redis: { status: 'up' } };
    const mockUnit = { up: vi.fn().mockReturnValue(upResult), down: vi.fn() };
    mockHealthIndicatorService.check.mockReturnValue(mockUnit as any);
    mockRedisProvider.ping.mockResolvedValue(undefined as any);

    const result = await indicator.isHealthy('redis');

    expect(mockRedisProvider.ping).toHaveBeenCalled();
    expect(mockUnit.up).toHaveBeenCalled();
    expect(result).toEqual(upResult);
  });

  it('should return down status when Redis ping fails', async () => {
    const downResult = { redis: { status: 'down' } };
    const mockUnit = { up: vi.fn(), down: vi.fn().mockReturnValue(downResult) };
    mockHealthIndicatorService.check.mockReturnValue(mockUnit as any);
    mockRedisProvider.ping.mockRejectedValue(new Error('Connection refused'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await indicator.isHealthy('redis');

    expect(mockUnit.down).toHaveBeenCalledWith({ message: 'Redis check failed' });
    expect(result).toEqual(downResult);
  });
});
