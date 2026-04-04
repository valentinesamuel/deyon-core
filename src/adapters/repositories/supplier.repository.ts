import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from './base.repository';
import { Supplier } from '@modules/core/entities/supplier.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, QueryDeepPartialEntity, Repository } from 'typeorm';

@Injectable()
export class SupplierRepository extends BaseRepository<Supplier> {
  private readonly logger = new Logger(SupplierRepository.name);

  constructor(@InjectRepository(Supplier) private readonly repo: Repository<Supplier>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createSupplier(data: Partial<Supplier>, em?: EntityManager) {
    const repo = em ? em.getRepository(Supplier) : this;
    const supplier = repo.create(data);
    return repo.save(supplier);
  }

  updateSupplier(id: string, data: Partial<Supplier>, em?: EntityManager): Promise<Supplier> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord(
      { id } as FindOptionsWhere<Supplier>,
      data as QueryDeepPartialEntity<Supplier>,
      entityManager,
    );
  }
}
