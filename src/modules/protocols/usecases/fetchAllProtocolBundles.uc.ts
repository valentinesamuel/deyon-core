import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { ProtocolBundle } from '@modules/core/entities/protocolBundles.entity';
import { PROTOCOL_BUNDLE_QUERY_CONFIG } from '../protocols.constants';

type FetchAllProtocolBundlesParams = { query: QueryInput };

@Injectable()
export class FetchAllProtocolBundlesUsecase extends Usecase<
  CursorPage<ProtocolBundle>,
  FetchAllProtocolBundlesParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllProtocolBundlesParams,
  ): Promise<CursorPage<ProtocolBundle>> {
    return this.queryEngine.execute(ProtocolBundle, params.query, PROTOCOL_BUNDLE_QUERY_CONFIG);
  }
}
