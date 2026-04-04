import { Module } from '@nestjs/common';
import { ShiftsController } from './controllers/shifts.controller';
import { ShiftsService } from './service/shifts.service';
import { ShiftRepository } from '@adapters/repositories/shift.repository';
import { OpenShiftUsecase } from './usecases/openShift.uc';
import { FetchAllShiftsUsecase } from './usecases/fetchAllShifts.uc';
import { FetchShiftByIdUsecase } from './usecases/fetchShiftById.uc';
import { CloseShiftUsecase } from './usecases/closeShift.uc';
import { FetchActiveShiftUsecase } from './usecases/fetchActiveShift.uc';

@Module({
  controllers: [ShiftsController],
  providers: [
    ShiftsService,
    ShiftRepository,
    OpenShiftUsecase,
    FetchAllShiftsUsecase,
    FetchShiftByIdUsecase,
    CloseShiftUsecase,
    FetchActiveShiftUsecase,
  ],
  exports: [ShiftsService],
})
export class ShiftsModule {}
