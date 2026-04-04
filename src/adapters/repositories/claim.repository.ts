import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Claim } from '@modules/core/entities/claim.entity';

@Injectable()
export class ClaimRepository extends BaseRepository<Claim> {
  constructor(@InjectRepository(Claim) private readonly repo: Repository<Claim>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createClaim(data: Partial<Claim>, em?: EntityManager): Promise<Claim> {
    const repo = em ? em.getRepository(Claim) : this;
    const claim = repo.create(data);
    return repo.save(claim);
  }

  async generateClaimNumber(em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const result = await em.query(`SELECT nextval('claim_number_seq') AS seq`);
    const seq = String(result[0].seq).padStart(5, '0');
    return `CLM-${year}-${seq}`;
  }
}
