import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthAuditLog, AuthEventType } from '@modules/core/entities/authAuditLog.entity';

export interface AuditLogParams {
  staffId?: string;
  event: AuthEventType;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuthAuditLog)
    private readonly auditLogRepository: Repository<AuthAuditLog>,
  ) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      const entry = this.auditLogRepository.create({
        staffId: params.staffId ?? null,
        event: params.event,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata,
        success: params.success ?? true,
      });
      await this.auditLogRepository.save(entry);
    } catch (err) {
      // Audit must never break auth flow
      this.logger.error(
        'Failed to write audit log',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
