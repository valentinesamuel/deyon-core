import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { PatientVital } from '@modules/core/entities/patientVitals.entity';

@Injectable()
export class PatientVitalRepository extends BaseRepository<PatientVital> {
  private readonly logger = new Logger(PatientVitalRepository.name);

  constructor(@InjectRepository(PatientVital) private readonly repo: Repository<PatientVital>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createVital(data: Partial<PatientVital>, em?: EntityManager): Promise<PatientVital> {
    const repo = em ? em.getRepository(PatientVital) : this;
    const vital = repo.create(data);
    return repo.save(vital);
  }

  findByEpisodeId(episodeId: string, em?: EntityManager): Promise<PatientVital[]> {
    const repo = em ? em.getRepository(PatientVital) : this;
    return repo.find({ where: { episodeId }, order: { createdAt: 'DESC' } });
  }
}
