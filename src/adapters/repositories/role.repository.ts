import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Role } from '@modules/core/entities/role.entity';
import { BaseRepository } from '@adapters/repositories/base.repository';

@Injectable()
export class RoleRepository extends BaseRepository<Role> {
  private readonly logger = new Logger(RoleRepository.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {
    super(roleRepo.target, roleRepo.manager, roleRepo.queryRunner);
  }

  async createRole(data: Partial<Role>, entityManager?: EntityManager): Promise<Role> {
    const repo = entityManager ? entityManager.getRepository(Role) : this;
    const role = repo.create(data);
    return repo.save(role);
  }

  async findAllRoles(entityManager?: EntityManager): Promise<Role[]> {
    const repo = entityManager ? entityManager.getRepository(Role) : this;
    const qb = repo.createQueryBuilder('role').leftJoinAndSelect('role.permissions', 'permissions');
    qb.loadRelationCountAndMap('role.staffCount', 'role.staffs');
    return qb.getMany();
  }

  async findRoleById(id: string, entityManager?: EntityManager): Promise<Role | null> {
    const repo = entityManager ? entityManager.getRepository(Role) : this;
    return repo.findOne({ where: { id }, relations: ['permissions', 'staffs'] });
  }

  async softDeleteRole(id: string, entityManager?: EntityManager): Promise<void> {
    const repo = entityManager ? entityManager.getRepository(Role) : this;
    await repo.softDelete(id);
  }
}
