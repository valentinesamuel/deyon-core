import { EntityManager, FindManyOptions, FindOptionsWhere, Repository } from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Staff } from '@modules/core/entities/staff.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class StaffRepository extends BaseRepository<Staff> {
  private readonly logger = new Logger(StaffRepository.name);

  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
    private readonly entityManager: EntityManager,
  ) {
    super(staffRepository.target, staffRepository.manager, staffRepository.queryRunner);
  }

  async createStaff(staffData: Partial<Staff>, em?: EntityManager): Promise<Staff> {
    const repo = em ? em.getRepository(Staff) : this;
    const staff = repo.create(staffData);
    return repo.save(staff);
  }

  async findStaffsByData(options: FindManyOptions<Staff>, em?: EntityManager): Promise<Staff[]> {
    const repo = em ? em.getRepository(Staff) : this;
    return repo.find(options);
  }

  async updateStaff(
    id: string,
    updateData: Partial<Staff>,
    em?: EntityManager,
  ): Promise<Staff | undefined> {
    const repo = em ? em.getRepository(Staff) : this;
    await repo.update(id, updateData);
    return this.findOneOrFailIfNotExists({ where: { id } as FindOptionsWhere<Staff> }, em);
  }
}
