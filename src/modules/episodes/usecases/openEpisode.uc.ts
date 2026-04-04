import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { OpenEpisodeDto } from '../dto/openEpisode.dto';
import { EpisodeService } from '../service/episode.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Episode, EpisodeStatusEnum } from '@modules/core/entities/episode.entity';
import {
  EpisodeEventTypeEnum,
  EpisodeLogActorTypeEnum,
} from '@modules/core/entities/episodeLog.entity';

type TOpenEpisodeResult = { episode: Episode };

@Injectable()
export class OpenEpisodeUsecase extends Usecase<TOpenEpisodeResult, OpenEpisodeDto> {
  constructor(
    private readonly episodeService: EpisodeService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: OpenEpisodeDto): Promise<TOpenEpisodeResult> {
    const year = new Date().getFullYear();
    const seq: { nextval: string }[] = await em.query(`SELECT nextval('episode_number_seq')`);
    const episodeNumber = `EP-${year}-${String(seq[0].nextval).padStart(5, '0')}`;

    const episode = await this.episodeService.createEpisode(
      { ...params, episodeNumber, status: EpisodeStatusEnum.OPEN } as Partial<Episode>,
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.episodeService.addLog(
      episode.id,
      EpisodeEventTypeEnum.EPISODE_OPENED,
      'Episode opened',
      actorId,
      EpisodeLogActorTypeEnum.STAFF,
      em,
    );

    await this.eventService.log(
      {
        actorId,
        event: EventType.EPISODE_OPENED,
        module: EventModule.EPISODE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { episodeId: episode.id, episodeNumber },
      },
      em,
    );

    return { episode };
  }
}
