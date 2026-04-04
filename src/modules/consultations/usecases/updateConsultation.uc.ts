import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateConsultationDto } from '../dto/updateConsultation.dto';
import { ConsultationService } from '../service/consultation.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Consultation, ConsultationStatusEnum } from '@modules/core/entities/consultation.entity';

type TParams = { id: string } & UpdateConsultationDto;
type TResult = { consultation: Consultation };

@Injectable()
export class UpdateConsultationUsecase extends Usecase<TResult, TParams> {
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

    const editableStatuses: ConsultationStatusEnum[] = [
      ConsultationStatusEnum.DRAFT,
      ConsultationStatusEnum.IN_PROGRESS,
    ];

    if (!editableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        `Cannot update a consultation in status '${existing.status}'. Only draft and in_progress consultations can be updated.`,
      );
    }

    const { id, ...updateData } = params;
    const consultation = await this.consultationService.updateConsultation(
      { id },
      {
        ...(updateData.chiefComplaint && { chiefComplaint: updateData.chiefComplaint }),
        ...(updateData.historyOfPresentIllness !== undefined && {
          historyOfPresentIllness: updateData.historyOfPresentIllness,
        }),
        ...(updateData.physicalExamination !== undefined && {
          physicalExamination: updateData.physicalExamination,
        }),
        ...(updateData.treatmentPlan !== undefined && { treatmentPlan: updateData.treatmentPlan }),
        ...(updateData.selectedDiagnoses !== undefined && {
          selectedDiagnoses: updateData.selectedDiagnoses,
        }),
        ...(updateData.followUpDate && { followUpDate: new Date(updateData.followUpDate) }),
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
        metadata: { consultationId: id },
      },
      em,
    );

    return { consultation };
  }
}
