import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { EpisodeService } from '../service/episode.service';
import { Episode } from '@modules/core/entities/episode.entity';
import { EpisodeDiagnosis } from '@modules/core/entities/episodeDiagnosis.entity';
import { EpisodeLog } from '@modules/core/entities/episodeLog.entity';

type TFetchEpisodeByIdParams = { id: string };
type TFetchEpisodeByIdResult = {
  episode: Episode;
  diagnoses: EpisodeDiagnosis[];
  timeline: EpisodeLog[];
};

@Injectable()
export class FetchEpisodeByIdUsecase extends Usecase<
  TFetchEpisodeByIdResult,
  TFetchEpisodeByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly episodeService: EpisodeService) {
    super();
  }

  async execute(
    _em: EntityManager,
    params: TFetchEpisodeByIdParams,
  ): Promise<TFetchEpisodeByIdResult> {
    const episode = await this.episodeService.getEpisodeOrFail(
      { where: { id: params.id }, relations: ['patient', 'vitals'] },
      _em,
    );
    const diagnoses = await this.episodeService.findDiagnosesByEpisode(params.id, _em);
    const timeline = await this.episodeService.findTimelineByEpisode(params.id, _em);
    return { episode, diagnoses, timeline };
  }
}
