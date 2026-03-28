import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { InviteToken } from '@modules/core/entities/inviteToken.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class InviteTokenRepository extends BaseRepository<InviteToken> {
  private readonly logger = new Logger(InviteTokenRepository.name);

  constructor(
    @InjectRepository(InviteToken)
    private readonly repo: Repository<InviteToken>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async createToken(data: Partial<InviteToken>, em?: EntityManager): Promise<InviteToken> {
    const repo = em ? em.getRepository(InviteToken) : this;
    const token = repo.create(data);
    return repo.save(token);
  }

  async findByTokenHashAndFailIfNotExist(
    tokenHash: string,
    em?: EntityManager,
  ): Promise<InviteToken> {
    const repo = em ? em.getRepository(InviteToken) : this;
    const token = await repo.findOne({ where: { tokenHash } });
    if (!token) {
      throw new NotFoundException('Invalid or expired invite token');
    }
    return token;
  }

  async markAsUsed(id: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(InviteToken) : this;
    await repo.update(id, { isUsed: true });
  }
}
