import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '@modules/core/entities/refreshToken.entity';

@Injectable()
export class RefreshTokenRepository extends Repository<RefreshToken> {
  private readonly logger = new Logger(RefreshTokenRepository.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async createToken(data: Partial<RefreshToken>): Promise<RefreshToken> {
    const token = this.create(data);
    return this.save(token);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }

  async revokeToken(tokenHash: string): Promise<void> {
    await this.repo.update({ tokenHash }, { isRevoked: true });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.repo.update({ familyId }, { isRevoked: true });
  }

  async revokeAllForStaff(staffId: string): Promise<void> {
    await this.repo.update({ staffId }, { isRevoked: true });
  }
}
