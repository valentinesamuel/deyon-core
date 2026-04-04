import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { OpenShiftDto } from '../dto/openShift.dto';
import { CloseShiftDto } from '../dto/closeShift.dto';
import { OpenShiftUsecase } from '../usecases/openShift.uc';
import { FetchAllShiftsUsecase } from '../usecases/fetchAllShifts.uc';
import { FetchShiftByIdUsecase } from '../usecases/fetchShiftById.uc';
import { CloseShiftUsecase } from '../usecases/closeShift.uc';
import { FetchActiveShiftUsecase } from '../usecases/fetchActiveShift.uc';

@ApiTags('Shifts')
@Controller('shifts')
export class ShiftsController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly openShiftUsecase: OpenShiftUsecase,
    private readonly fetchAllShiftsUsecase: FetchAllShiftsUsecase,
    private readonly fetchShiftByIdUsecase: FetchShiftByIdUsecase,
    private readonly closeShiftUsecase: CloseShiftUsecase,
    private readonly fetchActiveShiftUsecase: FetchActiveShiftUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.SHIFT.OPEN])
  openShift(@Body() dto: OpenShiftDto) {
    return this.serviceBroker.runUsecases([this.openShiftUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.SHIFT.LIST])
  getAllShifts(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllShiftsUsecase], { query });
  }

  @Get('active')
  @RequirePermissions([PERMISSION.SHIFT.READ])
  getActiveShift() {
    return this.serviceBroker.runUsecases([this.fetchActiveShiftUsecase], {});
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.SHIFT.READ])
  getShiftById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchShiftByIdUsecase], { id });
  }

  @Patch(':id/close')
  @RequirePermissions([PERMISSION.SHIFT.CLOSE])
  closeShift(@Param('id') id: string, @Body() dto: CloseShiftDto) {
    return this.serviceBroker.runUsecases([this.closeShiftUsecase], { id, ...dto });
  }
}
