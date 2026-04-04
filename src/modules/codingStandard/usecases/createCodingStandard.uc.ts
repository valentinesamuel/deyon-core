import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateCodingStandardDto } from '../dto/createCodingStandard.dto';
import { CodingStandardService } from '../service/codingStandard.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateCodingStandardResult = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
};

@Injectable()
export class CreateCodingStandardUsecase extends Usecase<
  TCreateCodingStandardResult,
  CreateCodingStandardDto
> {
  constructor(
    private readonly codingStandardService: CodingStandardService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: CreateCodingStandardDto,
  ): Promise<TCreateCodingStandardResult> {
    await this.codingStandardService.getCodingStandardByDataOrFailIfExists(
      {
        where: {
          name: params.name,
        },
      },
      em,
    );

    const newStandard = await this.codingStandardService.createCodingStandard(
      {
        name: params.name,
        description: params.description,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.CODING_STANDARD_CREATED,
        module: EventModule.CODING_STANDARD,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          name: params.name,
        },
      },
      em,
    );

    return {
      id: newStandard.id,
      name: newStandard.name,
      description: newStandard.description,
      createdAt: newStandard.createdAt,
    };
  }
}
