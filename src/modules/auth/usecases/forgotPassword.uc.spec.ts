import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordUsecase } from './forgotPassword.uc';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { RedisService } from '@shared/redis/redis.service';
import { IEmailProvider } from '@adapters/email/email.interface';

describe('ForgotPasswordUsecase', () => {
  let usecase: ForgotPasswordUsecase;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let redisService: ReturnType<typeof mock<RedisService>>;
  let emailProvider: ReturnType<typeof mock<IEmailProvider>>;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const SAME_RESPONSE = { message: 'If this email is registered, a reset link has been sent.' };

  beforeEach(() => {
    staffRepo = mock<StaffRepository>();
    tokenService = mock<TokenService>();
    eventLogService = mock<EventLogService>();
    redisService = mock<RedisService>();
    emailProvider = mock<IEmailProvider>();
    configService = mock<ConfigService>();
    em = mock<EntityManager>();

    usecase = new ForgotPasswordUsecase(
      staffRepo,
      tokenService,
      eventLogService,
      redisService,
      emailProvider,
      configService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.generateOpaqueToken.mockReturnValue('plain-reset-token');
    tokenService.sha256.mockReturnValue('reset-hash');
    configService.get.mockReturnValue('http://frontend.test');
    emailProvider.sendPasswordResetEmail.mockResolvedValue(undefined);
    redisService.setJson.mockResolvedValue(undefined);
  });

  it('should always return same response (no email enumeration)', async () => {
    redisService.incr.mockResolvedValue(1);
    redisService.expire.mockResolvedValue(undefined);
    staffRepo.findOne.mockResolvedValue(null); // staff not found

    const result = await usecase.execute(em, { email: 'nobody@example.com' });
    expect(result).toEqual(SAME_RESPONSE);
  });

  it('should send reset email if staff found', async () => {
    redisService.incr.mockResolvedValue(1);
    redisService.expire.mockResolvedValue(undefined);
    staffRepo.findOne.mockResolvedValue({ id: 'staff-1', email: 'user@example.com' } as any);

    const result = await usecase.execute(em, { email: 'user@example.com' });

    expect(result).toEqual(SAME_RESPONSE);
    expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
    expect(redisService.setJson).toHaveBeenCalled();
  });

  it('should silently rate-limit without enumeration', async () => {
    redisService.incr.mockResolvedValue(2); // over rate limit

    const result = await usecase.execute(em, { email: 'user@example.com' });

    expect(result).toEqual(SAME_RESPONSE);
    expect(emailProvider.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(staffRepo.findOne).not.toHaveBeenCalled();
  });

  it('should not throw if email sending fails', async () => {
    redisService.incr.mockResolvedValue(1);
    redisService.expire.mockResolvedValue(undefined);
    staffRepo.findOne.mockResolvedValue({ id: 'staff-1', email: 'user@example.com' } as any);
    emailProvider.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP error'));

    await expect(usecase.execute(em, { email: 'user@example.com' })).resolves.toEqual(
      SAME_RESPONSE,
    );
  });
});
