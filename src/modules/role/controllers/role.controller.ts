import { Broker } from '@broker/broker';
import { Body, Controller, Logger, Post, Req } from '@nestjs/common';
import { Request } from 'express';

import { CreateRoleUsecase } from '@modules/role/usecases/createRole.uc';
import { CreateRoleDto } from '@modules/role/dto/createRole.dto';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';

@Controller('role')
export class RoleController {
  private readonly logger = new Logger(RoleController.name);

  constructor(
    private readonly serviceBroker: Broker,
    private readonly createRoleUsecase: CreateRoleUsecase,
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
}
