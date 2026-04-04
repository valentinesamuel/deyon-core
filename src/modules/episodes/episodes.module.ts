import { Module } from '@nestjs/common';
import { EpisodeController } from './controllers/episode.controller';
import { EpisodeService } from './service/episode.service';
import { EpisodeRepository } from '@adapters/repositories/episode.repository';
import { EpisodeDiagnosisRepository } from '@adapters/repositories/episodeDiagnosis.repository';
import { EpisodeLogRepository } from '@adapters/repositories/episodeLog.repository';
import { OpenEpisodeUsecase } from './usecases/openEpisode.uc';
import { FetchAllEpisodesUsecase } from './usecases/fetchAllEpisodes.uc';
import { FetchEpisodeByIdUsecase } from './usecases/fetchEpisodeById.uc';
import { UpdateEpisodeUsecase } from './usecases/updateEpisode.uc';
import { CloseEpisodeUsecase } from './usecases/closeEpisode.uc';
import { LockEpisodeUsecase } from './usecases/lockEpisode.uc';
import { UnlockEpisodeUsecase } from './usecases/unlockEpisode.uc';
import { AddDiagnosisUsecase } from './usecases/addDiagnosis.uc';
import { RemoveDiagnosisUsecase } from './usecases/removeDiagnosis.uc';

@Module({
  controllers: [EpisodeController],
  providers: [
    EpisodeService,
    EpisodeRepository,
    EpisodeDiagnosisRepository,
    EpisodeLogRepository,
    OpenEpisodeUsecase,
    FetchAllEpisodesUsecase,
    FetchEpisodeByIdUsecase,
    UpdateEpisodeUsecase,
    CloseEpisodeUsecase,
    LockEpisodeUsecase,
    UnlockEpisodeUsecase,
    AddDiagnosisUsecase,
    RemoveDiagnosisUsecase,
  ],
  exports: [EpisodeService],
})
export class EpisodesModule {}
