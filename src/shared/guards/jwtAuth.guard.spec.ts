import { mock } from 'vitest-mock-extended';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwtAuth.guard';
import { TokenService } from '@modules/auth/services/token.service';
import { RedisService } from '@shared/redis/redis.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';

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
  let redisService: ReturnType<typeof mock<RedisService>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;

  const mockPayload = { sub: 'staff-uuid', jti: 'jti-1', role: 'admin' };

  beforeEach(() => {
    reflector = mock<Reflector>();
    tokenService = mock<TokenService>();
    redisService = mock<RedisService>();
    requestContextService = mock<RequestContextService>();
    staffRepo = mock<StaffRepository>();

    guard = new JwtAuthGuard(
      reflector,
      tokenService,
      redisService,
      requestContextService,
      staffRepo,
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
    redisService.exists.mockResolvedValue(true); // blocklisted
    const { ctx } = makeContext({ access_token: 'valid' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should return true using Redis-cached profile', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(mockPayload as any);
    redisService.exists.mockResolvedValue(false);
    redisService.getJson.mockResolvedValue({
      id: 'staff-uuid',
      email: 'test@test.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      isApproved: true,
      role: null,
    });

    const { ctx, request } = makeContext({ access_token: 'valid' });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.user).toBeDefined();
    expect(staffRepo.findOne).not.toHaveBeenCalled();
  });

  it('should load from DB on cache miss and cache result', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(mockPayload as any);
    redisService.exists.mockResolvedValue(false);
    redisService.getJson.mockResolvedValue(null); // cache miss
    redisService.setJson.mockResolvedValue(undefined);
    staffRepo.findOne.mockResolvedValue({
      id: 'staff-uuid',
      email: 'test@test.com',
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      isApproved: true,
      role: null,
    } as any);

    const { ctx } = makeContext({ access_token: 'valid' });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(staffRepo.findOne).toHaveBeenCalled();
    expect(redisService.setJson).toHaveBeenCalled();
  });

  it('should throw if staff not found in DB', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(mockPayload as any);
    redisService.exists.mockResolvedValue(false);
    redisService.getJson.mockResolvedValue(null);
    staffRepo.findOne.mockResolvedValue(null);

    const { ctx } = makeContext({ access_token: 'valid' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw if staff is inactive', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockReturnValue(mockPayload as any);
    redisService.exists.mockResolvedValue(false);
    redisService.getJson.mockResolvedValue({
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
