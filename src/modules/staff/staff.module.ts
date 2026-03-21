import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from '../core/entities/staff.entity';
import { Role } from '../core/entities/role.entity';
import { EventLog } from '../core/entities/eventLog.entity';
import { StaffController } from './controllers/staff.controller';
import { FetchAllStaffUsecase } from './usecases/fetchAllStaff.uc';
import { FetchOneStaffUsecase } from './usecases/fetchOneStaff.uc';
import { UpdateStaffRoleUsecase } from './usecases/updateStaffRole.uc';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { Broker } from '@broker/broker';
import { AuthModule } from '../auth/auth.module';
import { RequestContextService } from '@shared/context/requestContext.service';

@Module({
  imports: [TypeOrmModule.forFeature([Staff, Role, EventLog]), AuthModule],
  controllers: [StaffController],
  providers: [
    FetchAllStaffUsecase,
    FetchOneStaffUsecase,
    UpdateStaffRoleUsecase,
    StaffRepository,
    RoleRepository,
    Broker,
    RequestContextService,
  ],
})
export class StaffModule {}
