import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateHmoRulesDto } from '../../dto/hmoRules/updateHmoRules.dto';
import { HmoRulesService } from '../../service/hmoRules.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TUpdateHmoRuleParams = { id: string; providerId: string; dto: UpdateHmoRulesDto };

type TUpdateHmoRuleResult = {
  rule: {
    id: string;
    updatedAt: Date;
    hmoProviderId: string;
    triggerServiceId: string;
    logic: Record<string, unknown>[];
    errorMessage: string;
  };
};

@Injectable()
export class UpdateHmoRuleUsecase extends Usecase<TUpdateHmoRuleResult, TUpdateHmoRuleParams> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly hmoRulesService: HmoRulesService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TUpdateHmoRuleParams): Promise<TUpdateHmoRuleResult> {
    const { id, providerId, dto } = params;

    await this.hmoRulesService.getHmoRuleByDataOrFailIfNotExists(
      { where: { id, hmoProviderId: providerId } },
      em,
    );

    const updated = await this.hmoRulesService.updateHmoRule(id, dto, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.HMO_RULE_UPDATED,
        module: EventModule.HMO_RULE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { ruleId: id, hmoProviderId: providerId, ...dto },
      },
      em,
    );

    return {
      rule: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        hmoProviderId: updated.hmoProviderId,
        triggerServiceId: updated.triggerServiceId,
        logic: updated.logic,
        errorMessage: updated.errorMessage,
      },
    };
  }
}
