import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AddPatientHistoryDto } from '../dto/addPatientHistory.dto';
import { PatientService } from '../service/patient.service';
import { PatientHistoryService } from '../service/patientHistory.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { PatientMedicalHistory } from '@modules/core/entities/patientMedicalHistory.entity';

type TAddPatientHistoryParams = { id: string; dto: AddPatientHistoryDto };
type TAddPatientHistoryResult = { historyItem: PatientMedicalHistory };

@Injectable()
export class AddPatientHistoryItemUsecase extends Usecase<
  TAddPatientHistoryResult,
  TAddPatientHistoryParams
> {
  constructor(
    private readonly patientService: PatientService,
    private readonly historyService: PatientHistoryService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TAddPatientHistoryParams,
  ): Promise<TAddPatientHistoryResult> {
    const { id, dto } = params;
    const actorId = this.requestContextService.getUserId();

    await this.patientService.getPatientOrFail({ where: { id } }, em);

    const historyItem = await this.historyService.createHistoryItem(
      {
        patientId: id,
        catalogId: dto.catalogId,
        customName: dto.customName,
        severity: dto.severity,
        addedBy: actorId,
      } as Partial<PatientMedicalHistory>,
      em,
    );

    await this.eventService.log(
      {
        actorId,
        event: EventType.PATIENT_HISTORY_ADDED,
        module: EventModule.PATIENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { patientId: id, catalogId: dto.catalogId },
      },
      em,
    );

    return { historyItem };
  }
}
