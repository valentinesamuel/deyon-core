import { Module } from '@nestjs/common';
import { DepartmentController } from './controllers/department.controller';
import { FetchAllDepartmentsUsecase } from './usecases/fetchAllDepartments.uc';
import { CreateDepartmentUsecase } from './usecases/createDepartment.uc';
import { FetchDepartmentByIdUsecase } from './usecases/fetchDepartmentById.uc';
import { UpdateDepartmentUsecase } from './usecases/updateDepartment.uc';
import { DepartmentService } from './service/department.service';
import { DepartmentRepository } from '@adapters/repositories/department.repository';

@Module({
  controllers: [DepartmentController],
  providers: [
    FetchAllDepartmentsUsecase,
    CreateDepartmentUsecase,
    FetchDepartmentByIdUsecase,
    UpdateDepartmentUsecase,
    DepartmentService,
    DepartmentRepository,
  ],
})
export class DepartmentModule {}
