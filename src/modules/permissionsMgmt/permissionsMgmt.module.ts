import { Module } from '@nestjs/common';
import { PermissionsMgmtController } from './controllers/permissionsMgmt.controller';
import { PermissionsMgmtService } from './service/permissionsMgmt.service';
import { StaffPermissionOverrideRepository } from '@adapters/repositories/staffPermissionOverride.repository';
import { GetStaffPermissionsUsecase } from './usecases/getStaffPermissions.uc';
import { GrantPermissionUsecase } from './usecases/grantPermission.uc';
import { RevokePermissionUsecase } from './usecases/revokePermission.uc';

@Module({
  controllers: [PermissionsMgmtController],
  providers: [
    PermissionsMgmtService,
    StaffPermissionOverrideRepository,
    GetStaffPermissionsUsecase,
    GrantPermissionUsecase,
    RevokePermissionUsecase,
  ],
  exports: [PermissionsMgmtService],
})
export class PermissionsMgmtModule {}
