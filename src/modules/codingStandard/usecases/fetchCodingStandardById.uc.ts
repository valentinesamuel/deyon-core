import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CodingStandardService } from '../service/codingStandard.service';
import { CodingStandard } from '@modules/core/entities/codingStandard.entity';

type TFetchCodingStandardByIdParams = { id: string };

@Injectable()
export class FetchCodingStandardByIdUsecase extends Usecase<
  CodingStandard,
  TFetchCodingStandardByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly codingStandardService: CodingStandardService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TFetchCodingStandardByIdParams,
  ): Promise<CodingStandard> {
    return this.codingStandardService.getCodingStandardByDataOrFailIfNotExists(
      {
        where: {
          id: params.id,
        },
      },
      em,
    );
  }
}
