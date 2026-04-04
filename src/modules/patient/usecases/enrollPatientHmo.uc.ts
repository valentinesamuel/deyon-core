import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { EnrollPatientHmoDto } from '../dto/enrollPatientHmo.dto';
import { PatientService } from '../service/patient.service';
import { PatientHmoService } from '../service/patientHmo.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { PatientHmo } from '@modules/core/entities/patientHmo.entity';

type TEnrollPatientHmoParams = { id: string; dto: EnrollPatientHmoDto };
type TEnrollPatientHmoResult = { hmo: PatientHmo };

@Injectable()
export class EnrollPatientHmoUsecase extends Usecase<
  TEnrollPatientHmoResult,
  TEnrollPatientHmoParams
> {
  constructor(
    private readonly patientService: PatientService,
    private readonly patientHmoService: PatientHmoService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TEnrollPatientHmoParams,
  ): Promise<TEnrollPatientHmoResult> {
    const { id, dto } = params;

    // Ensure patient exists
    await this.patientService.getPatientOrFail({ where: { id } }, em);

    const hmo = await this.patientHmoService.upsertPatientHmo(
      id,
      {
        ...dto,
        expiryDate: new Date(dto.expiryDate),
        isActive: true,
      } as Partial<PatientHmo>,
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.PATIENT_HMO_ENROLLED,
        module: EventModule.PATIENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { patientId: id, hmoProviderId: dto.hmoProviderId },
      },
      em,
    );

    return { hmo };
  }
}
