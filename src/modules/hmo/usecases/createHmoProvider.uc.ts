import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RequestMetadata } from '@shared/validations/reqMetadata.dto';
import { CreateHmoProviderDto } from '../dto.createHmoProvider.dto';
import { HmoProviderService } from '../service/hmoProvider.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type CreateHmoProviderParams = { params: CreateHmoProviderDto; metadata: RequestMetadata };

type CreateHmoProviderResult = {
  id: string;
  createdAt: Date;
  name: string;
  code: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  defaultCopay: string;
  isActive: string;
  portalUrl: string;
  claimsEmail: string;
  retractionEmail: string;
};

@Injectable()
export class CreateHmoProviderUsecase extends Usecase<
  CreateHmoProviderResult,
  CreateHmoProviderParams
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
    params: CreateHmoProviderParams,
  ): Promise<CreateHmoProviderResult> {
    const newHmoProvider = await this.hmoProviderService.createHmoProvider(params.params, em);
    const { ipAddress, userAgent } = params.metadata.requestMetadata;

    const actorId = this.requestContextService.getUserId();

    // 6. Log event
    await this.eventService.log(
      {
        actorId,
        event: EventType.HMO_PROVIDER_CREATED,
        module: EventModule.HMO_PROVIDER,
        ipAddress,
        userAgent,
        metadata: {
          name: params.params.name,
          code: params.params.code,
          contactPhone: params.params.contactPhone,
          contactEmail: params.params.contactEmail,
          claimsEmail: params.params.claimsEmail,
          retractionEmail: params.params.retractionEmail,
          defaultCopay: params.params.defaultCopay,
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
      isActive: newHmoProvider.isActive,
      portalUrl: newHmoProvider.portalUrl,
      claimsEmail: newHmoProvider.claimsEmail,
      retractionEmail: newHmoProvider.retractionEmail,
    };
  }
}
