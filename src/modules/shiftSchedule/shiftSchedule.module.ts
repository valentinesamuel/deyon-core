import { Module } from '@nestjs/common';
import { ShiftScheduleController } from './controllers/shiftSchedule.controller';
import { FetchAllShiftSchedulesUsecase } from './usecases/fetchAllShiftSchedules.uc';
import { CreateShiftScheduleUsecase } from './usecases/createShiftSchedule.uc';
import { FetchShiftScheduleByIdUsecase } from './usecases/fetchShiftScheduleById.uc';
import { UpdateShiftScheduleUsecase } from './usecases/updateShiftSchedule.uc';
import { DeleteShiftScheduleUsecase } from './usecases/deleteShiftSchedule.uc';
import { ShiftScheduleService } from './service/shiftSchedule.service';
import { ShiftScheduleRepository } from '@adapters/repositories/shiftSchedule.repository';

@Module({
  controllers: [ShiftScheduleController],
  providers: [
    FetchAllShiftSchedulesUsecase,
    CreateShiftScheduleUsecase,
    FetchShiftScheduleByIdUsecase,
    UpdateShiftScheduleUsecase,
    DeleteShiftScheduleUsecase,
    ShiftScheduleService,
    ShiftScheduleRepository,
  ],
})
export class ShiftScheduleModule {}
