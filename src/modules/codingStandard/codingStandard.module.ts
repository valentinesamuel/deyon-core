import { Module } from '@nestjs/common';
import { CodingStandardController } from './controllers/codingStandard.controller';
import { FetchAllCodingStandardsUsecase } from './usecases/fetchAllCodingStandards.uc';
import { CreateCodingStandardUsecase } from './usecases/createCodingStandard.uc';
import { FetchCodingStandardByIdUsecase } from './usecases/fetchCodingStandardById.uc';
import { UpdateCodingStandardUsecase } from './usecases/updateCodingStandard.uc';
import { FetchMedicalCodesByStandardUsecase } from './usecases/fetchMedicalCodesByStandard.uc';
import { CreateMedicalCodeUsecase } from './usecases/createMedicalCode.uc';
import { FetchMedicalCodeByIdUsecase } from './usecases/fetchMedicalCodeById.uc';
import { UpdateMedicalCodeUsecase } from './usecases/updateMedicalCode.uc';
import { DeleteMedicalCodeUsecase } from './usecases/deleteMedicalCode.uc';
import { CodingStandardService } from './service/codingStandard.service';
import { MedicalCodeService } from './service/medicalCode.service';
import { CodingStandardRepository } from '@adapters/repositories/codingStandard.repository';
import { MedicalCodeRepository } from '@adapters/repositories/medicalCode.repository';

@Module({
  controllers: [CodingStandardController],
  providers: [
    FetchAllCodingStandardsUsecase,
    CreateCodingStandardUsecase,
    FetchCodingStandardByIdUsecase,
    UpdateCodingStandardUsecase,
    FetchMedicalCodesByStandardUsecase,
    CreateMedicalCodeUsecase,
    FetchMedicalCodeByIdUsecase,
    UpdateMedicalCodeUsecase,
    DeleteMedicalCodeUsecase,
    CodingStandardService,
    MedicalCodeService,
    CodingStandardRepository,
    MedicalCodeRepository,
  ],
})
export class CodingStandardModule {}
