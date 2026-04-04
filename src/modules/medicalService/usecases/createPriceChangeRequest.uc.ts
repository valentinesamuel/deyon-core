import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreatePriceChangeRequestDto } from '../dto/createPriceChangeRequest.dto';
import { MedicalServiceService } from '../service/medicalService.service';
import { PriceChangeService } from '../service/priceChange.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { PriceChange, PriceChangeStatusEnum } from '@modules/core/entities/priceChange.entity';

type TCreatePriceChangeRequestResult = PriceChange;

@Injectable()
export class CreatePriceChangeRequestUsecase extends Usecase<
  TCreatePriceChangeRequestResult,
  CreatePriceChangeRequestDto
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
    params: CreatePriceChangeRequestDto,
  ): Promise<TCreatePriceChangeRequestResult> {
    const service = await this.medicalServiceService.getMedicalServiceByDataOrFailIfNotExists(
      { where: { id: params.serviceId } },
      em,
    );

    const requestedBy = this.requestContextService.getUserId();

    const priceChange = await this.priceChangeService.createPriceChange(
      {
        serviceId: params.serviceId,
        requestedPrice: params.requestedPrice,
        currentPrice: service.defaultPrice,
        description: params.description,
        reason: params.reason,
        requestedBy,
        status: PriceChangeStatusEnum.PENDING,
        isActive: false,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: requestedBy,
        event: EventType.PRICE_CHANGE_REQUESTED,
        module: EventModule.PRICE_CHANGE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          priceChangeId: priceChange.id,
          serviceId: params.serviceId,
          requestedPrice: params.requestedPrice,
          currentPrice: service.defaultPrice,
        },
      },
      em,
    );

    return priceChange;
  }
}
