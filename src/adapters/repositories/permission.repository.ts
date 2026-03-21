import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Permission } from '@modules/core/entities/permission.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class PermissionRepository extends BaseRepository<Permission> {
  private readonly logger = new Logger(PermissionRepository.name);

  constructor(
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByCode(code: string, em?: EntityManager): Promise<Permission | null> {
    const repo = em ? em.getRepository(Permission) : this;
    return repo.findOne({ where: { code } });
  }

  async findAllActive(em?: EntityManager): Promise<Permission[]> {
    const repo = em ? em.getRepository(Permission) : this;
    return repo.find({ where: { isActive: true } });
  }
}
