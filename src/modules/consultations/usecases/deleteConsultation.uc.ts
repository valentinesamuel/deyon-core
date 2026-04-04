import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ConsultationService } from '../service/consultation.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Consultation, ConsultationStatusEnum } from '@modules/core/entities/consultation.entity';

type TParams = { id: string };
type TResult = { message: string };

@Injectable()
export class DeleteConsultationUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly consultationService: ConsultationService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.consultationService.getConsultationOrFail(
      { where: { id: params.id } },
      em,
    );

    if (existing.status !== ConsultationStatusEnum.DRAFT) {
      throw new BadRequestException(
        `Cannot delete a consultation in status '${existing.status}'. Only draft consultations can be deleted.`,
      );
    }

    await em.getRepository(Consultation).softDelete({ id: params.id });

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.CONSULTATION_DELETED,
        module: EventModule.CONSULTATION,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { consultationId: params.id },
      },
      em,
    );

    return { message: 'Consultation deleted successfully' };
  }
}
