import { Module } from '@nestjs/common';
import { PrescriptionController } from './controllers/prescription.controller';
import { PrescriptionService } from './service/prescription.service';
import { PrescriptionRepository } from '@adapters/repositories/prescription.repository';
import { PrescriptionItemRepository } from '@adapters/repositories/prescriptionItem.repository';
import { CreatePrescriptionUsecase } from './usecases/createPrescription.uc';
import { FetchAllPrescriptionsUsecase } from './usecases/fetchAllPrescriptions.uc';
import { FetchPrescriptionByIdUsecase } from './usecases/fetchPrescriptionById.uc';
import { DispensePrescriptionUsecase } from './usecases/dispensePrescription.uc';
import { PartialDispenseUsecase } from './usecases/partialDispense.uc';
import { MarkUnfulfillableUsecase } from './usecases/markUnfulfillable.uc';

@Module({
  controllers: [PrescriptionController],
  providers: [
    PrescriptionService,
    PrescriptionRepository,
    PrescriptionItemRepository,
    CreatePrescriptionUsecase,
    FetchAllPrescriptionsUsecase,
    FetchPrescriptionByIdUsecase,
    DispensePrescriptionUsecase,
    PartialDispenseUsecase,
    MarkUnfulfillableUsecase,
  ],
  exports: [PrescriptionService],
})
export class PrescriptionsModule {}
