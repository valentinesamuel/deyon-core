import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { ProtocolBundle } from '@modules/core/entities/protocolBundles.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class ProtocolBundleRepository extends BaseRepository<ProtocolBundle> {
  private readonly logger = new Logger(ProtocolBundleRepository.name);

  constructor(@InjectRepository(ProtocolBundle) private readonly repo: Repository<ProtocolBundle>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createProtocolBundle(data: Partial<ProtocolBundle>, em?: EntityManager): Promise<ProtocolBundle> {
    const repo = em ? em.getRepository(ProtocolBundle) : this;
    const bundle = repo.create(data);
    return repo.save(bundle);
  }

  updateProtocolBundle(
    id: string,
    data: Partial<ProtocolBundle>,
    em?: EntityManager,
  ): Promise<ProtocolBundle> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<ProtocolBundle>,
      data as QueryDeepPartialEntity<ProtocolBundle>,
      entityManager,
    );
  }

  async softDeleteProtocolBundle(id: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(ProtocolBundle) : this;
    const bundle = await this.findOneOrFailIfNotExists({ where: { id } }, em);
    await repo.softRemove(bundle);
  }
}
