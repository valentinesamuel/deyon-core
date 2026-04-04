import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { PartnerLab } from '@modules/core/entities/partnerLab.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class PartnerLabRepository extends BaseRepository<PartnerLab> {
  private readonly logger = new Logger(PartnerLabRepository.name);

  constructor(@InjectRepository(PartnerLab) private readonly repo: Repository<PartnerLab>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createPartnerLab(data: Partial<PartnerLab>, em?: EntityManager) {
    const repo = em ? em.getRepository(PartnerLab) : this;
    const partnerLab = repo.create(data);
    return repo.save(partnerLab);
  }

  updatePartnerLab(id: string, data: Partial<PartnerLab>, em?: EntityManager): Promise<PartnerLab> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<PartnerLab>,
      data as QueryDeepPartialEntity<PartnerLab>,
      entityManager,
    );
  }
}
