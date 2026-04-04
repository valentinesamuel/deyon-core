import { Broker } from '@broker/broker';
import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllMedicalServiceCategoriesUsecase } from '../usecases/fetchAllMedicalServiceCategories.uc';
import { CreateMedicalServiceCategoryUsecase } from '../usecases/createMedicalServiceCategory.uc';
import { FetchMedicalServiceCategoryByIdUsecase } from '../usecases/fetchMedicalServiceCategoryById.uc';
import { UpdateMedicalServiceCategoryUsecase } from '../usecases/updateMedicalServiceCategory.uc';
import { CreateMedicalServiceCategoryDto } from '../dto/createMedicalServiceCategory.dto';
import { UpdateMedicalServiceCategoryDto } from '../dto/updateMedicalServiceCategory.dto';

@Controller('services/categories')
export class MedicalServiceCategoryController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllMedicalServiceCategoriesUsecase: FetchAllMedicalServiceCategoriesUsecase,
    private readonly createMedicalServiceCategoryUsecase: CreateMedicalServiceCategoryUsecase,
    private readonly fetchMedicalServiceCategoryByIdUsecase: FetchMedicalServiceCategoryByIdUsecase,
    private readonly updateMedicalServiceCategoryUsecase: UpdateMedicalServiceCategoryUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE_CATEGORY.LIST])
  async getAllMedicalServiceCategories(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllMedicalServiceCategoriesUsecase], {
      query,
    });
  }

  @Post('')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE_CATEGORY.CREATE])
  async createMedicalServiceCategory(@Body() dto: CreateMedicalServiceCategoryDto) {
    return this.serviceBroker.runUsecases([this.createMedicalServiceCategoryUsecase], dto);
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE_CATEGORY.READ])
  async getMedicalServiceCategoryById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchMedicalServiceCategoryByIdUsecase], { id });
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE_CATEGORY.UPDATE])
  async updateMedicalServiceCategory(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalServiceCategoryDto,
  ) {
    return this.serviceBroker.runUsecases([this.updateMedicalServiceCategoryUsecase], { id, dto });
  }
}
