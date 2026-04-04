import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PermissionsMgmtService } from '../service/permissionsMgmt.service';
import { StaffPermissionOverride } from '@modules/core/entities/staffPermissionOverride.entity';

type TParams = { staffId: string };
type TResult = { overrides: StaffPermissionOverride[] };

@Injectable()
export class GetStaffPermissionsUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly permissionsMgmtService: PermissionsMgmtService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const overrides = await this.permissionsMgmtService.findByStaffId(params.staffId);
    return { overrides };
  }
}
