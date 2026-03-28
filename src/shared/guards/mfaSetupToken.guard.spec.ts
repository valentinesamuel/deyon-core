import { mock } from 'vitest-mock-extended';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { MfaSetupTokenGuard } from './mfaSetupToken.guard';
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

describe('MfaSetupTokenGuard', () => {
  let guard: MfaSetupTokenGuard;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;

  beforeEach(() => {
    cacheAdapter = mock<CacheAdapter>();
    requestContextService = mock<RequestContextService>();
    guard = new MfaSetupTokenGuard(cacheAdapter, requestContextService);
  });

  it('should throw UnauthorizedException if no setupToken in body', async () => {
    const { ctx } = makeCtx({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token not in cache (expired/invalid)', async () => {
    cacheAdapter.get.mockResolvedValue(null);
    const { ctx } = makeCtx({ setupToken: 'bad-token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(cacheAdapter.get).toHaveBeenCalledWith(expect.any(String), AUTH);
  });

  it('should call setUserId on context service and return true on valid token', async () => {
    cacheAdapter.get.mockResolvedValue({ staffId: 'staff-456' });
    const { ctx } = makeCtx({ setupToken: 'valid-setup-token' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(requestContextService.setUserId).toHaveBeenCalledWith('staff-456');
  });
});
