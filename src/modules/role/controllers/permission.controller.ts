import { Broker } from '@broker/broker';
import { Controller, Get, Logger } from '@nestjs/common';
import { ListPermissionsUsecase } from '@modules/role/usecases/listPermissions.uc';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';

@Controller('permission')
export class PermissionController {
  private readonly logger = new Logger(PermissionController.name);

  constructor(
    private readonly serviceBroker: Broker,
    private readonly listPermissionsUsecase: ListPermissionsUsecase,
  ) {}

  @Get('')
  @RequirePermissions(['permission:read'])
  listPermissions() {
    return this.serviceBroker.runUsecases([this.listPermissionsUsecase], {});
  }
}
