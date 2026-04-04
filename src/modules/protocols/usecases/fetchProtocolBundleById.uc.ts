import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ProtocolBundleService } from '../service/protocolBundle.service';

type TFetchProtocolBundleByIdParams = { id: string };

type TFetchProtocolBundleByIdResult = {
  bundle: {
    id: string;
    createdAt: Date;
    name: string;
    medicalCodeId: string;
  };
};

@Injectable()
export class FetchProtocolBundleByIdUsecase extends Usecase<
  TFetchProtocolBundleByIdResult,
  TFetchProtocolBundleByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly protocolBundleService: ProtocolBundleService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TFetchProtocolBundleByIdParams,
  ): Promise<TFetchProtocolBundleByIdResult> {
    const bundle = await this.protocolBundleService.getProtocolBundleByDataOrFailIfNotExists(
      { where: { id: params.id } },
      em,
    );

    return {
      bundle: {
        id: bundle.id,
        createdAt: bundle.createdAt,
        name: bundle.name,
        medicalCodeId: bundle.medicalCodeId,
      },
    };
  }
}
