import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateHmoRulesDto } from '../../dto/hmoRules/createHmoRules.dto';
import { HmoRulesService } from '../../service/hmoRules.service';
import { HmoProviderService } from '../../service/hmoProvider.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateHmoRuleParams = { providerId: string; dto: CreateHmoRulesDto };

type TCreateHmoRuleResult = {
  id: string;
  createdAt: Date;
  hmoProviderId: string;
  triggerServiceId: string;
  logic: Record<string, unknown>[];
  errorMessage: string;
};

@Injectable()
export class CreateHmoRuleUsecase extends Usecase<TCreateHmoRuleResult, TCreateHmoRuleParams> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly hmoRulesService: HmoRulesService,
    private readonly hmoProviderService: HmoProviderService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TCreateHmoRuleParams): Promise<TCreateHmoRuleResult> {
    const { providerId, dto } = params;

    await this.hmoProviderService.getHmoProviderByDataOrFailIfNotExists(
      { where: { id: providerId } },
      em,
    );

    const rule = await this.hmoRulesService.createHmoRule(
      {
        hmoProviderId: providerId,
        triggerServiceId: dto.triggerServiceId,
        logic: dto.logic,
        errorMessage: dto.errorMessage,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.HMO_RULE_CREATED,
        module: EventModule.HMO_RULE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          ruleId: rule.id,
          hmoProviderId: providerId,
          triggerServiceId: dto.triggerServiceId,
        },
      },
      em,
    );

    return {
      id: rule.id,
      createdAt: rule.createdAt,
      hmoProviderId: rule.hmoProviderId,
      triggerServiceId: rule.triggerServiceId,
      logic: rule.logic,
      errorMessage: rule.errorMessage,
    };
  }
}
