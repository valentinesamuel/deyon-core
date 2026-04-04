import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AmendConsultationDto } from '../dto/amendConsultation.dto';
import { ConsultationService } from '../service/consultation.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Consultation, ConsultationStatusEnum } from '@modules/core/entities/consultation.entity';

type TParams = { id: string } & AmendConsultationDto;
type TResult = { consultation: Consultation };

@Injectable()
export class AmendConsultationUsecase extends Usecase<TResult, TParams> {
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

    if (existing.status !== ConsultationStatusEnum.FINALIZED) {
      throw new BadRequestException(
        `Cannot amend a consultation in status '${existing.status}'. Only finalized consultations can be amended.`,
      );
    }

    // Snapshot the current state before changes
    const snapshot: Record<string, unknown> = {
      amendedAt: new Date().toISOString(),
      amendedBy: this.requestContextService.getUserId(),
      previousStatus: existing.status,
      chiefComplaint: existing.chiefComplaint,
      historyOfPresentIllness: existing.historyOfPresentIllness,
      physicalExamination: existing.physicalExamination,
      treatmentPlan: existing.treatmentPlan,
      selectedDiagnoses: existing.selectedDiagnoses,
      followUpDate: existing.followUpDate,
    };

    const currentVersions = existing.versions ?? [];

    const consultation = await this.consultationService.updateConsultation(
      { id: params.id },
      {
        status: ConsultationStatusEnum.AMENDMENT,
        amendmentReason: params.amendmentReason,
        versions: [...currentVersions, snapshot],
        ...(params.chiefComplaint && { chiefComplaint: params.chiefComplaint }),
        ...(params.historyOfPresentIllness !== undefined && {
          historyOfPresentIllness: params.historyOfPresentIllness,
        }),
        ...(params.physicalExamination !== undefined && {
          physicalExamination: params.physicalExamination,
        }),
        ...(params.treatmentPlan !== undefined && { treatmentPlan: params.treatmentPlan }),
        ...(params.selectedDiagnoses !== undefined && {
          selectedDiagnoses: params.selectedDiagnoses,
        }),
        ...(params.followUpDate && { followUpDate: new Date(params.followUpDate) }),
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.CONSULTATION_AMENDED,
        module: EventModule.CONSULTATION,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { consultationId: params.id, reason: params.amendmentReason },
      },
      em,
    );

    return { consultation };
  }
}
