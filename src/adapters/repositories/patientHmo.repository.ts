import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { PatientHmo } from '@modules/core/entities/patientHmo.entity';

@Injectable()
export class PatientHmoRepository extends BaseRepository<PatientHmo> {
  private readonly logger = new Logger(PatientHmoRepository.name);

  constructor(@InjectRepository(PatientHmo) private readonly repo: Repository<PatientHmo>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  upsertPatientHmo(
    patientId: string,
    data: Partial<PatientHmo>,
    em?: EntityManager,
  ): Promise<PatientHmo> {
    const repo = em ? em.getRepository(PatientHmo) : this;
    const record = repo.create({ ...data, patientId });
    return repo.save(record);
  }

  findByPatientId(patientId: string, em?: EntityManager): Promise<PatientHmo | null> {
    const repo = em ? em.getRepository(PatientHmo) : this;
    return repo.findOne({ where: { patientId, isActive: true }, relations: ['hmoProvider'] });
  }
}
