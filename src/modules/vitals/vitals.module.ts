import { Module } from '@nestjs/common';
import { VitalController } from './controllers/vital.controller';
import { VitalService } from './service/vital.service';
import { PatientVitalRepository } from '@adapters/repositories/patientVital.repository';
import { RecordVitalsUsecase } from './usecases/recordVitals.uc';
import { FetchAllVitalsUsecase } from './usecases/fetchAllVitals.uc';
import { FetchVitalByIdUsecase } from './usecases/fetchVitalById.uc';

@Module({
  controllers: [VitalController],
  providers: [
    VitalService,
    PatientVitalRepository,
    RecordVitalsUsecase,
    FetchAllVitalsUsecase,
    FetchVitalByIdUsecase,
  ],
  exports: [VitalService],
})
export class VitalsModule {}
