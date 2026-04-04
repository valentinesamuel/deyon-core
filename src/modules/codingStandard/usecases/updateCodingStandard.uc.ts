import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateCodingStandardDto } from '../dto/updateCodingStandard.dto';
import { CodingStandardService } from '../service/codingStandard.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { CodingStandard } from '@modules/core/entities/codingStandard.entity';

type TUpdateCodingStandardParams = { id: string; dto: UpdateCodingStandardDto };

@Injectable()
export class UpdateCodingStandardUsecase extends Usecase<
  CodingStandard,
  TUpdateCodingStandardParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly codingStandardService: CodingStandardService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TUpdateCodingStandardParams): Promise<CodingStandard> {
    const { id, dto } = params;

    await this.codingStandardService.getCodingStandardByDataOrFailIfNotExists(
      { where: { id } },
      em,
    );

    const updated = await this.codingStandardService.updateCodingStandard(
      id,
      {
        name: dto.name,
        description: dto.description,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.CODING_STANDARD_UPDATED,
        module: EventModule.CODING_STANDARD,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          id,
          name: dto.name,
        },
      },
      em,
    );

    return updated;
  }
}
