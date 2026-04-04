import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateMedicalServiceCategoryDto } from '../dto/createMedicalServiceCategory.dto';
import { MedicalServiceCategoryService } from '../service/medicalServiceCategory.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateMedicalServiceCategoryResult = {
  id: string;
  createdAt: Date;
  name: string;
};

@Injectable()
export class CreateMedicalServiceCategoryUsecase extends Usecase<
  TCreateMedicalServiceCategoryResult,
  CreateMedicalServiceCategoryDto
> {
  constructor(
    private readonly medicalServiceCategoryService: MedicalServiceCategoryService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: CreateMedicalServiceCategoryDto,
  ): Promise<TCreateMedicalServiceCategoryResult> {
    await this.medicalServiceCategoryService.getMedicalServiceCategoryByDataOrFailIfExists(
      {
        where: {
          name: params.name,
        },
      },
      em,
    );

    const newCategory = await this.medicalServiceCategoryService.createMedicalServiceCategory(
      {
        name: params.name,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.MEDICAL_SERVICE_CATEGORY_CREATED,
        module: EventModule.MEDICAL_SERVICE_CATEGORY,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          name: params.name,
        },
      },
      em,
    );

    return {
      id: newCategory.id,
      createdAt: newCategory.createdAt,
      name: newCategory.name,
    };
  }
}
