import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PartnerLabService } from '../service/partnerLab.service';
import { UpdatePartnerLabStatusDto } from '../dto/updatePartnerLabStatus.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { PartnerLabStatusEnum } from '@modules/core/entities/partnerLab.entity';

type TTogglePartnerLabStatusResult = {
  partnerLab: {
    id: string;
    updatedAt: Date;
    status: PartnerLabStatusEnum;
  };
};

type TTogglePartnerLabStatusParams = { id: string; dto: UpdatePartnerLabStatusDto };

@Injectable()
export class TogglePartnerLabStatusUsecase extends Usecase<
  TTogglePartnerLabStatusResult,
  TTogglePartnerLabStatusParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly partnerLabService: PartnerLabService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TTogglePartnerLabStatusParams,
  ): Promise<TTogglePartnerLabStatusResult> {
    const { id, dto } = params;

    const updated = await this.partnerLabService.updatePartnerLab(
      id,
      {
        status: dto.status,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.PARTNER_LAB_STATUS_CHANGED,
        module: EventModule.PARTNER_LAB,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id, status: dto.status },
      },
      em,
    );

    return {
      partnerLab: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        status: updated.status,
      },
    };
  }
}
