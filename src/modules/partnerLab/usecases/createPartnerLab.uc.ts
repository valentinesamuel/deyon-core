import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreatePartnerLabDto } from '../dto/createPartnerLab.dto';
import { PartnerLabService } from '../service/partnerLab.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { PartnerLabStatusEnum } from '@modules/core/entities/partnerLab.entity';

type TCreatePartnerLabResult = {
  id: string;
  createdAt: Date;
  name: string;
  code: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  specializations: string[];
  status: PartnerLabStatusEnum;
};

@Injectable()
export class CreatePartnerLabUsecase extends Usecase<TCreatePartnerLabResult, CreatePartnerLabDto> {
  constructor(
    private readonly partnerLabService: PartnerLabService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreatePartnerLabDto): Promise<TCreatePartnerLabResult> {
    await this.partnerLabService.getPartnerLabByDataOrFailIfExists(
      {
        where: {
          code: params.code,
        },
      },
      em,
    );

    const newPartnerLab = await this.partnerLabService.createPartnerLab(
      {
        name: params.name,
        code: params.code,
        contactPhone: params.contactPhone,
        contactEmail: params.contactEmail,
        address: params.address,
        specializations: params.specializations,
        status: params.status,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.PARTNER_LAB_CREATED,
        module: EventModule.PARTNER_LAB,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          name: params.name,
          code: params.code,
          contactPhone: params.contactPhone,
        },
      },
      em,
    );

    return {
      id: newPartnerLab.id,
      createdAt: newPartnerLab.createdAt,
      name: newPartnerLab.name,
      code: newPartnerLab.code,
      contactPhone: newPartnerLab.contactPhone,
      contactEmail: newPartnerLab.contactEmail,
      address: newPartnerLab.address,
      specializations: newPartnerLab.specializations,
      status: newPartnerLab.status,
    };
  }
}
