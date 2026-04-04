import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PartnerLabService } from '../service/partnerLab.service';
import { PartnerLabStatusEnum } from '@modules/core/entities/partnerLab.entity';

type TGetPartnerLabResult = {
  partnerLab: {
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
};

type TGetPartnerLabByIdParams = { id: string };

@Injectable()
export class FetchPartnerLabByIdUsecase extends Usecase<
  TGetPartnerLabResult,
  TGetPartnerLabByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly partnerLabService: PartnerLabService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TGetPartnerLabByIdParams,
  ): Promise<TGetPartnerLabResult> {
    const partnerLab = await this.partnerLabService.getPartnerLabByDataOrFailIfNotExists(
      {
        where: {
          id: params.id,
        },
        select: {
          id: true,
          createdAt: true,
          name: true,
          code: true,
          contactPhone: true,
          contactEmail: true,
          address: true,
          specializations: true,
          status: true,
        },
      },
      em,
    );

    return {
      partnerLab: {
        id: partnerLab.id,
        createdAt: partnerLab.createdAt,
        name: partnerLab.name,
        code: partnerLab.code,
        contactPhone: partnerLab.contactPhone,
        contactEmail: partnerLab.contactEmail,
        address: partnerLab.address,
        specializations: partnerLab.specializations,
        status: partnerLab.status,
      },
    };
  }
}
