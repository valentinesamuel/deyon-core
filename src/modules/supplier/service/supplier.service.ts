import { SupplierRepository } from '@adapters/repositories/supplier.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Supplier } from '@modules/core/entities/supplier.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(private readonly supplierRepository: SupplierRepository) {}

  async createSupplier(data: Partial<Supplier>, em?: EntityManager) {
    return this.supplierRepository.createSupplier(data, em);
  }

  async getSupplierByDataOrFailIfNotExists(
    data: FindResourceOptions<Supplier>,
    em?: EntityManager,
  ) {
    return this.supplierRepository.findOneOrFailIfNotExists(data, em);
  }

  async getSupplierByDataOrFailIfExists(data: FindResourceOptions<Supplier>, em?: EntityManager) {
    return this.supplierRepository.findOneOrFailIfExists(data, em);
  }

  async updateSupplier(id: string, data: Partial<Supplier>, em?: EntityManager) {
    return this.supplierRepository.updateSupplier(id, data, em);
  }
}
