import { Module } from '@nestjs/common';
import { ClaimsController } from './controllers/claims.controller';
import { ClaimsService } from './service/claims.service';
import { ClaimRepository } from '@adapters/repositories/claim.repository';
import { ClaimItemRepository } from '@adapters/repositories/claimItem.repository';
import { CreateClaimUsecase } from './usecases/createClaim.uc';
import { FetchAllClaimsUsecase } from './usecases/fetchAllClaims.uc';
import { FetchClaimByIdUsecase } from './usecases/fetchClaimById.uc';
import { UpdateClaimUsecase } from './usecases/updateClaim.uc';
import { SubmitClaimUsecase } from './usecases/submitClaim.uc';
import { UploadClaimDocumentUsecase } from './usecases/uploadClaimDocument.uc';
import { ApproveClaimUsecase } from './usecases/approveClaim.uc';
import { DenyClaimUsecase } from './usecases/denyClaim.uc';
import { MarkClaimPaidUsecase } from './usecases/markClaimPaid.uc';
import { WithdrawClaimUsecase } from './usecases/withdrawClaim.uc';
import { RetractClaimUsecase } from './usecases/retractClaim.uc';
import { ResubmitClaimUsecase } from './usecases/resubmitClaim.uc';
import { FetchClaimVersionsUsecase } from './usecases/fetchClaimVersions.uc';
import { StorageModule } from '@adapters/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [ClaimsController],
  providers: [
    ClaimsService,
    ClaimRepository,
    ClaimItemRepository,
    CreateClaimUsecase,
    FetchAllClaimsUsecase,
    FetchClaimByIdUsecase,
    UpdateClaimUsecase,
    SubmitClaimUsecase,
    UploadClaimDocumentUsecase,
    ApproveClaimUsecase,
    DenyClaimUsecase,
    MarkClaimPaidUsecase,
    WithdrawClaimUsecase,
    RetractClaimUsecase,
    ResubmitClaimUsecase,
    FetchClaimVersionsUsecase,
  ],
  exports: [ClaimsService],
})
export class ClaimsModule {}
