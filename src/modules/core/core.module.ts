import { CacheModule } from '@adapters/cache/cache.module';
import { Broker } from '@broker/broker';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestContextService } from '@shared/context/requestContext.service';
import { ApplicationUtility } from '@shared/utility/applicationUtility.service';
import { Appointment } from './entities/appointment.entity';
import { Bill } from './entities/bill.entity';
import { BillItem } from './entities/billItem.entity';
import { Claim } from './entities/claim.entity';
import { CodingStandard } from './entities/codingStandard.entity';
import { Consultation } from './entities/consultation.entity';
import { Department } from './entities/department.entity';
import { Encounter } from './entities/encounter.entity';
import { Episode } from './entities/episode.entity';
import { BillingCode } from './entities/billingCode.entity';
import { ClaimItem } from './entities/claimItem.entity';
import { EmergencyOverride } from './entities/emergencyOverride.entity';
import { EpisodeDiagnosis } from './entities/episodeDiagnosis.entity';
import { EpisodeLog } from './entities/episodeLog.entity';
import { EventLog } from './entities/eventLog.entity';
import { HmoContract } from './entities/hmoContract.entity';
import { HmoProvider } from './entities/hmoProvider.entity';
import { HmoRules } from './entities/hmoRules.entity';
import { InviteToken } from './entities/inviteToken.entity';
import { Inventory } from './entities/inventory.entity';
import { InventoryCategory } from './entities/inventoryCategory.entity';
import { LabOrder } from './entities/labOrder.entity';
import { LabOrderItem } from './entities/labOrderItem.entity';
import { LabOrderResult } from './entities/labOrderResult.entity';
import { LabReferral } from './entities/labReferral.entity';
import { LabReferralItem } from './entities/labReferralItem.entity';
import { Lga } from './entities/lga.entity';
import { MedicalCatalog } from './entities/medicalCatalog.entity';
import { MedicalCode } from './entities/medicalCode.entity';
import { MedicalService } from './entities/medicalService.entity';
import { MedicalServiceCategory } from './entities/medicalServiceCategory.entity';
import { MfaConfig } from './entities/mfaConfig.entity';
import { PartnerLab } from './entities/partnerLab.entity';
import { Patient } from './entities/patient.entity';
import { PatientHmo } from './entities/patientHmo.entity';
import { PatientMedicalHistory } from './entities/patientMedicalHistory.entity';
import { PatientVital } from './entities/patientVitals.entity';
import { Payment } from './entities/payment.entity';
import { Permission } from './entities/permission.entity';
import { PersonalAccessToken } from './entities/personalAccessToken.entity';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionItem } from './entities/prescriptionItem.entity';
import { PriceChange } from './entities/priceChange.entity';
import { ProtocolBundle } from './entities/protocolBundles.entity';
import { ProtocolBundleItems } from './entities/protocolBundleItems.entity';
import { QueueEntry } from './entities/queueEntry.entity';
import { ReferenceRange } from './entities/referenceRange.entity';
import { RefreshToken } from './entities/refreshToken.entity';
import { RestockRequest } from './entities/restockRequest.entity';
import { RestockRequestItem } from './entities/restockRequestItem.entity';
import { Role } from './entities/role.entity';
import { ServiceCodeCatalog } from './entities/serviceCodeCatalog.entity';
import { Shift } from './entities/shift.entity';
import { ShiftSchedule } from './entities/shiftSchedule.entity';
import { Staff } from './entities/staff.entity';
import { StaffShiftSchedule } from './entities/staffShiftSchedule.entity';
import { State } from './entities/state.entity';
import { Supplier } from './entities/supplier.entity';
import { SystemConfig } from './entities/systemConfig.entity';
import { TestCatalog } from './entities/testCatalog.entity';
import { StockAdjustment } from './entities/stockAdjustment.entity';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { Roster } from './entities/roster.entity';

@Global()
@Module({
  imports: [
    CacheModule,
    TypeOrmModule.forFeature([
      Appointment,
      Bill,
      BillItem,
      BillingCode,
      Claim,
      ClaimItem,
      CodingStandard,
      Consultation,
      Department,
      Encounter,
      Episode,
      EmergencyOverride,
      EpisodeDiagnosis,
      EpisodeLog,
      EventLog,
      HmoContract,
      HmoProvider,
      HmoRules,
      InviteToken,
      Inventory,
      InventoryCategory,
      LabOrder,
      LabOrderItem,
      LabOrderResult,
      LabReferral,
      LabReferralItem,
      Lga,
      MedicalCatalog,
      MedicalCode,
      MedicalService,
      MedicalServiceCategory,
      MfaConfig,
      PartnerLab,
      Patient,
      PatientHmo,
      PatientMedicalHistory,
      PatientVital,
      Payment,
      Permission,
      PersonalAccessToken,
      Prescription,
      PrescriptionItem,
      PriceChange,
      ProtocolBundle,
      ProtocolBundleItems,
      QueueEntry,
      ReferenceRange,
      RefreshToken,
      RestockRequest,
      RestockRequestItem,
      Role,
      ServiceCodeCatalog,
      Shift,
      ShiftSchedule,
      Staff,
      StaffShiftSchedule,
      State,
      Supplier,
      SystemConfig,
      TestCatalog,
      StockAdjustment,
      Roster,
    ]),
  ],
  providers: [Broker, RequestContextService, ApplicationUtility, EventLogService],
  exports: [
    Broker,
    RequestContextService,
    ApplicationUtility,
    CacheModule,
    EventLogService,
    TypeOrmModule,
  ],
})
export class CoreModule {}
