import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { HmoProviderService } from '../../service/hmoProvider.service';
import { UpdateHmoProviderDto } from '../../dto/hmoProvider/updateHmoProvider.dto';

type TUpdateHmoProviderResult = {
  hmoProvider: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    code: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    defaultCopay: string;
    defaultCopayPercentage: number;
    isActive: boolean;
    portalUrl: string;
    claimsEmail: string;
    retractionEmail: string;
  };
};

type TUpdateHmoProviderParams = { id: string; dto: UpdateHmoProviderDto };

@Injectable()
export class UpdateHmoProviderUsecase extends Usecase<
  TUpdateHmoProviderResult,
  TUpdateHmoProviderParams
> {
  readonly config = { requiresTransaction: true };

  constructor(private readonly hmoProviderService: HmoProviderService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TUpdateHmoProviderParams,
  ): Promise<TUpdateHmoProviderResult> {
    const { id, dto } = params;

    const updated = await this.hmoProviderService.updateHmoProvider(
      id,
      {
        address: dto.address,
        claimsEmail: dto.claimsEmail,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        defaultCopay: String(dto.defaultCopay),
        defaultCopayPercentage: dto.defaultCopayPercentage,
        isActive: dto.isActive,
        name: dto.name,
        portalUrl: dto.portalUrl,
        retractionEmail: dto.retractionEmail,
      },
      em,
    );

    return {
      hmoProvider: {
        id: updated.id,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        name: updated.name,
        code: updated.code,
        contactPhone: updated.contactPhone,
        contactEmail: updated.contactEmail,
        address: updated.address,
        defaultCopay: updated.defaultCopay,
        defaultCopayPercentage: updated.defaultCopayPercentage,
        isActive: updated.isActive,
        portalUrl: updated.portalUrl,
        claimsEmail: updated.claimsEmail,
        retractionEmail: updated.retractionEmail,
      },
    };
  }
}
