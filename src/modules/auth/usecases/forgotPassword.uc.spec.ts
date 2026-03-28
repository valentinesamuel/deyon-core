import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ForgotPasswordUsecase } from './forgotPassword.uc';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { TokenService } from '../services/token.service';
import { EventLogService } from '../services/eventLog.service';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { IEmailProvider } from '@adapters/email/email.interface';
import { RequestContextService } from '@shared/context/requestContext.service';

describe('ForgotPasswordUsecase', () => {
  let usecase: ForgotPasswordUsecase;
  let staffRepo: ReturnType<typeof mock<StaffRepository>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let cacheAdapter: ReturnType<typeof mock<CacheAdapter>>;
  let emailProvider: ReturnType<typeof mock<IEmailProvider>>;
  let configService: ReturnType<typeof mock<ConfigService>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const SAME_RESPONSE = { message: 'If this email is registered, a reset link has been sent.' };

  beforeEach(() => {
    staffRepo = mock<StaffRepository>();
    tokenService = mock<TokenService>();
    eventLogService = mock<EventLogService>();
    cacheAdapter = mock<CacheAdapter>();
    emailProvider = mock<IEmailProvider>();
    configService = mock<ConfigService>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    requestContextService.getIp.mockReturnValue('127.0.0.1');
    requestContextService.getUserAgent.mockReturnValue('test-agent');

    usecase = new ForgotPasswordUsecase(
      staffRepo,
      tokenService,
      eventLogService,
      cacheAdapter,
      emailProvider,
      configService,
      requestContextService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    tokenService.generateOpaqueToken.mockReturnValue('plain-reset-token');
    tokenService.sha256.mockReturnValue('reset-hash');
    configService.get.mockReturnValue('http://frontend.test');
    emailProvider.sendPasswordResetEmail.mockResolvedValue(undefined);
    cacheAdapter.set.mockResolvedValue(undefined);
  });

  it('should always return same response (no email enumeration)', async () => {
    cacheAdapter.incr.mockResolvedValue(1);
    cacheAdapter.expire.mockResolvedValue(undefined);
    staffRepo.findOne.mockResolvedValue(null);

    const result = await usecase.execute(em, { email: 'nobody@example.com' });
    expect(result).toEqual(SAME_RESPONSE);
  });

  it('should send reset email if staff found', async () => {
    cacheAdapter.incr.mockResolvedValue(1);
    cacheAdapter.expire.mockResolvedValue(undefined);
    staffRepo.findOne.mockResolvedValue({ id: 'staff-1', email: 'user@example.com' } as any);

    const result = await usecase.execute(em, { email: 'user@example.com' });

    expect(result).toEqual(SAME_RESPONSE);
    expect(emailProvider.sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
    expect(cacheAdapter.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ staffId: 'staff-1' }),
      expect.objectContaining({ db: CacheDbType.AUTH }),
    );
  });

  it('should silently rate-limit without enumeration', async () => {
    cacheAdapter.incr.mockResolvedValue(2);

    const result = await usecase.execute(em, { email: 'user@example.com' });

    expect(result).toEqual(SAME_RESPONSE);
    expect(emailProvider.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(staffRepo.findOne).not.toHaveBeenCalled();
  });

  it('should not throw if email sending fails', async () => {
    cacheAdapter.incr.mockResolvedValue(1);
    cacheAdapter.expire.mockResolvedValue(undefined);
    staffRepo.findOne.mockResolvedValue({ id: 'staff-1', email: 'user@example.com' } as any);
    emailProvider.sendPasswordResetEmail.mockRejectedValue(new Error('SMTP error'));

    await expect(usecase.execute(em, { email: 'user@example.com' })).resolves.toEqual(
      SAME_RESPONSE,
    );
  });
});
