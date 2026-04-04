import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdatePatientDto } from '../dto/updatePatient.dto';
import { PatientService } from '../service/patient.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Patient } from '@modules/core/entities/patient.entity';

type TUpdatePatientParams = { id: string; dto: UpdatePatientDto };
type TUpdatePatientResult = { patient: Patient };

@Injectable()
export class UpdatePatientUsecase extends Usecase<TUpdatePatientResult, TUpdatePatientParams> {
  constructor(
    private readonly patientService: PatientService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TUpdatePatientParams): Promise<TUpdatePatientResult> {
    const { id, dto } = params;

    const patient = await this.patientService.updatePatient(id, dto as Partial<Patient>, em);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.PATIENT_UPDATED,
        module: EventModule.PATIENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { patientId: id },
      },
      em,
    );

    return { patient };
  }
}
