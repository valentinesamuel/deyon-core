import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ReviewPriceChangeRequestDto } from '../dto/reviewPriceChangeRequest.dto';
import { MedicalServiceService } from '../service/medicalService.service';
import { PriceChangeService } from '../service/priceChange.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { PriceChange, PriceChangeStatusEnum } from '@modules/core/entities/priceChange.entity';

type TReviewPriceChangeRequestResult = PriceChange;

type TReviewPriceChangeRequestParams = { id: string; dto: ReviewPriceChangeRequestDto };

@Injectable()
export class ReviewPriceChangeRequestUsecase extends Usecase<
  TReviewPriceChangeRequestResult,
  TReviewPriceChangeRequestParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly medicalServiceService: MedicalServiceService,
    private readonly priceChangeService: PriceChangeService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TReviewPriceChangeRequestParams,
  ): Promise<TReviewPriceChangeRequestResult> {
    const { id, dto } = params;

    const priceChange = await this.priceChangeService.getPriceChangeByDataOrFailIfNotExists(
      { where: { id } },
      em,
    );

    const approvedBy = this.requestContextService.getUserId();

    let updatedPriceChange: PriceChange;
    let eventType: EventType;

    if (dto.status === PriceChangeStatusEnum.APPROVED) {
      updatedPriceChange = await this.priceChangeService.updatePriceChange(
        id,
        { status: PriceChangeStatusEnum.APPROVED, isActive: true, approvedBy },
        em,
      );

      await this.medicalServiceService.updateMedicalService(
        priceChange.serviceId,
        { defaultPrice: priceChange.requestedPrice },
        em,
      );

      eventType = EventType.PRICE_CHANGE_APPROVED;
    } else {
      updatedPriceChange = await this.priceChangeService.updatePriceChange(
        id,
        { status: PriceChangeStatusEnum.REJECTED, approvedBy },
        em,
      );

      eventType = EventType.PRICE_CHANGE_REJECTED;
    }

    await this.eventService.log(
      {
        actorId: approvedBy,
        event: eventType,
        module: EventModule.PRICE_CHANGE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id, status: dto.status, reason: dto.reason },
      },
      em,
    );

    return updatedPriceChange;
  }
}
