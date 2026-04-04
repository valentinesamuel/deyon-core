import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { ServiceCodeCatalog } from '@modules/core/entities/serviceCodeCatalog.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class ServiceCodeCatalogRepository extends BaseRepository<ServiceCodeCatalog> {
  private readonly logger = new Logger(ServiceCodeCatalogRepository.name);

  constructor(
    @InjectRepository(ServiceCodeCatalog)
    private readonly repo: Repository<ServiceCodeCatalog>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createServiceCodeCatalog(data: Partial<ServiceCodeCatalog>, em?: EntityManager) {
    const repo = em ? em.getRepository(ServiceCodeCatalog) : this;
    const serviceCodeCatalog = repo.create(data);
    return repo.save(serviceCodeCatalog);
  }

  async softDeleteServiceCodeCatalog(id: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(ServiceCodeCatalog) : this;
    const record = await repo.findOne({ where: { id } });
    if (!record) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException('Resource not found');
    }
    await repo.softRemove(record);
  }
}
