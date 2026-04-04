import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ResolvePriceDto } from '../dto/resolvePrice.dto';
import { MedicalServiceService } from '../service/medicalService.service';
import {
  HmoContract,
  HMOContractCoverageTypeEnum,
} from '@modules/core/entities/hmoContract.entity';

type TResolvePriceResult = {
  effectivePrice: number;
  hmoCoverage: number;
  patientOwes: number;
  coverageType: string;
};

@Injectable()
export class ResolvePriceUsecase extends Usecase<TResolvePriceResult, ResolvePriceDto> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly medicalServiceService: MedicalServiceService) {
    super();
  }

  async execute(em: EntityManager, params: ResolvePriceDto): Promise<TResolvePriceResult> {
    const service = await this.medicalServiceService.getMedicalServiceByDataOrFailIfNotExists(
      { where: { id: params.serviceId } },
      em,
    );

    let contract: HmoContract | null = null;

    if (params.hmoProviderId) {
      contract = await em.getRepository(HmoContract).findOne({
        where: {
          serviceId: params.serviceId,
          hmoProviderId: params.hmoProviderId,
          isActive: true,
        },
      });
    }

    const effectivePrice = Number(contract?.contractedPrice ?? service.defaultPrice);

    let hmoCoverage: number;
    let patientOwes: number;

    if (!contract || contract.coverageType === HMOContractCoverageTypeEnum.NONE) {
      hmoCoverage = 0;
      patientOwes = effectivePrice;
    } else if (contract.coverageType === HMOContractCoverageTypeEnum.FULL) {
      hmoCoverage = effectivePrice;
      patientOwes = 0;
    } else if (contract.coverageType === HMOContractCoverageTypeEnum.PARTIAL_PERCENT) {
      const raw = effectivePrice * (Number(contract.coveragePercentage) / 100);
      hmoCoverage = contract.maxCoveredAmount
        ? Math.min(raw, Number(contract.maxCoveredAmount))
        : raw;
      patientOwes = effectivePrice - hmoCoverage;
    } else if (contract.coverageType === HMOContractCoverageTypeEnum.PARTIAL_FLAT) {
      const raw = Number(contract.coverageFlatAmount);
      hmoCoverage = contract.maxCoveredAmount
        ? Math.min(raw, Number(contract.maxCoveredAmount))
        : raw;
      patientOwes = effectivePrice - hmoCoverage;
    } else {
      hmoCoverage = 0;
      patientOwes = effectivePrice;
    }

    return {
      effectivePrice,
      hmoCoverage,
      patientOwes,
      coverageType: contract?.coverageType ?? 'none',
    };
  }
}
