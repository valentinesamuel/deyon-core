import { Controller, Get, Logger, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Broker } from '@broker/broker';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { PERMISSION } from '@shared/constants/permissions';
import { FetchAllStaffUsecase } from '../usecases/fetchAllStaff.uc';
import { GetAllQueryDto } from '../../../query-engine';

@Controller('staff')
export class StaffController {
  private readonly logger = new Logger(StaffController.name);

  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllStaffUsecase: FetchAllStaffUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.STAFF.READ, PERMISSION.STAFF.LIST])
  fetchAllStaff(@Query() query: GetAllQueryDto, @Req() _req: Request) {
    return this.serviceBroker.runUsecases([this.fetchAllStaffUsecase], { query });
  }
}
