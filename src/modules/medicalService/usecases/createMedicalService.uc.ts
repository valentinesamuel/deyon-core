import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateMedicalServiceDto } from '../dto/createMedicalService.dto';
import { MedicalServiceService } from '../service/medicalService.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { MedicalServiceStatusEnum } from '@modules/core/entities/medicalService.entity';

type TCreateMedicalServiceResult = {
  id: string;
  createdAt: Date;
  code: string;
  name: string;
  description: string;
  medicalServiceCategoryId: string;
  defaultPrice: number;
  isTaxable: boolean;
  isPremium: boolean;
  isRestricted: boolean;
  restrictionReason: string;
  department: string;
  status: string;
  isActive: boolean;
};

@Injectable()
export class CreateMedicalServiceUsecase extends Usecase<
  TCreateMedicalServiceResult,
  CreateMedicalServiceDto
> {
  constructor(
    private readonly medicalServiceService: MedicalServiceService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: CreateMedicalServiceDto,
  ): Promise<TCreateMedicalServiceResult> {
    await this.medicalServiceService.getMedicalServiceByDataOrFailIfExists(
      {
        where: { code: params.code },
      },
      em,
    );

    const newService = await this.medicalServiceService.createMedicalService(
      {
        code: params.code,
        name: params.name,
        description: params.description,
        medicalServiceCategoryId: params.medicalServiceCategoryId,
        defaultPrice: params.defaultPrice,
        isTaxable: params.isTaxable,
        isPremium: params.isPremium,
        isRestricted: params.isRestricted,
        restrictionReason: params.restrictionReason,
        department: params.department,
        status: MedicalServiceStatusEnum.PENDING,
        isActive: false,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.MEDICAL_SERVICE_CREATED,
        module: EventModule.MEDICAL_SERVICE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          code: params.code,
          name: params.name,
        },
      },
      em,
    );

    return {
      id: newService.id,
      createdAt: newService.createdAt,
      code: newService.code,
      name: newService.name,
      description: newService.description,
      medicalServiceCategoryId: newService.medicalServiceCategoryId,
      defaultPrice: newService.defaultPrice,
      isTaxable: newService.isTaxable,
      isPremium: newService.isPremium,
      isRestricted: newService.isRestricted,
      restrictionReason: newService.restrictionReason,
      department: newService.department,
      status: newService.status,
      isActive: newService.isActive,
    };
  }
}
