import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { ProtocolBundleItems } from '@modules/core/entities/protocolBundleItems.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class ProtocolBundleItemRepository extends BaseRepository<ProtocolBundleItems> {
  private readonly logger = new Logger(ProtocolBundleItemRepository.name);

  constructor(
    @InjectRepository(ProtocolBundleItems)
    private readonly repo: Repository<ProtocolBundleItems>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createProtocolBundleItem(
    data: Partial<ProtocolBundleItems>,
    em?: EntityManager,
  ): Promise<ProtocolBundleItems> {
    const repo = em ? em.getRepository(ProtocolBundleItems) : this;
    const item = repo.create(data);
    return repo.save(item);
  }

  async softDeleteProtocolBundleItem(id: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(ProtocolBundleItems) : this;
    const item = await this.findOneOrFailIfNotExists({ where: { id } }, em);
    await repo.softRemove(item);
  }
}
