import { mock } from 'vitest-mock-extended';
import { Repository } from 'typeorm';
import { MfaConfigRepository } from './mfaConfig.repository';
import { MfaConfig } from '@modules/core/entities/mfaConfig.entity';

describe('MfaConfigRepository', () => {
  let repo: MfaConfigRepository;
  let innerRepo: ReturnType<typeof mock<Repository<MfaConfig>>>;

  beforeEach(() => {
    innerRepo = mock<Repository<MfaConfig>>();
    repo = Object.create(MfaConfigRepository.prototype);
    (repo as any)['repo'] = innerRepo;
    (repo as any)['findOne'] = innerRepo.findOne.bind(innerRepo);
    (repo as any)['create'] = innerRepo.create;
    (repo as any)['save'] = innerRepo.save;
  });

  describe('findByStaffId', () => {
    it('should return null if config not found', async () => {
      innerRepo.findOne.mockResolvedValue(null);
      const result = await repo.findByStaffId('staff-1');
      expect(result).toBeNull();
    });

    it('should return MfaConfig if found', async () => {
      const config = { id: 'mfa-1', staffId: 'staff-1', encryptedSecret: 'enc' };
      innerRepo.findOne.mockResolvedValue(config as any);
      const result = await repo.findByStaffId('staff-1');
      expect(result).toEqual(config);
    });
  });

  describe('saveOrUpdate', () => {
    it('should create new config if not exists', async () => {
      innerRepo.findOne.mockResolvedValue(null);
      const newConfig = { id: 'mfa-new', staffId: 'staff-1', encryptedSecret: 'enc' };
      innerRepo.create.mockReturnValue(newConfig as any);
      innerRepo.save.mockResolvedValue(newConfig as any);

      const result = await repo.saveOrUpdate('staff-1', { encryptedSecret: 'enc' });

      expect(innerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ staffId: 'staff-1', encryptedSecret: 'enc' }),
      );
      expect(result).toEqual(newConfig);
    });

    it('should update existing config if found', async () => {
      const existing = { id: 'mfa-1', staffId: 'staff-1', encryptedSecret: 'old-enc' };
      innerRepo.findOne.mockResolvedValue(existing as any);
      const updated = { ...existing, encryptedSecret: 'new-enc' };
      innerRepo.save.mockResolvedValue(updated as any);

      const result = await repo.saveOrUpdate('staff-1', { encryptedSecret: 'new-enc' });

      expect(innerRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ encryptedSecret: 'new-enc' }),
      );
      expect(result.encryptedSecret).toBe('new-enc');
    });
  });
});
