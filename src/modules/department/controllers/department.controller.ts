import { Broker } from '@broker/broker';
import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllDepartmentsUsecase } from '../usecases/fetchAllDepartments.uc';
import { CreateDepartmentUsecase } from '../usecases/createDepartment.uc';
import { FetchDepartmentByIdUsecase } from '../usecases/fetchDepartmentById.uc';
import { UpdateDepartmentUsecase } from '../usecases/updateDepartment.uc';
import { CreateDepartmentDto } from '../dto/createDepartment.dto';
import { UpdateDepartmentDto } from '../dto/updateDepartment.dto';

@Controller('departments')
export class DepartmentController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllDepartmentsUsecase: FetchAllDepartmentsUsecase,
    private readonly createDepartmentUsecase: CreateDepartmentUsecase,
    private readonly fetchDepartmentByIdUsecase: FetchDepartmentByIdUsecase,
    private readonly updateDepartmentUsecase: UpdateDepartmentUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.DEPARTMENT.LIST])
  async getAllDepartments(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllDepartmentsUsecase], { query });
  }

  @Post('')
  @RequirePermissions([PERMISSION.DEPARTMENT.CREATE])
  async createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.serviceBroker.runUsecases([this.createDepartmentUsecase], dto);
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.DEPARTMENT.READ])
  async getDepartmentById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchDepartmentByIdUsecase], { id });
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.DEPARTMENT.UPDATE])
  async updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.serviceBroker.runUsecases([this.updateDepartmentUsecase], { id, dto });
  }
}
