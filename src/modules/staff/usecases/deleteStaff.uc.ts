import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Staff } from '@modules/core/entities/staff.entity';

type TDeleteStaffParams = { id: string };

type TDeleteStaffResult = {
  id: string;
  deletedAt: Date;
};

@Injectable()
export class DeleteStaffUsecase extends Usecase<TDeleteStaffResult, TDeleteStaffParams> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TDeleteStaffParams): Promise<TDeleteStaffResult> {
    const { id } = params;

    const staff = await this.staffRepository.findOneOrFailIfNotExists({ where: { id } }, em);

    await em.getRepository(Staff).softRemove(staff);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.STAFF_DELETED,
        module: EventModule.STAFF,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { staffId: id },
      },
      em,
    );

    return {
      id,
      deletedAt: new Date(),
    };
  }
}
