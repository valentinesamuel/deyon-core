import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RecordVitalsDto } from '../dto/recordVitals.dto';
import { VitalService } from '../service/vital.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { PatientVital } from '@modules/core/entities/patientVitals.entity';
import { calculateBmi, evaluateVitalAlerts } from '../vitals.constants';

type TRecordVitalsResult = {
  vital: PatientVital;
  bmi: number;
  alerts: string[];
};

@Injectable()
export class RecordVitalsUsecase extends Usecase<TRecordVitalsResult, RecordVitalsDto> {
  constructor(
    private readonly vitalService: VitalService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: RecordVitalsDto): Promise<TRecordVitalsResult> {
    const vital = await this.vitalService.createVital(params as Partial<PatientVital>, em);

    const bmi = calculateBmi(params.kilogramWeight, params.centimetreHeight);
    const alerts = evaluateVitalAlerts(params);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.VITALS_RECORDED,
        module: EventModule.VITAL_SIGNS,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { vitalId: vital.id, episodeId: params.episodeId, bmi, alerts },
      },
      em,
    );

    return { vital, bmi, alerts };
  }
}
