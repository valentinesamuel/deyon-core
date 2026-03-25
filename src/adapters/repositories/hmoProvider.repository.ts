import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { HmoProvider } from '@modules/core/entities/hmoProvider.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class HmoProviderRepository extends BaseRepository<HmoProvider> {
  private readonly logger = new Logger(HmoProviderRepository.name);

  constructor(@InjectRepository(HmoProvider) private readonly repo: Repository<HmoProvider>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createHmoProvider(data: Partial<HmoProvider>, em?: EntityManager) {
    const repo = em ? em.getRepository(HmoProvider) : this;
    const hmoProvider = repo.create(data);
    return repo.save(hmoProvider);
  }
}
