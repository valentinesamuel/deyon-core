import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LabReferralRepository } from '@adapters/repositories/labReferral.repository';
import { LabReferralItemRepository } from '@adapters/repositories/labReferralItem.repository';
import { LabReferral } from '@modules/core/entities/labReferral.entity';
import { LabReferralItem } from '@modules/core/entities/labReferralItem.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class LabReferralsService {
  private readonly logger = new Logger(LabReferralsService.name);

  constructor(
    private readonly labReferralRepository: LabReferralRepository,
    private readonly labReferralItemRepository: LabReferralItemRepository,
  ) {}

  async createReferral(data: Partial<LabReferral>, em: EntityManager): Promise<LabReferral> {
    const referenceNumber = await this.labReferralRepository.generateReferenceNumber(em);
    return this.labReferralRepository.createReferral({ ...data, referenceNumber }, em);
  }

  getReferralOrFail(
    options: FindResourceOptions<LabReferral>,
    em?: EntityManager,
  ): Promise<LabReferral> {
    return this.labReferralRepository.findOneOrFailIfNotExists(options, em);
  }

  updateReferral(
    criteria: { id: string },
    data: Partial<LabReferral>,
    em?: EntityManager,
  ): Promise<LabReferral> {
    return this.labReferralRepository.updateExistingRecord(criteria, data as any, em);
  }

  createItems(items: Partial<LabReferralItem>[], em?: EntityManager): Promise<LabReferralItem[]> {
    return this.labReferralItemRepository.createMany(items, em);
  }

  updateItem(
    criteria: { id: string },
    data: Partial<LabReferralItem>,
    em?: EntityManager,
  ): Promise<LabReferralItem> {
    return this.labReferralItemRepository.updateItem(criteria, data, em);
  }

  findItemsByReferralId(labReferralId: string, em?: EntityManager): Promise<LabReferralItem[]> {
    return this.labReferralItemRepository.findByReferralId(labReferralId, em);
  }
}
