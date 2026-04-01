import { mock } from 'vitest-mock-extended';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwtAuth.guard';
import { TokenService } from '@modules/auth/services/token.service';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { PersonalAccessTokenRepository } from '@adapters/repositories/personalAccessToken.repository';

const AUTH = { db: CacheDbType.AUTH };

function makeContext(cookies: Record<string, string> = {}): {
  ctx: ExecutionContext;
  request: any;
} {
  const request: any = { cookies, user: undefined };
  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue({ getRequest: () => request } as any);
  ctx.getHandler.mockReturnValue(() => {});
  ctx.getClass.mockReturnValue(class {});
  return { ctx, request };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: ReturnType<typeof mock<Reflector>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let patRepo: ReturnType<typeof mock<PersonalAccessTokenRepository>>;

  const mockPayload = { sub: 'staff-uuid', jti: 'jti-1', role: 'admin' };

  beforeEach(() => {
    reflector = mock<Reflector>();
    tokenService = mock<TokenService>();
    cacheAdapter = mock<CacheAdapter>();
    requestContextService = mock<RequestContextService>();
    staffRepo = mock<StaffRepository>();
    patRepo = mock<PersonalAccessTokenRepository>();

    guard = new JwtAuthGuard(
      reflector,
      tokenService,
      cacheAdapter,
      requestContextService,
      staffRepo,
      patRepo,
    );

    requestContextService.setUser.mockReturnValue(undefined);
  });

  it('should return true for @Public() routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { ctx } = makeContext();
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('should throw if no access_token cookie', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = makeContext({});
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if token is invalid', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(null);
    const { ctx } = makeContext({ access_token: 'bad-token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if JTI is blocklisted', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(mockPayload as any);
    cacheAdapter.exists.mockResolvedValue(true); // blocklisted
    const { ctx } = makeContext({ access_token: 'valid' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(cacheAdapter.exists).toHaveBeenCalledWith(expect.any(String), AUTH);
  });

  it('should return true using cached profile', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(mockPayload as any);
    cacheAdapter.exists.mockResolvedValue(false);
    cacheAdapter.get.mockResolvedValue({
      id: 'staff-uuid',
      email: 'test@test.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      isApproved: true,
      role: {
        id: 'role-uuid',
        name: 'Admin',
        isActive: true,
        alias: 'admin',
        isSystemRole: false,
        permissions: [],
      },
    });

    const { ctx, request } = makeContext({ access_token: 'valid' });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.user).toBeDefined();
    expect(staffRepo.findOne).not.toHaveBeenCalled();
    expect(cacheAdapter.get).toHaveBeenCalledWith(expect.any(String), AUTH);
  });

  it('should load from DB on cache miss and cache result', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(mockPayload as any);
    cacheAdapter.exists.mockResolvedValue(false);
    cacheAdapter.get.mockResolvedValue(null); // cache miss
    cacheAdapter.set.mockResolvedValue(undefined);
    staffRepo.findOne.mockResolvedValue({
      id: 'staff-uuid',
      email: 'test@test.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      isApproved: true,
      role: {
        id: 'role-uuid',
        name: 'Admin',
        isActive: true,
        alias: 'admin',
        isSystemRole: false,
        permissions: [],
      },
    } as any);

    const { ctx } = makeContext({ access_token: 'valid' });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(staffRepo.findOne).toHaveBeenCalled();
    expect(cacheAdapter.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ db: CacheDbType.AUTH }),
    );
  });

  it('should throw if staff not found in DB', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(mockPayload as any);
    cacheAdapter.exists.mockResolvedValue(false);
    cacheAdapter.get.mockResolvedValue(null);
    staffRepo.findOne.mockResolvedValue(null);

    const { ctx } = makeContext({ access_token: 'valid' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if staff is inactive', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(mockPayload as any);
    cacheAdapter.exists.mockResolvedValue(false);
    cacheAdapter.get.mockResolvedValue({
      id: 'staff-uuid',
      email: 'test@test.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: false,
      isApproved: true,
      role: null,
    });

    const { ctx } = makeContext({ access_token: 'valid' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
