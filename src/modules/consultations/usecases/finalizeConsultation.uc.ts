import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ConsultationService } from '../service/consultation.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Consultation, ConsultationStatusEnum } from '@modules/core/entities/consultation.entity';

type TParams = { id: string };
type TResult = { consultation: Consultation };

@Injectable()
export class FinalizeConsultationUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly consultationService: ConsultationService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.consultationService.getConsultationOrFail(
      { where: { id: params.id } },
      em,
    );

    if (existing.status !== ConsultationStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(
        `Cannot finalize a consultation in status '${existing.status}'. Only in_progress consultations can be finalized.`,
      );
    }

    // Enforce required fields for finalization
    const missingFields: string[] = [];
    if (!existing.chiefComplaint) missingFields.push('chiefComplaint');
    if (!existing.historyOfPresentIllness) missingFields.push('historyOfPresentIllness');
    if (!existing.physicalExamination) missingFields.push('physicalExamination');
    if (!existing.treatmentPlan) missingFields.push('treatmentPlan');
    if (!existing.selectedDiagnoses || existing.selectedDiagnoses.length === 0) {
      missingFields.push('selectedDiagnoses (at least one required)');
    }

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Cannot finalize consultation. Missing required fields: ${missingFields.join(', ')}.`,
      );
    }

    const consultation = await this.consultationService.updateConsultation(
      { id: params.id },
      { status: ConsultationStatusEnum.FINALIZED, finalizedAt: new Date() },
      em,
    );

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.CONSULTATION_FINALIZED,
        module: EventModule.CONSULTATION,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { consultationId: params.id },
      },
      em,
    );

    return { consultation };
  }
}
