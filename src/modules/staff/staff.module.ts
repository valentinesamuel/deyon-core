import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from '../core/entities/staff.entity';
import { StaffController } from './controllers/staff.controller';
import { FetchAllStaffUsecase } from './usecases/fetchAllStaff.uc';
import { FetchOneStaffUsecase } from './usecases/fetchOneStaff.uc';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { Broker } from '@broker/broker';

@Module({
  imports: [TypeOrmModule.forFeature([Staff])],
  controllers: [StaffController],
  providers: [FetchAllStaffUsecase, FetchOneStaffUsecase, StaffRepository, Broker],
})
export class StaffModule {}
