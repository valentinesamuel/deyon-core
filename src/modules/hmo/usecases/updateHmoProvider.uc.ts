import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { HmoProviderService } from '../service/hmoProvider.service';
import { UpdateHmoProviderDto } from '../dto/updateHmoProvider.dto';

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
    isActive: string;
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

    const updated = await this.hmoProviderService.updateHmoProvider(id, dto, em);

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
        isActive: updated.isActive,
        portalUrl: updated.portalUrl,
        claimsEmail: updated.claimsEmail,
        retractionEmail: updated.retractionEmail,
      },
    };
  }
}
