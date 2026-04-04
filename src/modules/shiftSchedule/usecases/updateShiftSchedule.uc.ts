import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ShiftScheduleService } from '../service/shiftSchedule.service';
import { UpdateShiftScheduleDto } from '../dto/updateShiftSchedule.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { DayOfWeekEnum, ShiftTimeOfDayEnum } from '@modules/core/entities/shiftSchedule.entity';

type TUpdateShiftScheduleResult = {
  shiftSchedule: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    timeOfDay: ShiftTimeOfDayEnum;
    startTime: string;
    endTime: string;
    day: DayOfWeekEnum;
  };
};

type TUpdateShiftScheduleParams = { id: string; dto: UpdateShiftScheduleDto };

@Injectable()
export class UpdateShiftScheduleUsecase extends Usecase<
  TUpdateShiftScheduleResult,
  TUpdateShiftScheduleParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly shiftScheduleService: ShiftScheduleService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TUpdateShiftScheduleParams,
  ): Promise<TUpdateShiftScheduleResult> {
    const { id, dto } = params;

    const updated = await this.shiftScheduleService.updateShiftSchedule(
      id,
      {
        timeOfDay: dto.timeOfDay,
        startTime: dto.startTime,
        endTime: dto.endTime,
        day: dto.day,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.SHIFT_SCHEDULE_UPDATED,
        module: EventModule.SHIFT_SCHEDULE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id },
      },
      em,
    );

    return {
      shiftSchedule: {
        id: updated.id,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        timeOfDay: updated.timeOfDay,
        startTime: updated.startTime,
        endTime: updated.endTime,
        day: updated.day,
      },
    };
  }
}
