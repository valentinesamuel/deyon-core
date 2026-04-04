import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateConsultationDto } from '../dto/createConsultation.dto';
import { ConsultationService } from '../service/consultation.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Consultation, ConsultationStatusEnum } from '@modules/core/entities/consultation.entity';

type TResult = { consultation: Consultation };

@Injectable()
export class CreateConsultationUsecase extends Usecase<TResult, CreateConsultationDto> {
  constructor(
    private readonly consultationService: ConsultationService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateConsultationDto): Promise<TResult> {
    const consultation = await this.consultationService.createConsultation(
      {
        encounterId: params.encounterId,
        patientId: params.patientId,
        episodeId: params.episodeId,
        appointmentId: params.appointmentId,
        doctorId: params.doctorId,
        status: ConsultationStatusEnum.DRAFT,
        chiefComplaint: params.chiefComplaint,
        historyOfPresentIllness: params.historyOfPresentIllness,
        physicalExamination: params.physicalExamination,
        treatmentPlan: params.treatmentPlan,
        selectedDiagnoses: params.selectedDiagnoses,
        followUpDate: params.followUpDate ? new Date(params.followUpDate) : undefined,
        amendmentReason: undefined,
        versions: undefined,
        startedAt: undefined,
        finalizedAt: undefined,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.CONSULTATION_CREATED,
        module: EventModule.CONSULTATION,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { consultationId: consultation.id, episodeId: params.episodeId },
      },
      em,
    );

    return { consultation };
  }
}
