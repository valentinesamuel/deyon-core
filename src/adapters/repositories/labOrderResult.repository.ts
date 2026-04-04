import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { LabOrderResult } from '@modules/core/entities/labOrderResult.entity';

@Injectable()
export class LabOrderResultRepository extends BaseRepository<LabOrderResult> {
  private readonly logger = new Logger(LabOrderResultRepository.name);

  constructor(@InjectRepository(LabOrderResult) private readonly repo: Repository<LabOrderResult>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createResult(data: Partial<LabOrderResult>, em?: EntityManager): Promise<LabOrderResult> {
    const repo = em ? em.getRepository(LabOrderResult) : this;
    const result = repo.create(data);
    return repo.save(result);
  }
}
