import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { HmoContractService } from '../../service/hmoContract.service';
import { HMOContractCoverageTypeEnum } from '@modules/core/entities/hmoContract.entity';

type TFetchHmoContractByIdParams = { id: string; providerId: string };

type TFetchHmoContractByIdResult = {
  contract: {
    id: string;
    createdAt: Date;
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
export class FetchHmoContractByIdUsecase extends Usecase<
  TFetchHmoContractByIdResult,
  TFetchHmoContractByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly hmoContractService: HmoContractService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TFetchHmoContractByIdParams,
  ): Promise<TFetchHmoContractByIdResult> {
    const { id, providerId } = params;

    const contract = await this.hmoContractService.getHmoContractByDataOrFailIfNotExists(
      { where: { id, hmoProviderId: providerId } },
      em,
    );

    return {
      contract: {
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
      },
    };
  }
}
