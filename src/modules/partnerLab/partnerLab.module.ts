import { Module } from '@nestjs/common';
import { PartnerLabController } from './controllers/partnerLab.controller';
import { FetchAllPartnerLabsUsecase } from './usecases/fetchAllPartnerLabs.uc';
import { CreatePartnerLabUsecase } from './usecases/createPartnerLab.uc';
import { FetchPartnerLabByIdUsecase } from './usecases/fetchPartnerLabById.uc';
import { UpdatePartnerLabUsecase } from './usecases/updatePartnerLab.uc';
import { TogglePartnerLabStatusUsecase } from './usecases/togglePartnerLabStatus.uc';
import { PartnerLabService } from './service/partnerLab.service';
import { PartnerLabRepository } from '@adapters/repositories/partnerLab.repository';

@Module({
  controllers: [PartnerLabController],
  providers: [
    FetchAllPartnerLabsUsecase,
    CreatePartnerLabUsecase,
    FetchPartnerLabByIdUsecase,
    UpdatePartnerLabUsecase,
    TogglePartnerLabStatusUsecase,
    PartnerLabService,
    PartnerLabRepository,
  ],
})
export class PartnerLabModule {}
