import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AddDiagnosisDto } from '../dto/addDiagnosis.dto';
import { EpisodeService } from '../service/episode.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { EpisodeDiagnosis } from '@modules/core/entities/episodeDiagnosis.entity';
import { EpisodeStatusEnum } from '@modules/core/entities/episode.entity';

type TAddDiagnosisParams = { id: string; dto: AddDiagnosisDto };
type TAddDiagnosisResult = { diagnosis: EpisodeDiagnosis };

@Injectable()
export class AddDiagnosisUsecase extends Usecase<TAddDiagnosisResult, TAddDiagnosisParams> {
  constructor(
    private readonly episodeService: EpisodeService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TAddDiagnosisParams): Promise<TAddDiagnosisResult> {
    const { id, dto } = params;

    const episode = await this.episodeService.getEpisodeOrFail({ where: { id } }, em);
    if (episode.status === EpisodeStatusEnum.LOCKED) {
      throw new BadRequestException('Cannot add diagnosis to a locked episode');
    }

    const actorId = this.requestContextService.getUserId();

    const diagnosis = await this.episodeService.addDiagnosis(
      {
        episodeId: id,
        medicalCodeId: dto.medicalCodeId,
        diagnosisType: dto.diagnosisType,
        diagnosedBy: actorId,
      } as Partial<EpisodeDiagnosis>,
      em,
    );

    await this.eventService.log(
      {
        actorId,
        event: EventType.EPISODE_DIAGNOSIS_ADDED,
        module: EventModule.EPISODE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { episodeId: id, medicalCodeId: dto.medicalCodeId },
      },
      em,
    );

    return { diagnosis };
  }
}
