import { Injectable } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { Department } from '@modules/core/entities/department.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class DepartmentRepository extends BaseRepository<Department> {
  constructor(@InjectRepository(Department) private readonly repo: Repository<Department>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createDepartment(data: Partial<Department>, em?: EntityManager) {
    const repo = em ? em.getRepository(Department) : this;
    const department = repo.create(data);
    return repo.save(department);
  }

  updateDepartment(id: string, data: Partial<Department>, em?: EntityManager): Promise<Department> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<Department>,
      data as QueryDeepPartialEntity<Department>,
      entityManager,
    );
  }
}
