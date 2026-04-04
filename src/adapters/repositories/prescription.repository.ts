import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Prescription } from '@modules/core/entities/prescription.entity';

@Injectable()
export class PrescriptionRepository extends BaseRepository<Prescription> {
  private readonly logger = new Logger(PrescriptionRepository.name);

  constructor(@InjectRepository(Prescription) private readonly repo: Repository<Prescription>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createPrescription(data: Partial<Prescription>, em?: EntityManager): Promise<Prescription> {
    const repo = em ? em.getRepository(Prescription) : this;
    const prescription = repo.create(data);
    return repo.save(prescription);
  }
}
