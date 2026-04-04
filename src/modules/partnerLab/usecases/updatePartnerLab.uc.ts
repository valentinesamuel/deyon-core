import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PartnerLabService } from '../service/partnerLab.service';
import { UpdatePartnerLabDto } from '../dto/updatePartnerLab.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { PartnerLabStatusEnum } from '@modules/core/entities/partnerLab.entity';

type TUpdatePartnerLabResult = {
  partnerLab: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    specializations: string[];
    status: PartnerLabStatusEnum;
  };
};

type TUpdatePartnerLabParams = { id: string; dto: UpdatePartnerLabDto };

@Injectable()
export class UpdatePartnerLabUsecase extends Usecase<
  TUpdatePartnerLabResult,
  TUpdatePartnerLabParams
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
    params: TUpdatePartnerLabParams,
  ): Promise<TUpdatePartnerLabResult> {
    const { id, dto } = params;

    const updated = await this.partnerLabService.updatePartnerLab(
      id,
      {
        name: dto.name,
        code: dto.code,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        address: dto.address,
        specializations: dto.specializations,
        status: dto.status,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.PARTNER_LAB_UPDATED,
        module: EventModule.PARTNER_LAB,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id },
      },
      em,
    );

    return {
      partnerLab: {
        id: updated.id,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        name: updated.name,
        code: updated.code,
        contactPhone: updated.contactPhone,
        contactEmail: updated.contactEmail,
        address: updated.address,
        specializations: updated.specializations,
        status: updated.status,
      },
    };
  }
}
