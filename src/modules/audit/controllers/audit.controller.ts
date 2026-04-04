import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAuditLogsUsecase } from '../usecases/fetchAuditLogs.uc';
import { FetchAuditLogByIdUsecase } from '../usecases/fetchAuditLogById.uc';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAuditLogsUsecase: FetchAuditLogsUsecase,
    private readonly fetchAuditLogByIdUsecase: FetchAuditLogByIdUsecase,
  ) {}

  @Get()
  @RequirePermissions([PERMISSION.AUDIT.LIST])
  getAuditLogs(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAuditLogsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.AUDIT.READ])
  getAuditLogById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchAuditLogByIdUsecase], { id });
  }
}
