import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { TestCatalog } from '@modules/core/entities/testCatalog.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class TestCatalogRepository extends BaseRepository<TestCatalog> {
  private readonly logger = new Logger(TestCatalogRepository.name);

  constructor(@InjectRepository(TestCatalog) private readonly repo: Repository<TestCatalog>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createTestCatalog(data: Partial<TestCatalog>, em?: EntityManager): Promise<TestCatalog> {
    const repo = em ? em.getRepository(TestCatalog) : this;
    const testCatalog = repo.create(data);
    return repo.save(testCatalog);
  }

  updateTestCatalog(
    id: string,
    data: Partial<TestCatalog>,
    em?: EntityManager,
  ): Promise<TestCatalog> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<TestCatalog>,
      data as QueryDeepPartialEntity<TestCatalog>,
      entityManager,
    );
  }
}
