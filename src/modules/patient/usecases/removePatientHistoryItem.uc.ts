import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PatientHistoryService } from '../service/patientHistory.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TRemovePatientHistoryParams = { id: string; historyId: string };
type TRemovePatientHistoryResult = { historyId: string; deletedAt: Date };

@Injectable()
export class RemovePatientHistoryItemUsecase extends Usecase<
  TRemovePatientHistoryResult,
  TRemovePatientHistoryParams
> {
  constructor(
    private readonly historyService: PatientHistoryService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TRemovePatientHistoryParams,
  ): Promise<TRemovePatientHistoryResult> {
    const { id, historyId } = params;

    await this.historyService.getHistoryItemOrFail(historyId, id, em);
    await this.historyService.softDeleteHistoryItem(historyId, em);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.PATIENT_HISTORY_REMOVED,
        module: EventModule.PATIENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { patientId: id, historyId },
      },
      em,
    );

    return { historyId, deletedAt: new Date() };
  }
}
