import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Consultation } from '@modules/core/entities/consultation.entity';

@Injectable()
export class ConsultationRepository extends BaseRepository<Consultation> {
  private readonly logger = new Logger(ConsultationRepository.name);

  constructor(@InjectRepository(Consultation) private readonly repo: Repository<Consultation>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createConsultation(data: Partial<Consultation>, em?: EntityManager): Promise<Consultation> {
    const repo = em ? em.getRepository(Consultation) : this;
    const consultation = repo.create(data);
    return repo.save(consultation);
  }

  findByEpisodeId(episodeId: string, em?: EntityManager): Promise<Consultation[]> {
    const repo = em ? em.getRepository(Consultation) : this;
    return repo.find({
      where: { episodeId },
      order: { createdAt: 'DESC' },
    });
  }
}
