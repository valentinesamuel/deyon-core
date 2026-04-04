import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { StaffPermissionOverride } from '@modules/core/entities/staffPermissionOverride.entity';

@Injectable()
export class StaffPermissionOverrideRepository extends BaseRepository<StaffPermissionOverride> {
  constructor(
    @InjectRepository(StaffPermissionOverride)
    private readonly repo: Repository<StaffPermissionOverride>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createOverride(
    data: Partial<StaffPermissionOverride>,
    em?: EntityManager,
  ): Promise<StaffPermissionOverride> {
    const repo = em ? em.getRepository(StaffPermissionOverride) : this;
    const override = repo.create(data);
    return repo.save(override);
  }

  findByStaffId(staffId: string, em?: EntityManager): Promise<StaffPermissionOverride[]> {
    const repo = em ? em.getRepository(StaffPermissionOverride) : this;
    return repo.find({ where: { staffId }, relations: { staff: true } });
  }

  findGrantedByStaffId(staffId: string, em?: EntityManager): Promise<string[]> {
    const repo = em ? em.getRepository(StaffPermissionOverride) : this;
    return repo
      .find({ where: { staffId, granted: true } })
      .then((overrides) => overrides.map((o) => o.permissionCode));
  }

  findRevokedByStaffId(staffId: string, em?: EntityManager): Promise<string[]> {
    const repo = em ? em.getRepository(StaffPermissionOverride) : this;
    return repo
      .find({ where: { staffId, granted: false } })
      .then((overrides) => overrides.map((o) => o.permissionCode));
  }

  deleteOverride(
    criteria: { staffId: string; permissionCode: string },
    em?: EntityManager,
  ): Promise<void> {
    const repo = em ? em.getRepository(StaffPermissionOverride) : this;
    return repo.softDelete(criteria).then(() => undefined);
  }
}
