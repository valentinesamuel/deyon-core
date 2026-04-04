import { Module } from '@nestjs/common';
import { MedicalServiceController } from './controllers/medicalService.controller';
import { FetchAllMedicalServicesUsecase } from './usecases/fetchAllMedicalServices.uc';
import { CreateMedicalServiceUsecase } from './usecases/createMedicalService.uc';
import { FetchMedicalServiceByIdUsecase } from './usecases/fetchMedicalServiceById.uc';
import { UpdateMedicalServiceUsecase } from './usecases/updateMedicalService.uc';
import { ToggleMedicalServiceStatusUsecase } from './usecases/toggleMedicalServiceStatus.uc';
import { FetchPendingServiceApprovalsUsecase } from './usecases/fetchPendingServiceApprovals.uc';
import { ReviewMedicalServiceApprovalUsecase } from './usecases/reviewMedicalServiceApproval.uc';
import { CreatePriceChangeRequestUsecase } from './usecases/createPriceChangeRequest.uc';
import { FetchAllPriceChangeRequestsUsecase } from './usecases/fetchAllPriceChangeRequests.uc';
import { ReviewPriceChangeRequestUsecase } from './usecases/reviewPriceChangeRequest.uc';
import { ResolvePriceUsecase } from './usecases/resolvePrice.uc';
import { MedicalServiceService } from './service/medicalService.service';
import { PriceChangeService } from './service/priceChange.service';
import { MedicalServiceRepository } from '@adapters/repositories/medicalService.repository';
import { PriceChangeRepository } from '@adapters/repositories/priceChange.repository';

@Module({
  controllers: [MedicalServiceController],
  providers: [
    // Usecases
    FetchAllMedicalServicesUsecase,
    CreateMedicalServiceUsecase,
    FetchMedicalServiceByIdUsecase,
    UpdateMedicalServiceUsecase,
    ToggleMedicalServiceStatusUsecase,
    FetchPendingServiceApprovalsUsecase,
    ReviewMedicalServiceApprovalUsecase,
    CreatePriceChangeRequestUsecase,
    FetchAllPriceChangeRequestsUsecase,
    ReviewPriceChangeRequestUsecase,
    ResolvePriceUsecase,

    // Services
    MedicalServiceService,
    PriceChangeService,

    // Repositories
    MedicalServiceRepository,
    PriceChangeRepository,
  ],
})
export class MedicalServiceModule {}
