import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateEpisodeDto } from '../dto/updateEpisode.dto';
import { EpisodeService } from '../service/episode.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Episode } from '@modules/core/entities/episode.entity';

type TUpdateEpisodeParams = { id: string; dto: UpdateEpisodeDto };
type TUpdateEpisodeResult = { episode: Episode };

@Injectable()
export class UpdateEpisodeUsecase extends Usecase<TUpdateEpisodeResult, TUpdateEpisodeParams> {
  constructor(
    private readonly episodeService: EpisodeService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TUpdateEpisodeParams): Promise<TUpdateEpisodeResult> {
    const { id, dto } = params;
    const episode = await this.episodeService.updateEpisode(id, dto as Partial<Episode>, em);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.EPISODE_UPDATED,
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
