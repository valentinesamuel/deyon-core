import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { LabReferral } from '@modules/core/entities/labReferral.entity';

@Injectable()
export class LabReferralRepository extends BaseRepository<LabReferral> {
  constructor(@InjectRepository(LabReferral) private readonly repo: Repository<LabReferral>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createReferral(data: Partial<LabReferral>, em?: EntityManager): Promise<LabReferral> {
    const repo = em ? em.getRepository(LabReferral) : this;
    const referral = repo.create(data);
    return repo.save(referral);
  }

  async generateReferenceNumber(em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const result = await em.query(`SELECT nextval('lab_referral_seq') AS seq`);
    const seq = String(result[0].seq).padStart(5, '0');
    return `REF-${year}-${seq}`;
  }
}
