import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PatientService } from '../service/patient.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TDeletePatientParams = { id: string };
type TDeletePatientResult = { id: string; deletedAt: Date };

@Injectable()
export class DeletePatientUsecase extends Usecase<TDeletePatientResult, TDeletePatientParams> {
  constructor(
    private readonly patientService: PatientService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TDeletePatientParams): Promise<TDeletePatientResult> {
    const { id } = params;

    await this.patientService.softDeletePatient(id, em);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.PATIENT_DELETED,
        module: EventModule.PATIENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { patientId: id },
      },
      em,
    );

    return { id, deletedAt: new Date() };
  }
}
