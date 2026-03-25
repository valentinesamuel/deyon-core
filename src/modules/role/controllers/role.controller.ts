import { Broker } from '@broker/broker';
import { Body, Controller, Delete, Get, Logger, Param, Patch, Post } from '@nestjs/common';

import { CreateRoleUsecase } from '@modules/role/usecases/createRole.uc';
import { ListRolesUsecase } from '@modules/role/usecases/listRoles.uc';
import { GetRoleByIdUsecase } from '@modules/role/usecases/getRoleById.uc';
import { UpdateRoleUsecase } from '@modules/role/usecases/updateRole.uc';
import { DeleteRoleUsecase } from '@modules/role/usecases/deleteRole.uc';
import { DeleteRoleWithBulkReassignUsecase } from '@modules/role/usecases/deleteRoleWithBulkReassign.uc';
import { DeleteRoleWithIndividualReassignUsecase } from '@modules/role/usecases/deleteRoleWithIndividualReassign.uc';
import { CreateRoleDto } from '@modules/role/dto/createRole.dto';
import { UpdateRoleDto } from '@modules/role/dto/updateRole.dto';
import { BulkReassignDto, IndividualReassignDto } from '@modules/role/dto/reassignStaff.dto';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { PERMISSION } from '@shared/constants/permissions';

@Controller('role')
export class RoleController {
  private readonly logger = new Logger(RoleController.name);

  constructor(
    private readonly serviceBroker: Broker,
    private readonly createRoleUsecase: CreateRoleUsecase,
    private readonly listRolesUsecase: ListRolesUsecase,
    private readonly getRoleByIdUsecase: GetRoleByIdUsecase,
    private readonly updateRoleUsecase: UpdateRoleUsecase,
    private readonly deleteRoleUsecase: DeleteRoleUsecase,
    private readonly deleteRoleWithBulkReassignUsecase: DeleteRoleWithBulkReassignUsecase,
    private readonly deleteRoleWithIndividualReassignUsecase: DeleteRoleWithIndividualReassignUsecase,
  ) {}

  @Post('')
  @RequirePermissions([PERMISSION.ROLE.CREATE])
  createRole(@Body() dto: CreateRoleDto) {
    return this.serviceBroker.runUsecases([this.createRoleUsecase], {
      params: dto,
    });
  }

  @Get('')
  @RequirePermissions([PERMISSION.ROLE.READ])
  listRoles() {
    return this.serviceBroker.runUsecases([this.listRolesUsecase], {});
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.ROLE.READ])
  getRoleById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.getRoleByIdUsecase], { id });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSION.ROLE.UPDATE])
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.serviceBroker.runUsecases([this.updateRoleUsecase], {
      id,
      params: dto,
    });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.ROLE.DELETE])
  deleteRole(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteRoleUsecase], {
      id,
    });
  }

  @Delete(':id/bulk-reassign')
  @RequirePermissions([PERMISSION.ROLE.DELETE])
  deleteRoleWithBulkReassign(@Param('id') id: string, @Body() dto: BulkReassignDto) {
    return this.serviceBroker.runUsecases([this.deleteRoleWithBulkReassignUsecase], {
      id,
      params: dto,
    });
  }

  @Delete(':id/individual-reassign')
  @RequirePermissions([PERMISSION.ROLE.DELETE])
  deleteRoleWithIndividualReassign(@Param('id') id: string, @Body() dto: IndividualReassignDto) {
    return this.serviceBroker.runUsecases([this.deleteRoleWithIndividualReassignUsecase], {
      id,
      params: dto,
    });
  }
}
