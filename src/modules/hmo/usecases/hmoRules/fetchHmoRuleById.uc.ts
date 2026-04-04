import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { HmoRulesService } from '../../service/hmoRules.service';

type TFetchHmoRuleByIdParams = { id: string; providerId: string };

type TFetchHmoRuleByIdResult = {
  rule: {
    id: string;
    createdAt: Date;
    hmoProviderId: string;
    triggerServiceId: string;
    logic: Record<string, unknown>[];
    errorMessage: string;
  };
};

@Injectable()
export class FetchHmoRuleByIdUsecase extends Usecase<
  TFetchHmoRuleByIdResult,
  TFetchHmoRuleByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly hmoRulesService: HmoRulesService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TFetchHmoRuleByIdParams,
  ): Promise<TFetchHmoRuleByIdResult> {
    const { id, providerId } = params;

    const rule = await this.hmoRulesService.getHmoRuleByDataOrFailIfNotExists(
      { where: { id, hmoProviderId: providerId } },
      em,
    );

    return {
      rule: {
        id: rule.id,
        createdAt: rule.createdAt,
        hmoProviderId: rule.hmoProviderId,
        triggerServiceId: rule.triggerServiceId,
        logic: rule.logic,
        errorMessage: rule.errorMessage,
      },
    };
  }
}
