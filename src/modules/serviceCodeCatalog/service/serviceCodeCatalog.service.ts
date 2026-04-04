import { ServiceCodeCatalogRepository } from '@adapters/repositories/serviceCodeCatalog.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ServiceCodeCatalog } from '@modules/core/entities/serviceCodeCatalog.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class ServiceCodeCatalogService {
  private readonly logger = new Logger(ServiceCodeCatalogService.name);

  constructor(private readonly serviceCodeCatalogRepository: ServiceCodeCatalogRepository) {}

  async createServiceCodeCatalog(data: Partial<ServiceCodeCatalog>, em?: EntityManager) {
    return this.serviceCodeCatalogRepository.createServiceCodeCatalog(data, em);
  }

  async getServiceCodeCatalogByDataOrFailIfNotExists(
    data: FindResourceOptions<ServiceCodeCatalog>,
    em?: EntityManager,
  ) {
    return this.serviceCodeCatalogRepository.findOneOrFailIfNotExists(data, em);
  }

  async softDeleteServiceCodeCatalog(id: string, em?: EntityManager) {
    return this.serviceCodeCatalogRepository.softDeleteServiceCodeCatalog(id, em);
  }
}
