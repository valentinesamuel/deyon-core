import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { PersonalAccessToken } from '@modules/core/entities/personalAccessToken.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class PersonalAccessTokenRepository extends BaseRepository<PersonalAccessToken> {
  constructor(
    @InjectRepository(PersonalAccessToken)
    private readonly repo: Repository<PersonalAccessToken>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async createToken(
    data: Partial<PersonalAccessToken>,
    em?: EntityManager,
  ): Promise<PersonalAccessToken> {
    const repo = em ? em.getRepository(PersonalAccessToken) : this;
    const pat = repo.create(data);
    return repo.save(pat);
  }

  async findByTokenHash(
    tokenHash: string,
    em?: EntityManager,
  ): Promise<PersonalAccessToken | null> {
    const repo = em ? em.getRepository(PersonalAccessToken) : this;
    return repo.findOne({
      where: { tokenHash },
      relations: ['staff', 'staff.role', 'staff.role.permissions'],
    });
  }

  async findAllForStaff(staffId: string, em?: EntityManager): Promise<PersonalAccessToken[]> {
    const repo = em ? em.getRepository(PersonalAccessToken) : this;
    return repo.find({
      where: { staffId },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeById(
    id: string,
    staffId: string,
    em?: EntityManager,
  ): Promise<PersonalAccessToken | null> {
    const repo = em ? em.getRepository(PersonalAccessToken) : this;
    const pat = await repo.findOne({ where: { id, staffId } });
    if (!pat) return null;
    pat.isRevoked = true;
    return repo.save(pat);
  }

  async updateLastUsed(id: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(PersonalAccessToken) : this;
    await repo.update(id, { lastUsedAt: new Date() });
  }
}
