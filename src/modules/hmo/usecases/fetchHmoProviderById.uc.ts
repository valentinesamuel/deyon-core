import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { HmoProviderService } from '../service/hmoProvider.service';

type TGetHmoProviderResult = {
  hmoProvider: {
    id: string;
    createdAt: Date;
    name: string;
    code: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    defaultCopay: string;
    isActive: boolean;
    portalUrl: string;
    claimsEmail: string;
    retractionEmail: string;
  };
};

type TGetHmoProviderByIdParams = { id: string };

@Injectable()
export class FetchHmoProviderByIdUsecase extends Usecase<
  TGetHmoProviderResult,
  TGetHmoProviderByIdParams
> {
  readonly config = { requiresTransaction: true };

  constructor(private readonly hmoProviderService: HmoProviderService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TGetHmoProviderByIdParams,
  ): Promise<TGetHmoProviderResult> {
    const newHmoProvider = await this.hmoProviderService.getHmoProviderByDataOrFailIfNotExists(
      {
        where: {
          id: params.id,
        },
        select: {
          id: true,
          address: true,
          createdAt: true,
          name: true,
          code: true,
          contactPhone: true,
          contactEmail: true,
          defaultCopay: true,
          isActive: true,
          portalUrl: true,
          claimsEmail: true,
          retractionEmail: true,
        },
      },
      em,
    );

    return {
      hmoProvider: {
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
      },
    };
  }
}
