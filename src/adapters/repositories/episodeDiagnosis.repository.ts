import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { EpisodeDiagnosis } from '@modules/core/entities/episodeDiagnosis.entity';

@Injectable()
export class EpisodeDiagnosisRepository extends BaseRepository<EpisodeDiagnosis> {
  private readonly logger = new Logger(EpisodeDiagnosisRepository.name);

  constructor(
    @InjectRepository(EpisodeDiagnosis) private readonly repo: Repository<EpisodeDiagnosis>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createDiagnosis(data: Partial<EpisodeDiagnosis>, em?: EntityManager): Promise<EpisodeDiagnosis> {
    const repo = em ? em.getRepository(EpisodeDiagnosis) : this;
    const diagnosis = repo.create(data);
    return repo.save(diagnosis);
  }

  findByEpisodeId(episodeId: string, em?: EntityManager): Promise<EpisodeDiagnosis[]> {
    const repo = em ? em.getRepository(EpisodeDiagnosis) : this;
    return repo.find({ where: { episodeId }, relations: ['medicalCode'] });
  }

  async softDeleteDiagnosis(id: string, em?: EntityManager): Promise<EpisodeDiagnosis> {
    const entityManager = em ?? this.manager;
    const diagnosis = await this.findOneOrFailIfNotExists({ where: { id } }, entityManager);
    return entityManager.getRepository(EpisodeDiagnosis).softRemove(diagnosis);
  }
}
