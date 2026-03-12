import { mock } from 'vitest-mock-extended';
import { EntityManager } from 'typeorm';
import {
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BootstrapSystemUsecase } from './bootstrapSystem.uc';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { SystemConfigRepository } from '@adapters/repositories/systemConfig.repository';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { MfaService } from '@modules/auth/services/mfa.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RedisService } from '@shared/redis/redis.service';
import { SystemConfig } from '@modules/core/entities/systemConfig.entity';

describe('BootstrapSystemUsecase', () => {
  let usecase: BootstrapSystemUsecase;
  let mfaConfigRepo: ReturnType<typeof mock<MfaConfigRepository>>;
  let systemConfigRepo: ReturnType<typeof mock<SystemConfigRepository>>;
  let roleRepo: ReturnType<typeof mock<RoleRepository>>;
  let mfaService: ReturnType<typeof mock<MfaService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let redisService: ReturnType<typeof mock<RedisService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const params = {
    staffId: 'cmo-staff-1',
    totpCode: '123456',
  };

  const superAdminRole = { id: 'role-sa', alias: 'super_admin' };

  beforeEach(() => {
    mfaConfigRepo = mock<MfaConfigRepository>();
    systemConfigRepo = mock<SystemConfigRepository>();
    roleRepo = mock<RoleRepository>();
    mfaService = mock<MfaService>();
    eventLogService = mock<EventLogService>();
    redisService = mock<RedisService>();
    em = mock<EntityManager>();

    usecase = new BootstrapSystemUsecase(
      mfaConfigRepo,
      systemConfigRepo,
      roleRepo,
      mfaService,
      eventLogService,
      redisService,
    );

    eventLogService.log.mockResolvedValue(undefined);
    redisService.del.mockResolvedValue(undefined);
    em.update.mockResolvedValue(undefined as any);
  });

  it('should complete bootstrap and return { success: true, roleAssigned: "super_admin" }', async () => {
    em.findOne.mockImplementation((entity: any, _options: any) => {
      if (entity === SystemConfig)
        return Promise.resolve({ key: 'setup_complete', value: { completed: false } });
      return Promise.resolve(null);
    });
    mfaConfigRepo.findByStaffId.mockResolvedValue({ encryptedSecret: 'enc' } as any);
    mfaService.verifyTotp.mockResolvedValue(true);
    roleRepo.findOne.mockResolvedValue(superAdminRole as any);

    const result = await usecase.execute(em, params);

    expect(result).toEqual({ success: true, roleAssigned: 'super_admin' });
    expect(em.update).toHaveBeenCalledTimes(2); // staff role + system config
  });

  it('should throw ConflictException if setup already complete', async () => {
    em.findOne.mockResolvedValue({ key: 'setup_complete', value: { completed: true } });

    await expect(usecase.execute(em, params)).rejects.toThrow(ConflictException);
  });

  it('should throw UnauthorizedException if MFA not configured', async () => {
    em.findOne.mockResolvedValue({ key: 'setup_complete', value: { completed: false } });
    mfaConfigRepo.findByStaffId.mockResolvedValue(null);

    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if TOTP is invalid', async () => {
    em.findOne.mockResolvedValue({ key: 'setup_complete', value: { completed: false } });
    mfaConfigRepo.findByStaffId.mockResolvedValue({ encryptedSecret: 'enc' } as any);
    mfaService.verifyTotp.mockResolvedValue(false);

    await expect(usecase.execute(em, params)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw InternalServerErrorException if super_admin role not found', async () => {
    em.findOne.mockResolvedValue({ key: 'setup_complete', value: { completed: false } });
    mfaConfigRepo.findByStaffId.mockResolvedValue({ encryptedSecret: 'enc' } as any);
    mfaService.verifyTotp.mockResolvedValue(true);
    roleRepo.findOne.mockResolvedValue(null);

    await expect(usecase.execute(em, params)).rejects.toThrow(InternalServerErrorException);
  });
});
