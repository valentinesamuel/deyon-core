import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { HmoProviderService } from '../service/hmoProvider.service';
import { UpdateHmoProviderStatusDto } from '../dto/updateHmoProvider.dto';

type TUpdateHmoProviderStatusResult = {
  hmoProvider: {
    id: string;
    updatedAt: Date;
    isActive: boolean;
  };
};

type TUpdateHmoProviderStatusParams = { id: string; dto: UpdateHmoProviderStatusDto };

@Injectable()
export class UpdateHmoProviderStatusUsecase extends Usecase<
  TUpdateHmoProviderStatusResult,
  TUpdateHmoProviderStatusParams
> {
  readonly config = { requiresTransaction: true };

  constructor(private readonly hmoProviderService: HmoProviderService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TUpdateHmoProviderStatusParams,
  ): Promise<TUpdateHmoProviderStatusResult> {
    const { id, dto } = params;

    const updated = await this.hmoProviderService.updateHmoProvider(
      id,
      {
        isActive: dto.isActive,
      },
      em,
    );

    return {
      hmoProvider: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        isActive: updated.isActive,
      },
    };
  }
}
