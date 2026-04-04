import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { HmoContractService } from '../../service/hmoContract.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TDeleteHmoContractParams = { id: string; providerId: string };

type TDeleteHmoContractResult = {
  id: string;
  deletedAt: Date;
};

@Injectable()
export class DeleteHmoContractUsecase extends Usecase<
  TDeleteHmoContractResult,
  TDeleteHmoContractParams
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
    params: TDeleteHmoContractParams,
  ): Promise<TDeleteHmoContractResult> {
    const { id, providerId } = params;

    await this.hmoContractService.getHmoContractByDataOrFailIfNotExists(
      { where: { id, hmoProviderId: providerId } },
      em,
    );

    await this.hmoContractService.softDeleteHmoContract(id, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.HMO_CONTRACT_DELETED,
        module: EventModule.HMO_CONTRACT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { contractId: id, hmoProviderId: providerId },
      },
      em,
    );

    return {
      id,
      deletedAt: new Date(),
    };
  }
}
