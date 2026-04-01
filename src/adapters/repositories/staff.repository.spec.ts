import { mock } from 'vitest-mock-extended';
import { Repository } from 'typeorm';
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

  describe('createStaff', () => {
    it('should create and save a new staff member', async () => {
      const staffData = { email: 'test@example.com', firstName: 'John' };
      const created = { id: 'staff-1', ...staffData };
      innerRepo.create.mockReturnValue(created as any);
      innerRepo.save.mockResolvedValue(created as any);

      const result = await repo.createStaff(staffData);

      expect(innerRepo.create).toHaveBeenCalledWith(staffData);
      expect(innerRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('findStaffsByData', () => {
    it('should find staffs with the provided options', async () => {
      const staffs = [{ id: 'staff-1', isActive: true }];
      innerRepo.find.mockResolvedValue(staffs as any);
      const options = { where: { isActive: true } };

      const result = await repo.findStaffsByData(options);

      expect(innerRepo.find).toHaveBeenCalledWith(options);
      expect(result).toEqual(staffs);
    });
  });

  describe('findStaffByRoleId', () => {
    it('should find staffs by roleId', async () => {
      const staffs = [{ id: 'staff-1', roleId: 'role-1' }];
      innerRepo.find.mockResolvedValue(staffs as any);

      const result = await repo.findStaffByRoleId('role-1');

      expect(innerRepo.find).toHaveBeenCalledWith({ where: { roleId: 'role-1' } });
      expect(result).toEqual(staffs);
    });
  });

  describe('updateStaffRoleById', () => {
    it('should update the roleId for a staff member', async () => {
      innerRepo.update.mockResolvedValue({ affected: 1 } as any);

      await repo.updateStaffRoleById('staff-1', 'role-2');

      expect(innerRepo.update).toHaveBeenCalledWith('staff-1', { roleId: 'role-2' });
    });
  });
});
