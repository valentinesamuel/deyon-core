import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PrescriptionRepository } from '@adapters/repositories/prescription.repository';
import { PrescriptionItemRepository } from '@adapters/repositories/prescriptionItem.repository';
import { Prescription } from '@modules/core/entities/prescription.entity';
import { PrescriptionItem } from '@modules/core/entities/prescriptionItem.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class PrescriptionService {
  private readonly logger = new Logger(PrescriptionService.name);

  constructor(
    private readonly prescriptionRepository: PrescriptionRepository,
    private readonly prescriptionItemRepository: PrescriptionItemRepository,
  ) {}

  createPrescription(data: Partial<Prescription>, em?: EntityManager): Promise<Prescription> {
    return this.prescriptionRepository.createPrescription(data, em);
  }

  getPrescriptionOrFail(
    options: FindResourceOptions<Prescription>,
    em?: EntityManager,
  ): Promise<Prescription> {
    return this.prescriptionRepository.findOneOrFailIfNotExists(options, em);
  }

  updatePrescription(
    criteria: { id: string },
    data: Partial<Prescription>,
    em?: EntityManager,
  ): Promise<Prescription> {
    return this.prescriptionRepository.updateExistingRecord(criteria, data as any, em);
  }

  createPrescriptionItems(
    items: Partial<PrescriptionItem>[],
    em?: EntityManager,
  ): Promise<PrescriptionItem[]> {
    return this.prescriptionItemRepository.createMany(items, em);
  }

  getItemOrFail(
    options: FindResourceOptions<PrescriptionItem>,
    em?: EntityManager,
  ): Promise<PrescriptionItem> {
    return this.prescriptionItemRepository.findOneOrFailIfNotExists(options, em);
  }

  findItemsByPrescriptionId(
    prescriptionId: string,
    em?: EntityManager,
  ): Promise<PrescriptionItem[]> {
    return this.prescriptionItemRepository.findByPrescriptionId(prescriptionId, em);
  }
}
