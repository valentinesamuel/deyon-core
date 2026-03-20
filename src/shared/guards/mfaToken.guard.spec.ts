import { mock } from 'vitest-mock-extended';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { MfaTokenGuard } from './mfaToken.guard';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';

const AUTH = { db: CacheDbType.AUTH };

function makeCtx(body: Record<string, any>): { ctx: ExecutionContext; req: any } {
  const req: any = { body };
  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue({ getRequest: () => req } as any);
  return { ctx, req };
}

describe('MfaTokenGuard', () => {
  let guard: MfaTokenGuard;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;

  beforeEach(() => {
    cacheAdapter = mock<CacheAdapter>();
    requestContextService = mock<RequestContextService>();
    guard = new MfaTokenGuard(cacheAdapter, requestContextService);
  });

  it('should throw UnauthorizedException if no mfaToken in body', async () => {
    const { ctx } = makeCtx({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token not in cache (expired/invalid)', async () => {
    cacheAdapter.get.mockResolvedValue(null);
    const { ctx } = makeCtx({ mfaToken: 'bad-token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(cacheAdapter.get).toHaveBeenCalledWith(expect.any(String), AUTH);
  });

  it('should call setUserId on context service and return true on valid token', async () => {
    cacheAdapter.get.mockResolvedValue({ staffId: 'staff-123' });
    const { ctx } = makeCtx({ mfaToken: 'valid-token' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(requestContextService.setUserId).toHaveBeenCalledWith('staff-123');
  });
});
