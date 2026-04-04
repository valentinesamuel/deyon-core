import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { SupplierService } from '../service/supplier.service';
import { UpdateSupplierDto } from '../dto/updateSupplier.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TUpdateSupplierResult = {
  supplier: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    isActive: boolean;
  };
};

type TUpdateSupplierParams = { id: string; dto: UpdateSupplierDto };

@Injectable()
export class UpdateSupplierUsecase extends Usecase<TUpdateSupplierResult, TUpdateSupplierParams> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly supplierService: SupplierService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TUpdateSupplierParams): Promise<TUpdateSupplierResult> {
    const { id, dto } = params;

    const updated = await this.supplierService.updateSupplier(
      id,
      {
        name: dto.name,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        address: dto.address,
        isActive: dto.isActive,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.SUPPLIER_UPDATED,
        module: EventModule.SUPPLIER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id },
      },
      em,
    );

    return {
      supplier: {
        id: updated.id,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        name: updated.name,
        contactPhone: updated.contactPhone,
        contactEmail: updated.contactEmail,
        address: updated.address,
        isActive: updated.isActive,
      },
    };
  }
}
