import { Module } from '@nestjs/common';
import { ConsultationController } from './controllers/consultation.controller';
import { ConsultationService } from './service/consultation.service';
import { ConsultationRepository } from '@adapters/repositories/consultation.repository';
import { CreateConsultationUsecase } from './usecases/createConsultation.uc';
import { FetchAllConsultationsUsecase } from './usecases/fetchAllConsultations.uc';
import { FetchConsultationByIdUsecase } from './usecases/fetchConsultationById.uc';
import { UpdateConsultationUsecase } from './usecases/updateConsultation.uc';
import { StartConsultationUsecase } from './usecases/startConsultation.uc';
import { FinalizeConsultationUsecase } from './usecases/finalizeConsultation.uc';
import { AmendConsultationUsecase } from './usecases/amendConsultation.uc';
import { DeleteConsultationUsecase } from './usecases/deleteConsultation.uc';

@Module({
  controllers: [ConsultationController],
  providers: [
    ConsultationService,
    ConsultationRepository,
    CreateConsultationUsecase,
    FetchAllConsultationsUsecase,
    FetchConsultationByIdUsecase,
    UpdateConsultationUsecase,
    StartConsultationUsecase,
    FinalizeConsultationUsecase,
    AmendConsultationUsecase,
    DeleteConsultationUsecase,
  ],
  exports: [ConsultationService],
})
export class ConsultationsModule {}
