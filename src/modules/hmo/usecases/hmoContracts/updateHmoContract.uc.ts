import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateHmoContractDto } from '../../dto/hmoContract/updateHmoContract.dto';
import { HmoContractService } from '../../service/hmoContract.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { HMOContractCoverageTypeEnum } from '@modules/core/entities/hmoContract.entity';

type TUpdateHmoContractParams = { id: string; providerId: string; dto: UpdateHmoContractDto };

type TUpdateHmoContractResult = {
  contract: {
    id: string;
    updatedAt: Date;
    hmoProviderId: string;
    serviceId: string;
    coverageType: HMOContractCoverageTypeEnum;
    contractedPrice: number | null;
    coveragePercentage: number | null;
    coverageFlatAmount: number | null;
    maxCoveredAmount: number | null;
    isActive: boolean;
    requiredPreAuthorization: boolean;
  };
};

@Injectable()
export class UpdateHmoContractUsecase extends Usecase<
  TUpdateHmoContractResult,
  TUpdateHmoContractParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly hmoContractService: HmoContractService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TUpdateHmoContractParams,
  ): Promise<TUpdateHmoContractResult> {
    const { id, providerId, dto } = params;

    await this.hmoContractService.getHmoContractByDataOrFailIfNotExists(
      { where: { id, hmoProviderId: providerId } },
      em,
    );

    const updated = await this.hmoContractService.updateHmoContract(id, dto, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.HMO_CONTRACT_UPDATED,
        module: EventModule.HMO_CONTRACT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { contractId: id, hmoProviderId: providerId, ...dto },
      },
      em,
    );

    return {
      contract: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        hmoProviderId: updated.hmoProviderId,
        serviceId: updated.serviceId,
        coverageType: updated.coverageType,
        contractedPrice: updated.contractedPrice,
        coveragePercentage: updated.coveragePercentage,
        coverageFlatAmount: updated.coverageFlatAmount,
        maxCoveredAmount: updated.maxCoveredAmount,
        isActive: updated.isActive,
        requiredPreAuthorization: updated.requiredPreAuthorization,
      },
    };
  }
}
