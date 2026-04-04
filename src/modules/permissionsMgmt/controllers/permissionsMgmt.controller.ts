import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GrantPermissionDto } from '../dto/grantPermission.dto';
import { GetStaffPermissionsUsecase } from '../usecases/getStaffPermissions.uc';
import { GrantPermissionUsecase } from '../usecases/grantPermission.uc';
import { RevokePermissionUsecase } from '../usecases/revokePermission.uc';

@ApiTags('Permissions Management')
@Controller('permissions')
export class PermissionsMgmtController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly getStaffPermissionsUsecase: GetStaffPermissionsUsecase,
    private readonly grantPermissionUsecase: GrantPermissionUsecase,
    private readonly revokePermissionUsecase: RevokePermissionUsecase,
  ) {}

  @Get('staff/:staffId')
  @RequirePermissions([PERMISSION.PERMISSIONS_MGMT.READ])
  getStaffPermissions(@Param('staffId') staffId: string) {
    return this.serviceBroker.runUsecases([this.getStaffPermissionsUsecase], { staffId });
  }

  @Post('staff/:staffId/grant')
  @RequirePermissions([PERMISSION.PERMISSIONS_MGMT.GRANT])
  grantPermission(@Param('staffId') staffId: string, @Body() dto: GrantPermissionDto) {
    return this.serviceBroker.runUsecases([this.grantPermissionUsecase], { staffId, ...dto });
  }

  @Delete('staff/:staffId/revoke/:permissionCode')
  @RequirePermissions([PERMISSION.PERMISSIONS_MGMT.REVOKE])
  revokePermission(
    @Param('staffId') staffId: string,
    @Param('permissionCode') permissionCode: string,
  ) {
    return this.serviceBroker.runUsecases([this.revokePermissionUsecase], {
      staffId,
      permissionCode,
    });
  }
}
