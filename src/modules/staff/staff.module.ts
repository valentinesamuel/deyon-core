import { Module } from '@nestjs/common';
import { StaffController } from './controllers/staff.controller';
import { FetchAllStaffUsecase } from './usecases/fetchAllStaff.uc';
import { FetchOneStaffUsecase } from './usecases/fetchOneStaff.uc';
import { UpdateStaffRoleUsecase } from './usecases/updateStaffRole.uc';
import { UpdateStaffUsecase } from './usecases/updateStaff.uc';
import { DeleteStaffUsecase } from './usecases/deleteStaff.uc';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { Broker } from '@broker/broker';
import { AuthModule } from '../auth/auth.module';
import { RequestContextService } from '@shared/context/requestContext.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffController],
  providers: [
    FetchAllStaffUsecase,
    FetchOneStaffUsecase,
    UpdateStaffRoleUsecase,
    UpdateStaffUsecase,
    DeleteStaffUsecase,
    StaffRepository,
    RoleRepository,
    Broker,
    RequestContextService,
  ],
})
export class StaffModule {}
