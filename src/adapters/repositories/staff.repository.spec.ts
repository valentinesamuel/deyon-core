import { mock } from 'vitest-mock-extended';
import { Repository } from 'typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { StaffRepository } from './staff.repository';
import { Staff } from '@modules/core/entities/staff.entity';

describe('StaffRepository', () => {
  let repo: StaffRepository;
  let innerRepo: ReturnType<typeof mock<Repository<Staff>>>;

  beforeEach(() => {
    innerRepo = mock<Repository<Staff>>();
    repo = Object.create(StaffRepository.prototype);
    // Patch prototype methods to delegate to inner mock
    repo['findOne'] = innerRepo.findOne as any;
    repo['find'] = innerRepo.find as any;
    repo['update'] = innerRepo.update as any;
    repo['create'] = innerRepo.create as any;
    repo['save'] = innerRepo.save as any;
  });

  describe('findStaffAndFailIfExist', () => {
    it('should throw ConflictException if staff found', async () => {
      innerRepo.findOne.mockResolvedValue({ id: 'staff-1' } as any);
      await expect(repo.findStaffAndFailIfExist('staff-1')).rejects.toThrow(ConflictException);
    });

    it('should not throw if staff not found', async () => {
      innerRepo.findOne.mockResolvedValue(null);
      await expect(repo.findStaffAndFailIfExist('staff-1')).resolves.not.toThrow();
    });
  });

  describe('findStaffAndFailIfNotExist', () => {
    it('should throw BadRequestException if staff not found', async () => {
      innerRepo.findOne.mockResolvedValue(null);
      await expect(repo.findStaffAndFailIfNotExist('missing-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return staff if found', async () => {
      const staff = { id: 'staff-1', email: 'test@test.com' };
      innerRepo.findOne.mockResolvedValue(staff as any);
      const result = await repo.findStaffAndFailIfNotExist('staff-1');
      expect(result).toEqual(staff);
    });
  });

  describe('findStaffByDataAndFailIfExist', () => {
    it('should throw ConflictException if staff matches options', async () => {
      innerRepo.findOne.mockResolvedValue({ id: 'staff-1' } as any);
      await expect(
        repo.findStaffByDataAndFailIfExist({ where: { email: 'test@test.com' } }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findStaffByDataAndFailIfNotExist', () => {
    it('should throw BadRequestException if no match', async () => {
      innerRepo.findOne.mockResolvedValue(null);
      await expect(
        repo.findStaffByDataAndFailIfNotExist({ where: { email: 'ghost@test.com' } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return matching staff', async () => {
      const staff = { id: 'staff-1' };
      innerRepo.findOne.mockResolvedValue(staff as any);
      const result = await repo.findStaffByDataAndFailIfNotExist({
        where: { email: 'test@test.com' },
      });
      expect(result).toEqual(staff);
    });
  });
});
