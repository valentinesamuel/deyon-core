import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ReviewMedicalServiceApprovalDto } from '../dto/reviewMedicalServiceApproval.dto';
import { MedicalServiceService } from '../service/medicalService.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import {
  MedicalService,
  MedicalServiceStatusEnum,
} from '@modules/core/entities/medicalService.entity';

type TReviewMedicalServiceApprovalResult = {
  medicalService: MedicalService;
};

type TReviewMedicalServiceApprovalParams = { id: string; dto: ReviewMedicalServiceApprovalDto };

@Injectable()
export class ReviewMedicalServiceApprovalUsecase extends Usecase<
  TReviewMedicalServiceApprovalResult,
  TReviewMedicalServiceApprovalParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly medicalServiceService: MedicalServiceService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TReviewMedicalServiceApprovalParams,
  ): Promise<TReviewMedicalServiceApprovalResult> {
    const { id, dto } = params;

    await this.medicalServiceService.getMedicalServiceByDataOrFailIfNotExists(
      { where: { id } },
      em,
    );

    let updateData: Partial<MedicalService>;
    let eventType: EventType;

    if (dto.status === MedicalServiceStatusEnum.APPROVED) {
      updateData = { status: MedicalServiceStatusEnum.APPROVED, isActive: true };
      eventType = EventType.MEDICAL_SERVICE_APPROVED;
    } else {
      updateData = { status: MedicalServiceStatusEnum.REJECTED };
      eventType = EventType.MEDICAL_SERVICE_REJECTED;
    }

    const medicalService = await this.medicalServiceService.updateMedicalService(
      id,
      updateData,
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: eventType,
        module: EventModule.MEDICAL_SERVICE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id, status: dto.status, reason: dto.reason },
      },
      em,
    );

    return { medicalService };
  }
}
