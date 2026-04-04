import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateSupplierDto } from '../dto/createSupplier.dto';
import { SupplierService } from '../service/supplier.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateSupplierResult = {
  id: string;
  createdAt: Date;
  name: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  isActive: boolean;
};

@Injectable()
export class CreateSupplierUsecase extends Usecase<TCreateSupplierResult, CreateSupplierDto> {
  constructor(
    private readonly supplierService: SupplierService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateSupplierDto): Promise<TCreateSupplierResult> {
    const newSupplier = await this.supplierService.createSupplier(
      {
        name: params.name,
        contactPhone: params.contactPhone,
        contactEmail: params.contactEmail,
        address: params.address,
        isActive: params.isActive,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.SUPPLIER_CREATED,
        module: EventModule.SUPPLIER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          name: params.name,
          contactPhone: params.contactPhone,
          contactEmail: params.contactEmail,
        },
      },
      em,
    );

    return {
      id: newSupplier.id,
      createdAt: newSupplier.createdAt,
      name: newSupplier.name,
      contactPhone: newSupplier.contactPhone,
      contactEmail: newSupplier.contactEmail,
      address: newSupplier.address,
      isActive: newSupplier.isActive,
    };
  }
}
