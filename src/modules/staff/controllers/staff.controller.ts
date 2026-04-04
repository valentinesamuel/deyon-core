import { Body, Controller, Delete, Get, Logger, Param, Patch, Put, Query } from '@nestjs/common';
import { Broker } from '@broker/broker';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { PERMISSION } from '@shared/constants/permissions';
import { FetchAllStaffUsecase } from '../usecases/fetchAllStaff.uc';
import { FetchOneStaffUsecase } from '../usecases/fetchOneStaff.uc';
import { UpdateStaffRoleUsecase } from '../usecases/updateStaffRole.uc';
import { UpdateStaffRoleDto } from '../dto/updateStaffRole.dto';
import { UpdateStaffDto } from '../dto/updateStaff.dto';
import { GetAllQueryDto, GetOneQueryDto } from '@shared/queryEngine';
import { UpdateStaffUsecase } from '../usecases/updateStaff.uc';
import { DeleteStaffUsecase } from '../usecases/deleteStaff.uc';

@Controller('staff')
export class StaffController {
  private readonly logger = new Logger(StaffController.name);

  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllStaffUsecase: FetchAllStaffUsecase,
    private readonly fetchOneStaffUsecase: FetchOneStaffUsecase,
    private readonly updateStaffRoleUsecase: UpdateStaffRoleUsecase,
    private readonly updateStaffUsecase: UpdateStaffUsecase,
    private readonly deleteStaffUsecase: DeleteStaffUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.STAFF.READ, PERMISSION.STAFF.LIST])
  fetchAllStaff(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllStaffUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.STAFF.READ])
  fetchOneStaff(@Param('id') id: string, @Query() query: GetOneQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchOneStaffUsecase], { id, query });
  }

  @Patch(':id/role')
  @RequirePermissions([PERMISSION.STAFF.UPDATE])
  updateStaffRole(@Param('id') staffId: string, @Body() dto: UpdateStaffRoleDto) {
    return this.serviceBroker.runUsecases([this.updateStaffRoleUsecase], {
      staffId,
      params: dto,
    });
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.STAFF.UPDATE])
  updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.serviceBroker.runUsecases([this.updateStaffUsecase], { id, dto });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.STAFF.DEACTIVATE])
  deleteStaff(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteStaffUsecase], { id });
  }
}
