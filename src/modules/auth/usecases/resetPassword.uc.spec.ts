import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { ResetPasswordUsecase } from './resetPassword.uc';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RequestContextService } from '@shared/context/requestContext.service';

const AUTH = { db: CacheDbType.AUTH };

describe('ResetPasswordUsecase', () => {
  let usecase: ResetPasswordUsecase;
  let authService: ReturnType<typeof mock<AuthService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  beforeEach(() => {
    authService = mock<AuthService>();
    sessionService = mock<SessionService>();
    tokenService = mock<TokenService>();
    eventLogService = mock<EventLogService>();
    staffRepo = mock<StaffRepository>();
    cacheAdapter = mock<CacheAdapter>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new ResetPasswordUsecase(
      authService,
      sessionService,
      tokenService,
      eventLogService,
      staffRepo,
      cacheAdapter,
      requestContextService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.sha256.mockReturnValue('token-hash');
    sessionService.revokeAllSessions.mockResolvedValue(undefined);
    cacheAdapter.del.mockResolvedValue(undefined);
  });

  it('should reset password and revoke all sessions', async () => {
    cacheAdapter.get.mockResolvedValue({ staffId: 'staff-1' });
    authService.hashPassword.mockResolvedValue('new-hash');
    staffRepo.update.mockResolvedValue(undefined as any);

    const result = await usecase.execute(em, {
      token: 'plain-token',
      newPassword: 'NewPass1!',
    });

    expect(result).toEqual({ message: 'Password reset successfully. Please log in again.' });
    expect(authService.hashPassword).toHaveBeenCalledWith('NewPass1!');
    expect(staffRepo.update).toHaveBeenCalled();
    expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('staff-1');
    expect(cacheAdapter.del).toHaveBeenCalledWith(expect.any(String), AUTH);
  });

  it('should throw UnauthorizedException if token is invalid or expired', async () => {
    cacheAdapter.get.mockResolvedValue(null);

    await expect(
      usecase.execute(em, {
        token: 'bad-token',
        newPassword: 'NewPass1!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
