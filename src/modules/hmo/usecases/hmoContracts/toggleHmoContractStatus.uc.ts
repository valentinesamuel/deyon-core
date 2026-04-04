import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { HmoContractService } from '../../service/hmoContract.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TToggleHmoContractStatusParams = { id: string; isActive: boolean };

type TToggleHmoContractStatusResult = {
  contract: {
    id: string;
    updatedAt: Date;
    isActive: boolean;
  };
};

@Injectable()
export class ToggleHmoContractStatusUsecase extends Usecase<
  TToggleHmoContractStatusResult,
  TToggleHmoContractStatusParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly hmoContractService: HmoContractService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TToggleHmoContractStatusParams,
  ): Promise<TToggleHmoContractStatusResult> {
    const { id, isActive } = params;

    const updated = await this.hmoContractService.updateHmoContract(id, { isActive }, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.HMO_CONTRACT_STATUS_CHANGED,
        module: EventModule.HMO_CONTRACT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { contractId: id, isActive },
      },
      em,
    );

    return {
      contract: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        isActive: updated.isActive,
      },
    };
  }
}
