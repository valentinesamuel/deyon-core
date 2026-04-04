import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { HmoRulesService } from '../../service/hmoRules.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TDeleteHmoRuleParams = { ruleId: string };

type TDeleteHmoRuleResult = {
  id: string;
  deletedAt: Date;
};

@Injectable()
export class DeleteHmoRuleUsecase extends Usecase<TDeleteHmoRuleResult, TDeleteHmoRuleParams> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly hmoRulesService: HmoRulesService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TDeleteHmoRuleParams): Promise<TDeleteHmoRuleResult> {
    const { ruleId } = params;

    await this.hmoRulesService.getHmoRuleByDataOrFailIfNotExists({ where: { id: ruleId } }, em);

    await this.hmoRulesService.softDeleteHmoRule(ruleId, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.HMO_RULE_DELETED,
        module: EventModule.HMO_RULE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { ruleId },
      },
      em,
    );

    return {
      id: ruleId,
      deletedAt: new Date(),
    };
  }
}
