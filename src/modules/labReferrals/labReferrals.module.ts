import { Module } from '@nestjs/common';
import { LabReferralsController } from './controllers/labReferrals.controller';
import { LabReferralsService } from './service/labReferrals.service';
import { LabReferralRepository } from '@adapters/repositories/labReferral.repository';
import { LabReferralItemRepository } from '@adapters/repositories/labReferralItem.repository';
import { CreateLabReferralUsecase } from './usecases/createLabReferral.uc';
import { FetchAllLabReferralsUsecase } from './usecases/fetchAllLabReferrals.uc';
import { FetchLabReferralByIdUsecase } from './usecases/fetchLabReferralById.uc';
import { DispatchReferralUsecase } from './usecases/dispatchReferral.uc';
import { ReceiveResultsUsecase } from './usecases/receiveResults.uc';
import { CompleteReferralUsecase } from './usecases/completeReferral.uc';

@Module({
  controllers: [LabReferralsController],
  providers: [
    LabReferralsService,
    LabReferralRepository,
    LabReferralItemRepository,
    CreateLabReferralUsecase,
    FetchAllLabReferralsUsecase,
    FetchLabReferralByIdUsecase,
    DispatchReferralUsecase,
    ReceiveResultsUsecase,
    CompleteReferralUsecase,
  ],
  exports: [LabReferralsService],
})
export class LabReferralsModule {}
