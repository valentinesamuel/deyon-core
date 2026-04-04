import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { LabReferralsService } from '../service/labReferrals.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { LabReferral, LabReferralStatusEnum } from '@modules/core/entities/labReferral.entity';
import { LabPriorityEnum } from '@modules/core/entities/labOrder.entity';
import { CreateLabReferralDto } from '../dto/createLabReferral.dto';

type TResult = { referral: LabReferral };

@Injectable()
export class CreateLabReferralUsecase extends Usecase<TResult, CreateLabReferralDto> {
  constructor(
    private readonly labReferralsService: LabReferralsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateLabReferralDto): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();

    const referral = await this.labReferralsService.createReferral(
      {
        direction: params.direction,
        patientId: params.patientId,
        patientPhoneNumber: params.patientPhoneNumber,
        partnerLabId: params.partnerLabId,
        status: LabReferralStatusEnum.PENDING,
        referredBy: staffId,
        notes: params.notes,
        priority: params.priority ?? LabPriorityEnum.ROUTINE,
        attachments: [],
      },
      em,
    );

    await this.labReferralsService.createItems(
      params.items.map((item) => ({
        labReferralId: referral.id,
        testName: item.testName,
        isAbnormal: false,
      })),
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.LAB_REFERRAL_CREATED,
        module: EventModule.LAB_REFERRAL,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { referralId: referral.id, referenceNumber: referral.referenceNumber },
      },
      em,
    );

    return { referral };
  }
}
