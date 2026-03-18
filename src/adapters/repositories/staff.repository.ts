import { EntityManager, FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
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

  async createStaff(staffData: Partial<Staff>): Promise<Staff> {
    const staff = this.create(staffData);
    return await this.save(staff);
  }

  async findStaffAndFailIfExist(id: string): Promise<void> {
    const staff = await this.findOne({
      where: {
        id,
      },
    });
    if (staff) {
      throw new ConflictException(`Staff already exists`);
    }
  }

  async findStaffByDataAndFailIfExist(options: FindOneOptions<Staff>): Promise<void> {
    const staff = await this.findOne(options);
    if (staff) {
      throw new ConflictException(`Staff already exists`);
    }
  }

  async findStaffAndFailIfNotExist(id: string): Promise<Staff> {
    const staff = await this.findOne({
      where: { id },
    });
    if (!staff) {
      throw new BadRequestException(`Staff not found`);
    }
    return staff;
  }

  async findStaffByDataAndFailIfNotExist(options: FindOneOptions<Staff>): Promise<Staff> {
    const staff = await this.findOne(options);
    if (!staff) {
      throw new BadRequestException(`Staff not found`);
    }
    return staff;
  }

  async findStaffsByData(options: FindManyOptions<Staff>): Promise<Staff[]> {
    return this.find(options);
  }

  async updateStaff(id: string, updateData: Partial<Staff>): Promise<Staff | undefined> {
    await this.update(id, updateData);
    return this.findStaffAndFailIfNotExist(id);
  }
}
