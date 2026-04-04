import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { EpisodeRepository } from '@adapters/repositories/episode.repository';
import { EpisodeDiagnosisRepository } from '@adapters/repositories/episodeDiagnosis.repository';
import { EpisodeLogRepository } from '@adapters/repositories/episodeLog.repository';
import { Episode, EpisodeStatusEnum } from '@modules/core/entities/episode.entity';
import { EpisodeDiagnosis } from '@modules/core/entities/episodeDiagnosis.entity';
import {
  EpisodeLog,
  EpisodeEventTypeEnum,
  EpisodeLogActorTypeEnum,
} from '@modules/core/entities/episodeLog.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class EpisodeService {
  private readonly logger = new Logger(EpisodeService.name);

  constructor(
    private readonly episodeRepository: EpisodeRepository,
    private readonly diagnosisRepository: EpisodeDiagnosisRepository,
    private readonly logRepository: EpisodeLogRepository,
  ) {}

  createEpisode(data: Partial<Episode>, em?: EntityManager) {
    return this.episodeRepository.createEpisode(data, em);
  }

  getEpisodeOrFail(options: FindResourceOptions<Episode>, em?: EntityManager) {
    return this.episodeRepository.findOneOrFailIfNotExists(options, em);
  }

  updateEpisode(id: string, data: Partial<Episode>, em?: EntityManager) {
    return this.episodeRepository.updateEpisode(id, data, em);
  }

  updateStatus(
    id: string,
    status: EpisodeStatusEnum,
    extra?: Partial<Episode>,
    em?: EntityManager,
  ) {
    return this.episodeRepository.updateEpisodeStatus(id, status, extra, em);
  }

  addDiagnosis(data: Partial<EpisodeDiagnosis>, em?: EntityManager) {
    return this.diagnosisRepository.createDiagnosis(data, em);
  }

  getDiagnosisOrFail(id: string, episodeId: string, em?: EntityManager) {
    return this.diagnosisRepository.findOneOrFailIfNotExists({ where: { id, episodeId } }, em);
  }

  removeDiagnosis(id: string, em?: EntityManager) {
    return this.diagnosisRepository.softDeleteDiagnosis(id, em);
  }

  findDiagnosesByEpisode(episodeId: string, em?: EntityManager) {
    return this.diagnosisRepository.findByEpisodeId(episodeId, em);
  }

  addLog(
    episodeId: string,
    eventType: EpisodeEventTypeEnum,
    description: string,
    actorId: string,
    actorType: EpisodeLogActorTypeEnum,
    em?: EntityManager,
  ) {
    return this.logRepository.createLog(
      { episodeId, eventType, description, actorId, actorType } as Partial<EpisodeLog>,
      em,
    );
  }

  findTimelineByEpisode(episodeId: string, em?: EntityManager) {
    return this.logRepository.findByEpisodeId(episodeId, em);
  }
}
