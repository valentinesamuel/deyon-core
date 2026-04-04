import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { EpisodeService } from '../service/episode.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TRemoveDiagnosisParams = { id: string; diagId: string };
type TRemoveDiagnosisResult = { diagId: string; deletedAt: Date };

@Injectable()
export class RemoveDiagnosisUsecase extends Usecase<
  TRemoveDiagnosisResult,
  TRemoveDiagnosisParams
> {
  constructor(
    private readonly episodeService: EpisodeService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TRemoveDiagnosisParams,
  ): Promise<TRemoveDiagnosisResult> {
    const { id, diagId } = params;

    await this.episodeService.getDiagnosisOrFail(diagId, id, em);
    await this.episodeService.removeDiagnosis(diagId, em);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.EPISODE_DIAGNOSIS_REMOVED,
        module: EventModule.EPISODE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { episodeId: id, diagId },
      },
      em,
    );

    return { diagId, deletedAt: new Date() };
  }
}
