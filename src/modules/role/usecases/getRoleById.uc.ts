import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RoleRepository } from '@adapters/repositories/role.repository';

type TGetRoleResult = {
  id: string;
  name: string;
  alias: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: { code: string; description: string }[];
  staffCount: number;
  staffs: { id: string; firstName: string; lastName: string; email: string }[];
};

type TGetRoleParams = { id: string };

@Injectable()
export class GetRoleByIdUsecase extends Usecase<TGetRoleResult, TGetRoleParams> {
  constructor(private readonly roleRepository: RoleRepository) {
    super();
  }

  async execute(em: EntityManager, params: TGetRoleParams): Promise<TGetRoleResult> {
    const role = await this.roleRepository.findRoleById(params.id, em);
    if (!role) throw new NotFoundException('Role not found');

    return {
      id: role.id,
      name: role.name,
      alias: role.alias,
      isSystemRole: role.isSystemRole,
      isActive: role.isActive,
      permissions: (role.permissions ?? []).map((p) => ({
        code: p.code,
        description: p.description,
      })),
      staffCount: (role.staffs ?? []).length,
      staffs: (role.staffs ?? []).map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
      })),
    };
  }
}
