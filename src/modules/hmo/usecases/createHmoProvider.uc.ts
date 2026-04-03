import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateHmoProviderDto } from '../dto/createHmoProvider.dto';
import { HmoProviderService } from '../service/hmoProvider.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateHmoProviderResult = {
  id: string;
  createdAt: Date;
  name: string;
  code: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  portalUrl: string;
  relationshipManagerPhone: string;
  defaultCopay: string;
  defaultCopayPercentage: number;
  isActive: boolean;
  claimsEmail: string;
  retractionEmail: string;
};

@Injectable()
export class CreateHmoProviderUsecase extends Usecase<
  TCreateHmoProviderResult,
  CreateHmoProviderDto
> {
  constructor(
    private readonly hmoProviderService: HmoProviderService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: CreateHmoProviderDto,
  ): Promise<TCreateHmoProviderResult> {
    await this.hmoProviderService.getHmoProviderByDataOrFailIfExists(
      {
        where: {
          code: params.code,
        },
      },
      em,
    );

    const newHmoProvider = await this.hmoProviderService.createHmoProvider(
      {
        address: params.address,
        claimsEmail: params.claimsEmail,
        contactEmail: params.contactEmail,
        contactPhone: params.contactPhone,
        defaultCopay: String(params.defaultCopay),
        defaultCopayPercentage: params.defaultCopayPercentage,
        isActive: params.isActive,
        name: params.name,
        relationshipManagerPhone: params.relationshipManagerPhone,
        portalUrl: params.portalUrl,
        retractionEmail: params.retractionEmail,
        code: params.code,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    // 6. Log event
    await this.eventService.log(
      {
        actorId,
        event: EventType.HMO_PROVIDER_CREATED,
        module: EventModule.HMO_PROVIDER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          name: params.name,
          code: params.code,
          contactPhone: params.contactPhone,
          contactEmail: params.contactEmail,
          claimsEmail: params.claimsEmail,
          retractionEmail: params.retractionEmail,
          defaultCopay: params.defaultCopay,
        },
      },
      em,
    );

    return {
      id: newHmoProvider.id,
      address: newHmoProvider.address,
      createdAt: newHmoProvider.createdAt,
      name: newHmoProvider.name,
      code: newHmoProvider.code,
      contactPhone: newHmoProvider.contactPhone,
      contactEmail: newHmoProvider.contactEmail,
      defaultCopay: newHmoProvider.defaultCopay,
      defaultCopayPercentage: newHmoProvider.defaultCopayPercentage,
      relationshipManagerPhone: newHmoProvider.relationshipManagerPhone,
      isActive: newHmoProvider.isActive,
      portalUrl: newHmoProvider.portalUrl,
      claimsEmail: newHmoProvider.claimsEmail,
      retractionEmail: newHmoProvider.retractionEmail,
    };
  }
}
