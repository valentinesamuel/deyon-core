import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { EpisodeService } from '../service/episode.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Episode, EpisodeStatusEnum } from '@modules/core/entities/episode.entity';
import {
  EpisodeEventTypeEnum,
  EpisodeLogActorTypeEnum,
} from '@modules/core/entities/episodeLog.entity';

type TParams = { id: string };
type TResult = { episode: Episode };

@Injectable()
export class LockEpisodeUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly episodeService: EpisodeService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const { id } = params;

    const existing = await this.episodeService.getEpisodeOrFail({ where: { id } }, em);
    if (existing.status !== EpisodeStatusEnum.CLOSED) {
      throw new BadRequestException('Only closed episodes can be locked for audit');
    }

    const episode = await this.episodeService.updateStatus(
      id,
      EpisodeStatusEnum.LOCKED,
      { isLockedForAudit: true },
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.episodeService.addLog(
      id,
      EpisodeEventTypeEnum.EPISODE_LOCKED,
      'Episode locked for audit',
      actorId,
      EpisodeLogActorTypeEnum.STAFF,
      em,
    );

    await this.eventService.log(
      {
        actorId,
        event: EventType.EPISODE_LOCKED,
        module: EventModule.EPISODE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { episodeId: id },
      },
      em,
    );

    return { episode };
  }
}
