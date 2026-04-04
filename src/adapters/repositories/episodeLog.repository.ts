import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { EpisodeLog } from '@modules/core/entities/episodeLog.entity';

@Injectable()
export class EpisodeLogRepository extends BaseRepository<EpisodeLog> {
  private readonly logger = new Logger(EpisodeLogRepository.name);

  constructor(@InjectRepository(EpisodeLog) private readonly repo: Repository<EpisodeLog>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createLog(data: Partial<EpisodeLog>, em?: EntityManager): Promise<EpisodeLog> {
    const repo = em ? em.getRepository(EpisodeLog) : this;
    const log = repo.create(data);
    return repo.save(log);
  }

  findByEpisodeId(episodeId: string, em?: EntityManager): Promise<EpisodeLog[]> {
    const repo = em ? em.getRepository(EpisodeLog) : this;
    return repo.find({ where: { episodeId }, order: { createdAt: 'ASC' } });
  }
}
