import { Module } from '@nestjs/common';
import { ShiftScheduleController } from './controllers/shiftSchedule.controller';
import { RosterController } from './controllers/roster.controller';
import { FetchAllShiftSchedulesUsecase } from './usecases/fetchAllShiftSchedules.uc';
import { CreateShiftScheduleUsecase } from './usecases/createShiftSchedule.uc';
import { FetchShiftScheduleByIdUsecase } from './usecases/fetchShiftScheduleById.uc';
import { UpdateShiftScheduleUsecase } from './usecases/updateShiftSchedule.uc';
import { DeleteShiftScheduleUsecase } from './usecases/deleteShiftSchedule.uc';
import { ShiftScheduleService } from './service/shiftSchedule.service';
import { ShiftScheduleRepository } from '@adapters/repositories/shiftSchedule.repository';
import { RosterService } from './service/roster.service';
import { RosterRepository } from '@adapters/repositories/roster.repository';
import { StaffShiftScheduleRepository } from '@adapters/repositories/staffShiftSchedule.repository';
import { CreateRosterUsecase } from './usecases/createRoster.uc';
import { FetchAllRostersUsecase } from './usecases/fetchAllRosters.uc';
import { FetchRosterByIdUsecase } from './usecases/fetchRosterById.uc';
import { UpdateRosterUsecase } from './usecases/updateRoster.uc';
import { PublishRosterUsecase } from './usecases/publishRoster.uc';
import { DeleteRosterUsecase } from './usecases/deleteRoster.uc';
import { AddRosterAssignmentUsecase } from './usecases/addRosterAssignment.uc';
import { RemoveRosterAssignmentUsecase } from './usecases/removeRosterAssignment.uc';

@Module({
  controllers: [ShiftScheduleController, RosterController],
  providers: [
    // ShiftSchedule
    FetchAllShiftSchedulesUsecase,
    CreateShiftScheduleUsecase,
    FetchShiftScheduleByIdUsecase,
    UpdateShiftScheduleUsecase,
    DeleteShiftScheduleUsecase,
    ShiftScheduleService,
    ShiftScheduleRepository,
    // Roster
    RosterService,
    RosterRepository,
    StaffShiftScheduleRepository,
    CreateRosterUsecase,
    FetchAllRostersUsecase,
    FetchRosterByIdUsecase,
    UpdateRosterUsecase,
    PublishRosterUsecase,
    DeleteRosterUsecase,
    AddRosterAssignmentUsecase,
    RemoveRosterAssignmentUsecase,
  ],
})
export class ShiftScheduleModule {}
