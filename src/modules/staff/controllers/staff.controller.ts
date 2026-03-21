import { Body, Controller, Get, Logger, Param, Patch, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Broker } from '@broker/broker';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { PERMISSION } from '@shared/constants/permissions';
import { FetchAllStaffUsecase } from '../usecases/fetchAllStaff.uc';
import { FetchOneStaffUsecase } from '../usecases/fetchOneStaff.uc';
import { UpdateStaffRoleUsecase } from '../usecases/updateStaffRole.uc';
import { UpdateStaffRoleDto } from '../dto/updateStaffRole.dto';
import { GetAllQueryDto, GetOneQueryDto } from '@shared/queryEngine';

@Controller('staff')
export class StaffController {
  private readonly logger = new Logger(StaffController.name);

  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllStaffUsecase: FetchAllStaffUsecase,
    private readonly fetchOneStaffUsecase: FetchOneStaffUsecase,
    private readonly updateStaffRoleUsecase: UpdateStaffRoleUsecase,
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

  @Patch(':id/role')
  @RequirePermissions([PERMISSION.STAFF.UPDATE])
  updateStaffRole(
    @Param('id') staffId: string,
    @Body() dto: UpdateStaffRoleDto,
    @Req() req: Request,
  ) {
    return this.serviceBroker.runUsecases([this.updateStaffRoleUsecase], {
      staffId,
      params: dto,
      metadata: {
        requestMetadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      },
    });
  }
}
