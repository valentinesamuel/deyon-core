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
});
