import { Module } from '@nestjs/common';
import { PatientController } from './controllers/patient.controller';
import { PatientService } from './service/patient.service';
import { PatientHistoryService } from './service/patientHistory.service';
import { PatientHmoService } from './service/patientHmo.service';
import { PatientRepository } from '@adapters/repositories/patient.repository';
import { PatientMedicalHistoryRepository } from '@adapters/repositories/patientMedicalHistory.repository';
import { PatientHmoRepository } from '@adapters/repositories/patientHmo.repository';
import { CreatePatientUsecase } from './usecases/createPatient.uc';
import { FetchAllPatientsUsecase } from './usecases/fetchAllPatients.uc';
import { FetchPatientByIdUsecase } from './usecases/fetchPatientById.uc';
import { UpdatePatientUsecase } from './usecases/updatePatient.uc';
import { DeletePatientUsecase } from './usecases/deletePatient.uc';
import { SearchPatientsUsecase } from './usecases/searchPatients.uc';
import { EnrollPatientHmoUsecase } from './usecases/enrollPatientHmo.uc';
import { FetchPatientHistoryUsecase } from './usecases/fetchPatientHistory.uc';
import { AddPatientHistoryItemUsecase } from './usecases/addPatientHistoryItem.uc';
import { RemovePatientHistoryItemUsecase } from './usecases/removePatientHistoryItem.uc';

@Module({
  controllers: [PatientController],
  providers: [
    // Services
    PatientService,
    PatientHistoryService,
    PatientHmoService,
    // Repositories
    PatientRepository,
    PatientMedicalHistoryRepository,
    PatientHmoRepository,
    // Usecases
    CreatePatientUsecase,
    FetchAllPatientsUsecase,
    FetchPatientByIdUsecase,
    UpdatePatientUsecase,
    DeletePatientUsecase,
    SearchPatientsUsecase,
    EnrollPatientHmoUsecase,
    FetchPatientHistoryUsecase,
    AddPatientHistoryItemUsecase,
    RemovePatientHistoryItemUsecase,
  ],
  exports: [PatientService],
})
export class PatientModule {}
