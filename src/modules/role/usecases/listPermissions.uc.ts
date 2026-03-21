import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PermissionRepository } from '@adapters/repositories/permission.repository';

type TListPermissionsResult = { id: string; code: string; description: string }[];

@Injectable()
export class ListPermissionsUsecase extends Usecase<TListPermissionsResult, Record<string, never>> {
  constructor(private readonly permissionRepository: PermissionRepository) {
    super();
  }

  async execute(_em: EntityManager): Promise<TListPermissionsResult> {
    const permissions = await this.permissionRepository.findAllActive();
    return permissions.map((p) => ({ id: p.id, code: p.code, description: p.description }));
  }
}
