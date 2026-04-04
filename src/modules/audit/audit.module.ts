import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller';
import { FetchAuditLogsUsecase } from './usecases/fetchAuditLogs.uc';
import { FetchAuditLogByIdUsecase } from './usecases/fetchAuditLogById.uc';

@Module({
  controllers: [AuditController],
  providers: [FetchAuditLogsUsecase, FetchAuditLogByIdUsecase],
})
export class AuditModule {}
