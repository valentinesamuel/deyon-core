import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PermissionsMgmtService } from '../service/permissionsMgmt.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TParams = { staffId: string; permissionCode: string };
type TResult = { success: true };

@Injectable()
export class RevokePermissionUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly permissionsMgmtService: PermissionsMgmtService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const actorId = this.requestContextService.getUserId();

    await this.permissionsMgmtService.revokeOverride(
      { staffId: params.staffId, permissionCode: params.permissionCode },
      em,
    );

    await this.eventService.log(
      {
        actorId,
        event: EventType.PERMISSION_OVERRIDE_REVOKED,
        module: EventModule.PERMISSIONS_MGMT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { targetStaffId: params.staffId, permissionCode: params.permissionCode },
      },
      em,
    );

    return { success: true };
  }
}
