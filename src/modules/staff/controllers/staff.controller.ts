import { Controller, Get, Logger, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Broker } from '@broker/broker';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { PERMISSION } from '@shared/constants/permissions';
import { FetchAllStaffUsecase } from '../usecases/fetchAllStaff.uc';
import { FetchOneStaffUsecase } from '../usecases/fetchOneStaff.uc';
import { GetAllQueryDto, GetOneQueryDto } from '@shared/queryEngine';

@Controller('staff')
export class StaffController {
  private readonly logger = new Logger(StaffController.name);

  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllStaffUsecase: FetchAllStaffUsecase,
    private readonly fetchOneStaffUsecase: FetchOneStaffUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.STAFF.READ, PERMISSION.STAFF.LIST])
  fetchAllStaff(@Query() query: GetAllQueryDto, @Req() _req: Request) {
    return this.serviceBroker.runUsecases([this.fetchAllStaffUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.STAFF.READ])
  fetchOneStaff(@Param('id') id: string, @Query() query: GetOneQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchOneStaffUsecase], { id, query });
  }
}
