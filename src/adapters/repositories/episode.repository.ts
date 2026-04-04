import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Episode, EpisodeStatusEnum } from '@modules/core/entities/episode.entity';

@Injectable()
export class EpisodeRepository extends BaseRepository<Episode> {
  private readonly logger = new Logger(EpisodeRepository.name);

  constructor(@InjectRepository(Episode) private readonly repo: Repository<Episode>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createEpisode(data: Partial<Episode>, em?: EntityManager): Promise<Episode> {
    const repo = em ? em.getRepository(Episode) : this;
    const episode = repo.create(data);
    return repo.save(episode);
  }

  updateEpisode(id: string, data: Partial<Episode>, em?: EntityManager): Promise<Episode> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord({ id }, data as any, entityManager);
  }

  updateEpisodeStatus(
    id: string,
    status: EpisodeStatusEnum,
    extra?: Partial<Episode>,
    em?: EntityManager,
  ): Promise<Episode> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord({ id }, { status, ...extra } as any, entityManager);
  }
}
