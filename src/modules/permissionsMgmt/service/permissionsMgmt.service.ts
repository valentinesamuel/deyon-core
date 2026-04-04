import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StaffPermissionOverrideRepository } from '@adapters/repositories/staffPermissionOverride.repository';
import { StaffPermissionOverride } from '@modules/core/entities/staffPermissionOverride.entity';

@Injectable()
export class PermissionsMgmtService {
  private readonly logger = new Logger(PermissionsMgmtService.name);

  constructor(private readonly overrideRepository: StaffPermissionOverrideRepository) {}

  findByStaffId(staffId: string, em?: EntityManager): Promise<StaffPermissionOverride[]> {
    return this.overrideRepository.findByStaffId(staffId, em);
  }

  createOverride(
    data: Partial<StaffPermissionOverride>,
    em?: EntityManager,
  ): Promise<StaffPermissionOverride> {
    return this.overrideRepository.createOverride(data, em);
  }

  revokeOverride(
    criteria: { staffId: string; permissionCode: string },
    em?: EntityManager,
  ): Promise<void> {
    return this.overrideRepository.deleteOverride(criteria, em);
  }

  getEffectivePermissions(
    rolePermissions: string[],
    staffId: string,
    em?: EntityManager,
  ): Promise<string[]> {
    return Promise.all([
      this.overrideRepository.findGrantedByStaffId(staffId, em),
      this.overrideRepository.findRevokedByStaffId(staffId, em),
    ]).then(([granted, revoked]) => {
      const base = new Set([...rolePermissions, ...granted]);
      revoked.forEach((p) => base.delete(p));
      return Array.from(base);
    });
  }
}
