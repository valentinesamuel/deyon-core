import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RoleRepository } from '@adapters/repositories/role.repository';

type TListRolesResult = {
  id: string;
  name: string;
  alias: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: { code: string; description: string }[];
  staffCount: number;
}[];

@Injectable()
export class ListRolesUsecase extends Usecase<TListRolesResult, Record<string, never>> {
  constructor(private readonly roleRepository: RoleRepository) {
    super();
  }

  async execute(em: EntityManager): Promise<TListRolesResult> {
    const roles = await this.roleRepository.findAllRoles(em);
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      alias: role.alias,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      permissions: (role.permissions ?? []).map((p) => ({
        code: p.code,
        description: p.description,
      })),
      staffCount: (role as unknown as { staffCount: number }).staffCount ?? 0,
    }));
  }
}
