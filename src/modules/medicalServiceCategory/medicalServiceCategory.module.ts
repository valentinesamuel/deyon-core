import { Module } from '@nestjs/common';
import { MedicalServiceCategoryController } from './controllers/medicalServiceCategory.controller';
import { FetchAllMedicalServiceCategoriesUsecase } from './usecases/fetchAllMedicalServiceCategories.uc';
import { CreateMedicalServiceCategoryUsecase } from './usecases/createMedicalServiceCategory.uc';
import { FetchMedicalServiceCategoryByIdUsecase } from './usecases/fetchMedicalServiceCategoryById.uc';
import { UpdateMedicalServiceCategoryUsecase } from './usecases/updateMedicalServiceCategory.uc';
import { MedicalServiceCategoryService } from './service/medicalServiceCategory.service';
import { MedicalServiceCategoryRepository } from '@adapters/repositories/medicalServiceCategory.repository';

@Module({
  controllers: [MedicalServiceCategoryController],
  providers: [
    FetchAllMedicalServiceCategoriesUsecase,
    CreateMedicalServiceCategoryUsecase,
    FetchMedicalServiceCategoryByIdUsecase,
    UpdateMedicalServiceCategoryUsecase,
    MedicalServiceCategoryService,
    MedicalServiceCategoryRepository,
  ],
})
export class MedicalServiceCategoryModule {}
