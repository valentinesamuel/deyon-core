import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InviteToken } from '@modules/core/entities/inviteToken.entity';

@Injectable()
export class InviteTokenRepository extends Repository<InviteToken> {
  private readonly logger = new Logger(InviteTokenRepository.name);

  constructor(
    @InjectRepository(InviteToken)
    private readonly repo: Repository<InviteToken>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async createToken(data: Partial<InviteToken>): Promise<InviteToken> {
    const token = this.create(data);
    return this.save(token);
  }

  async findByTokenHashAndFailIfNotExist(tokenHash: string): Promise<InviteToken> {
    const token = await this.repo.findOne({ where: { tokenHash } });
    if (!token) {
      throw new NotFoundException('Invalid or expired invite token');
    }
    return token;
  }

  async markAsUsed(id: string): Promise<void> {
    await this.repo.update(id, { isUsed: true });
  }
}
