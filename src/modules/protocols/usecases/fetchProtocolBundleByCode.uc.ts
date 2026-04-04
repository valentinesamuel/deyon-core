import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ProtocolBundle } from '@modules/core/entities/protocolBundles.entity';

type TFetchProtocolBundleByCodeParams = { codeValue: string };

@Injectable()
export class FetchProtocolBundleByCodeUsecase extends Usecase<
  ProtocolBundle,
  TFetchProtocolBundleByCodeParams
> {
  readonly config = { requiresTransaction: false };

  async execute(
    em: EntityManager,
    params: TFetchProtocolBundleByCodeParams,
  ): Promise<ProtocolBundle> {
    const bundle = await em.getRepository(ProtocolBundle).findOne({
      where: { medicalCode: { codeValue: params.codeValue } },
      relations: ['medicalCode', 'items'],
    });

    if (!bundle) {
      throw new NotFoundException('Protocol bundle not found');
    }

    return bundle;
  }
}
