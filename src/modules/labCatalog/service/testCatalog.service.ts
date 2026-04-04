import { TestCatalogRepository } from '@adapters/repositories/testCatalog.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TestCatalog } from '@modules/core/entities/testCatalog.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class TestCatalogService {
  private readonly logger = new Logger(TestCatalogService.name);

  constructor(private readonly testCatalogRepository: TestCatalogRepository) {}

  async createTestCatalog(data: Partial<TestCatalog>, em?: EntityManager) {
    return this.testCatalogRepository.createTestCatalog(data, em);
  }

  async getTestCatalogByDataOrFailIfNotExists(
    data: FindResourceOptions<TestCatalog>,
    em?: EntityManager,
  ) {
    return this.testCatalogRepository.findOneOrFailIfNotExists(data, em);
  }

  async getTestCatalogByDataOrFailIfExists(
    data: FindResourceOptions<TestCatalog>,
    em?: EntityManager,
  ) {
    return this.testCatalogRepository.findOneOrFailIfExists(data, em);
  }

  async updateTestCatalog(id: string, data: Partial<TestCatalog>, em?: EntityManager) {
    return this.testCatalogRepository.updateTestCatalog(id, data, em);
  }
}
