import { DepartmentRepository } from '@adapters/repositories/department.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Department } from '@modules/core/entities/department.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(private readonly departmentRepository: DepartmentRepository) {}

  async createDepartment(data: Partial<Department>, em?: EntityManager) {
    return this.departmentRepository.createDepartment(data, em);
  }

  async getDepartmentByDataOrFailIfNotExists(
    data: FindResourceOptions<Department>,
    em?: EntityManager,
  ) {
    return this.departmentRepository.findOneOrFailIfNotExists(data, em);
  }

  async getDepartmentByDataOrFailIfExists(
    data: FindResourceOptions<Department>,
    em?: EntityManager,
  ) {
    return this.departmentRepository.findOneOrFailIfExists(data, em);
  }

  async updateDepartment(id: string, data: Partial<Department>, em?: EntityManager) {
    return this.departmentRepository.updateDepartment(id, data, em);
  }
}
