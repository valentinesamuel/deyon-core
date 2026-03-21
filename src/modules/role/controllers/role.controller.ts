import { Broker } from '@broker/broker';
import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';

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
  @RequirePermissions(['role:create'])
  createRole(@Body() dto: CreateRoleDto, @Req() req: Request) {
    return this.serviceBroker.runUsecases([this.createRoleUsecase], {
      params: dto,
      metadata: {
        requestMetadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      },
    });
  }

  @Get('')
  @RequirePermissions(['role:read'])
  listRoles() {
    return this.serviceBroker.runUsecases([this.listRolesUsecase], {});
  }

  @Get(':id')
  @RequirePermissions(['role:read'])
  getRoleById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.getRoleByIdUsecase], { id });
  }

  @Patch(':id')
  @RequirePermissions(['role:update'])
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto, @Req() req: Request) {
    return this.serviceBroker.runUsecases([this.updateRoleUsecase], {
      id,
      params: dto,
      metadata: {
        requestMetadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      },
    });
  }

  @Delete(':id')
  @RequirePermissions(['role:delete'])
  deleteRole(@Param('id') id: string, @Req() req: Request) {
    return this.serviceBroker.runUsecases([this.deleteRoleUsecase], {
      id,
      metadata: {
        requestMetadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      },
    });
  }

  @Delete(':id/bulk-reassign')
  @RequirePermissions(['role:delete'])
  deleteRoleWithBulkReassign(
    @Param('id') id: string,
    @Body() dto: BulkReassignDto,
    @Req() req: Request,
  ) {
    return this.serviceBroker.runUsecases([this.deleteRoleWithBulkReassignUsecase], {
      id,
      params: dto,
      metadata: {
        requestMetadata: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      },
    });
  }

  @Delete(':id/individual-reassign')
  @RequirePermissions(['role:delete'])
  deleteRoleWithIndividualReassign(
    @Param('id') id: string,
    @Body() dto: IndividualReassignDto,
    @Req() req: Request,
  ) {
    return this.serviceBroker.runUsecases([this.deleteRoleWithIndividualReassignUsecase], {
      id,
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
