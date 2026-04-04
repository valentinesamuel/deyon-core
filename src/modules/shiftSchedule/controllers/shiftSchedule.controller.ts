import { Broker } from '@broker/broker';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllShiftSchedulesUsecase } from '../usecases/fetchAllShiftSchedules.uc';
import { CreateShiftScheduleUsecase } from '../usecases/createShiftSchedule.uc';
import { FetchShiftScheduleByIdUsecase } from '../usecases/fetchShiftScheduleById.uc';
import { UpdateShiftScheduleUsecase } from '../usecases/updateShiftSchedule.uc';
import { DeleteShiftScheduleUsecase } from '../usecases/deleteShiftSchedule.uc';
import { CreateShiftScheduleDto } from '../dto/createShiftSchedule.dto';
import { UpdateShiftScheduleDto } from '../dto/updateShiftSchedule.dto';

@Controller('shifts/schedules')
export class ShiftScheduleController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllShiftSchedulesUsecase: FetchAllShiftSchedulesUsecase,
    private readonly createShiftScheduleUsecase: CreateShiftScheduleUsecase,
    private readonly fetchShiftScheduleByIdUsecase: FetchShiftScheduleByIdUsecase,
    private readonly updateShiftScheduleUsecase: UpdateShiftScheduleUsecase,
    private readonly deleteShiftScheduleUsecase: DeleteShiftScheduleUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.SHIFT_SCHEDULE.LIST])
  async getAllShiftSchedules(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllShiftSchedulesUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.SHIFT_SCHEDULE.READ])
  async getShiftScheduleById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchShiftScheduleByIdUsecase], { id });
  }

  @Post('')
  @RequirePermissions([PERMISSION.SHIFT_SCHEDULE.CREATE])
  async createShiftSchedule(@Body() dto: CreateShiftScheduleDto) {
    return this.serviceBroker.runUsecases([this.createShiftScheduleUsecase], dto);
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.SHIFT_SCHEDULE.UPDATE])
  async updateShiftSchedule(@Param('id') id: string, @Body() dto: UpdateShiftScheduleDto) {
    return this.serviceBroker.runUsecases([this.updateShiftScheduleUsecase], { id, dto });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.SHIFT_SCHEDULE.DELETE])
  async deleteShiftSchedule(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteShiftScheduleUsecase], { id });
  }
}
