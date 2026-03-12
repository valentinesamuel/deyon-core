import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { Staff } from '../core/entities/staff.entity';
import { StaffController } from './controllers/staff.controller';
import { FetchAllStaffUsecase } from './usecases/fetchAllStaff.uc';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { Broker } from '@broker/broker';

@Module({
  imports: [TypeOrmModule.forFeature([Staff]), ClsModule],
  controllers: [StaffController],
  providers: [FetchAllStaffUsecase, StaffRepository, Broker],
})
export class StaffModule {}
