import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { ResetPasswordUsecase } from './resetPassword.uc';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RedisService } from '@shared/redis/redis.service';

describe('ResetPasswordUsecase', () => {
  let usecase: ResetPasswordUsecase;
  let authService: ReturnType<typeof mock<AuthService>>;
  let sessionService: ReturnType<typeof mock<SessionService>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let redisService: ReturnType<typeof mock<RedisService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  beforeEach(() => {
    authService = mock<AuthService>();
    sessionService = mock<SessionService>();
    tokenService = mock<TokenService>();
    eventLogService = mock<EventLogService>();
    staffRepo = mock<StaffRepository>();
    redisService = mock<RedisService>();
    em = mock<EntityManager>();

    usecase = new ResetPasswordUsecase(
      authService,
      sessionService,
      tokenService,
      eventLogService,
      staffRepo,
      redisService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.sha256.mockReturnValue('token-hash');
    sessionService.revokeAllSessions.mockResolvedValue(undefined);
    redisService.del.mockResolvedValue(undefined);
  });

  it('should reset password and revoke all sessions', async () => {
    redisService.getJson.mockResolvedValue({ staffId: 'staff-1' });
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
    expect(redisService.del).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if token is invalid or expired', async () => {
    redisService.getJson.mockResolvedValue(null);

    await expect(
      usecase.execute(em, {
        token: 'bad-token',
        newPassword: 'NewPass1!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
