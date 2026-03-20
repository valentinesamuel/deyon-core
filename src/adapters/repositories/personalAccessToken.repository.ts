import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalAccessToken } from '@modules/core/entities/personalAccessToken.entity';

@Injectable()
export class PersonalAccessTokenRepository extends Repository<PersonalAccessToken> {
  constructor(
    @InjectRepository(PersonalAccessToken)
    private readonly repo: Repository<PersonalAccessToken>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async createToken(data: Partial<PersonalAccessToken>): Promise<PersonalAccessToken> {
    const pat = this.create(data);
    return this.save(pat);
  }

  async findByTokenHash(tokenHash: string): Promise<PersonalAccessToken | null> {
    return this.repo.findOne({
      where: { tokenHash },
      relations: ['staff', 'staff.role', 'staff.role.permissions'],
    });
  }

  async findAllForStaff(staffId: string): Promise<PersonalAccessToken[]> {
    return this.repo.find({
      where: { staffId },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeById(id: string, staffId: string): Promise<PersonalAccessToken | null> {
    const pat = await this.repo.findOne({ where: { id, staffId } });
    if (!pat) return null;
    pat.isRevoked = true;
    return this.save(pat);
  }

  async updateLastUsed(id: string): Promise<void> {
    await this.repo.update(id, { lastUsedAt: new Date() });
  }
}
