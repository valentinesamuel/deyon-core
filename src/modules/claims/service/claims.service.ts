import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ClaimRepository } from '@adapters/repositories/claim.repository';
import { ClaimItemRepository } from '@adapters/repositories/claimItem.repository';
import { Claim } from '@modules/core/entities/claim.entity';
import { ClaimItem } from '@modules/core/entities/claimItem.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    private readonly claimRepository: ClaimRepository,
    private readonly claimItemRepository: ClaimItemRepository,
  ) {}

  async createClaim(data: Partial<Claim>, em: EntityManager): Promise<Claim> {
    const claimNumber = await this.claimRepository.generateClaimNumber(em);
    return this.claimRepository.createClaim({ ...data, claimNumber }, em);
  }

  getClaimOrFail(options: FindResourceOptions<Claim>, em?: EntityManager): Promise<Claim> {
    return this.claimRepository.findOneOrFailIfNotExists(options, em);
  }

  updateClaim(criteria: { id: string }, data: Partial<Claim>, em?: EntityManager): Promise<Claim> {
    return this.claimRepository.updateExistingRecord(criteria, data as any, em);
  }

  createClaimItems(items: Partial<ClaimItem>[], em?: EntityManager): Promise<ClaimItem[]> {
    return this.claimItemRepository.createMany(items, em);
  }

  findItemsByClaimId(claimId: string, em?: EntityManager): Promise<ClaimItem[]> {
    return this.claimItemRepository.findByClaimId(claimId, em);
  }
}
