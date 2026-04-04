import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateHmoContractDto } from '@modules/hmo/dto/hmoContract/createHmoContract.dto';
import { HmoContractService } from '../../service/hmoContract.service';
import { HmoProviderService } from '../../service/hmoProvider.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateHmoContractResult = {
  id: string;
  createdAt: Date;
  hmoProviderId: string;
  serviceId: string;
  coverageType: string;
  contractedPrice: number | null;
  coveragePercentage: number | null;
  coverageFlatAmount: number | null;
  maxCoveredAmount: number | null;
  isActive: boolean;
  requiredPreAuthorization: boolean;
};

type TCreateHmoContractParams = { providerId: string; dto: CreateHmoContractDto };

@Injectable()
export class CreateHmoContractUsecase extends Usecase<
  TCreateHmoContractResult,
  TCreateHmoContractParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly hmoContractService: HmoContractService,
    private readonly hmoProviderService: HmoProviderService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TCreateHmoContractParams,
  ): Promise<TCreateHmoContractResult> {
    const { providerId, dto } = params;

    await this.hmoProviderService.getHmoProviderByDataOrFailIfNotExists(
      { where: { id: providerId } },
      em,
    );

    const contract = await this.hmoContractService.createHmoContract(
      {
        hmoProviderId: providerId,
        serviceId: dto.serviceId,
        coverageType: dto.coverageType,
        contractedPrice: dto.contractedPrice ?? null,
        coveragePercentage: dto.coveragePercentage ?? null,
        coverageFlatAmount: dto.coverageFlatAmount ?? null,
        maxCoveredAmount: dto.maxCoveredAmount ?? null,
        isActive: dto.isActive,
        requiredPreAuthorization: dto.requiredPreAuthorization,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.HMO_CONTRACT_CREATED,
        module: EventModule.HMO_CONTRACT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          contractId: contract.id,
          hmoProviderId: providerId,
          serviceId: dto.serviceId,
          coverageType: dto.coverageType,
        },
      },
      em,
    );

    return {
      id: contract.id,
      createdAt: contract.createdAt,
      hmoProviderId: contract.hmoProviderId,
      serviceId: contract.serviceId,
      coverageType: contract.coverageType,
      contractedPrice: contract.contractedPrice,
      coveragePercentage: contract.coveragePercentage,
      coverageFlatAmount: contract.coverageFlatAmount,
      maxCoveredAmount: contract.maxCoveredAmount,
      isActive: contract.isActive,
      requiredPreAuthorization: contract.requiredPreAuthorization,
    };
  }
}
