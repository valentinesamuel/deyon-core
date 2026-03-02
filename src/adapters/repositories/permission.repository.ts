import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '@modules/core/entities/permission.entity';

@Injectable()
export class PermissionRepository extends Repository<Permission> {
  private readonly logger = new Logger(PermissionRepository.name);

  constructor(
    @InjectRepository(Permission)
    private readonly repo: Repository<Permission>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async findByCode(code: string): Promise<Permission | null> {
    return this.repo.findOne({ where: { code } });
  }

  async findAllActive(): Promise<Permission[]> {
    return this.repo.find({ where: { isActive: true } });
  }
}
