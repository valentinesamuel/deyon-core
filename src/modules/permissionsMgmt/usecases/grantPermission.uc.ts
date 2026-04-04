import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PermissionsMgmtService } from '../service/permissionsMgmt.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { StaffPermissionOverride } from '@modules/core/entities/staffPermissionOverride.entity';
import { GrantPermissionDto } from '../dto/grantPermission.dto';

type TParams = { staffId: string } & GrantPermissionDto;
type TResult = { override: StaffPermissionOverride };

@Injectable()
export class GrantPermissionUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly permissionsMgmtService: PermissionsMgmtService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const actorId = this.requestContextService.getUserId();

    // Remove any existing override for this staff+permission before creating new one
    await this.permissionsMgmtService
      .revokeOverride({ staffId: params.staffId, permissionCode: params.permissionCode }, em)
      .catch(() => undefined);

    const override = await this.permissionsMgmtService.createOverride(
      {
        staffId: params.staffId,
        permissionCode: params.permissionCode,
        granted: params.granted,
        grantedBy: actorId,
        grantedAt: new Date(),
      },
      em,
    );

    const eventType = params.granted
      ? EventType.PERMISSION_OVERRIDE_GRANTED
      : EventType.PERMISSION_OVERRIDE_REVOKED;

    await this.eventService.log(
      {
        actorId,
        event: eventType,
        module: EventModule.PERMISSIONS_MGMT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          targetStaffId: params.staffId,
          permissionCode: params.permissionCode,
          granted: params.granted,
        },
      },
      em,
    );

    return { override };
  }
}
