import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { HmoContract } from '@modules/core/entities/hmoContract.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class HmoContractRepository extends BaseRepository<HmoContract> {
  private readonly logger = new Logger(HmoContractRepository.name);

  constructor(@InjectRepository(HmoContract) private readonly repo: Repository<HmoContract>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createHmoContract(data: Partial<HmoContract>, em?: EntityManager): Promise<HmoContract> {
    const repo = em ? em.getRepository(HmoContract) : this;
    const contract = repo.create(data);
    return repo.save(contract);
  }

  updateHmoContract(
    id: string,
    data: Partial<HmoContract>,
    em?: EntityManager,
  ): Promise<HmoContract> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<HmoContract>,
      data as QueryDeepPartialEntity<HmoContract>,
      entityManager,
    );
  }

  async softDeleteHmoContract(id: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(HmoContract) : this;
    const contract = await this.findOneOrFailIfNotExists({ where: { id } }, em);
    await repo.softRemove(contract);
  }
}
