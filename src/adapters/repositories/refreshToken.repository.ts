import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { RefreshToken } from '@modules/core/entities/refreshToken.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class RefreshTokenRepository extends BaseRepository<RefreshToken> {
  private readonly logger = new Logger(RefreshTokenRepository.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async createToken(data: Partial<RefreshToken>, em?: EntityManager): Promise<RefreshToken> {
    const repo = em ? em.getRepository(RefreshToken) : this;
    const token = repo.create(data);
    return repo.save(token);
  }

  async findByTokenHash(tokenHash: string, em?: EntityManager): Promise<RefreshToken | null> {
    const repo = em ? em.getRepository(RefreshToken) : this;
    return repo.findOne({ where: { tokenHash } });
  }

  async revokeToken(tokenHash: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(RefreshToken) : this;
    await repo.update({ tokenHash }, { isRevoked: true });
  }

  async revokeFamily(familyId: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(RefreshToken) : this;
    await repo.update({ familyId }, { isRevoked: true });
  }

  async revokeAllForStaff(staffId: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(RefreshToken) : this;
    await repo.update({ staffId }, { isRevoked: true });
  }
}
