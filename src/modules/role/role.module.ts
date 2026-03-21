import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../core/entities/role.entity';
import { Permission } from '../core/entities/permission.entity';
import { EventLog } from '../core/entities/eventLog.entity';
import { Staff } from '../core/entities/staff.entity';
import { AuthModule } from '../auth/auth.module';
import { RoleController } from './controllers/role.controller';
import { PermissionController } from './controllers/permission.controller';
import { RoleService } from './service/role.service';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { PermissionRepository } from '@adapters/repositories/permission.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { CreateRoleUsecase } from './usecases/createRole.uc';
import { ListRolesUsecase } from './usecases/listRoles.uc';
import { GetRoleByIdUsecase } from './usecases/getRoleById.uc';
import { UpdateRoleUsecase } from './usecases/updateRole.uc';
import { DeleteRoleUsecase } from './usecases/deleteRole.uc';
import { DeleteRoleWithBulkReassignUsecase } from './usecases/deleteRoleWithBulkReassign.uc';
import { DeleteRoleWithIndividualReassignUsecase } from './usecases/deleteRoleWithIndividualReassign.uc';
import { ListPermissionsUsecase } from './usecases/listPermissions.uc';
import { Broker } from '@broker/broker';
import { RequestContextService } from '@shared/context/requestContext.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, EventLog, Staff]), AuthModule],
  controllers: [RoleController, PermissionController],
  providers: [
    RoleService,
    RoleRepository,
    PermissionRepository,
    StaffRepository,
    CreateRoleUsecase,
    ListRolesUsecase,
    GetRoleByIdUsecase,
    UpdateRoleUsecase,
    DeleteRoleUsecase,
    DeleteRoleWithBulkReassignUsecase,
    DeleteRoleWithIndividualReassignUsecase,
    ListPermissionsUsecase,
    Broker,
    RequestContextService,
  ],
})
export class RoleModule {}
