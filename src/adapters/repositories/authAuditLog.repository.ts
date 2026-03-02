import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthAuditLog } from '@modules/core/entities/authAuditLog.entity';

@Injectable()
export class AuthAuditLogRepository extends Repository<AuthAuditLog> {
  private readonly logger = new Logger(AuthAuditLogRepository.name);

  constructor(
    @InjectRepository(AuthAuditLog)
    private readonly repo: Repository<AuthAuditLog>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async nullifyStaffId(staffId: string): Promise<void> {
    await this.repo.update({ staffId }, { staffId: null });
  }
}
