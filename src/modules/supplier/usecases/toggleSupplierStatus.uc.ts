import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { SupplierService } from '../service/supplier.service';
import { UpdateSupplierStatusDto } from '../dto/updateSupplierStatus.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TToggleSupplierStatusResult = {
  supplier: {
    id: string;
    updatedAt: Date;
    isActive: boolean;
  };
};

type TToggleSupplierStatusParams = { id: string; dto: UpdateSupplierStatusDto };

@Injectable()
export class ToggleSupplierStatusUsecase extends Usecase<
  TToggleSupplierStatusResult,
  TToggleSupplierStatusParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly supplierService: SupplierService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TToggleSupplierStatusParams,
  ): Promise<TToggleSupplierStatusResult> {
    const { id, dto } = params;

    const updated = await this.supplierService.updateSupplier(
      id,
      {
        isActive: dto.isActive,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.SUPPLIER_STATUS_CHANGED,
        module: EventModule.SUPPLIER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id, isActive: dto.isActive },
      },
      em,
    );

    return {
      supplier: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        isActive: updated.isActive,
      },
    };
  }
}
