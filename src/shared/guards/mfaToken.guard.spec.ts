import { mock } from 'vitest-mock-extended';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { MfaTokenGuard } from './mfaToken.guard';
import { RedisService } from '@shared/redis/redis.service';

function makeCtx(body: Record<string, any>): { ctx: ExecutionContext; req: any } {
  const req: any = { body };
  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue({ getRequest: () => req } as any);
  return { ctx, req };
}

describe('MfaTokenGuard', () => {
  let guard: MfaTokenGuard;
  let redisService: ReturnType<typeof mock<RedisService>>;

  beforeEach(() => {
    redisService = mock<RedisService>();
    guard = new MfaTokenGuard(redisService);
  });

  it('should throw UnauthorizedException if no mfaToken in body', async () => {
    const { ctx } = makeCtx({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token not in Redis (expired/invalid)', async () => {
    redisService.getJson.mockResolvedValue(null);
    const { ctx } = makeCtx({ mfaToken: 'bad-token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should set req.mfaStaffId and return true on valid token', async () => {
    redisService.getJson.mockResolvedValue({ staffId: 'staff-123' });
    const { ctx, req } = makeCtx({ mfaToken: 'valid-token' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(req.mfaStaffId).toBe('staff-123');
  });
});
