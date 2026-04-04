import { Injectable, ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ShiftsService } from '../service/shifts.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Shift, ShiftStatusEnum, ShiftStationEnum } from '@modules/core/entities/shift.entity';
import { OpenShiftDto } from '../dto/openShift.dto';

type TResult = { shift: Shift };

@Injectable()
export class OpenShiftUsecase extends Usecase<TResult, OpenShiftDto> {
  constructor(
    private readonly shiftsService: ShiftsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: OpenShiftDto): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();

    // Lab station: only one active shift at a time globally
    if (params.station === ShiftStationEnum.LAB) {
      const activeCount = await this.shiftsService.countActiveByStation(ShiftStationEnum.LAB, em);
      if (activeCount > 0) {
        throw new ConflictException('Lab station already has an active shift.');
      }
    }

    // Staff cannot have two active shifts simultaneously
    const existingActive = await this.shiftsService.findActiveShiftByStaff(staffId, em);
    if (existingActive) {
      throw new ConflictException(
        'You already have an active shift. Close it before opening a new one.',
      );
    }

    const shift = await this.shiftsService.createShift(
      {
        staffId,
        status: ShiftStatusEnum.IN_PROGRESS,
        station: params.station,
        startedAt: new Date(),
        departmentId: params.departmentId,
        openingBalance: params.openingBalance ?? 0,
        notes: params.notes,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.SHIFT_OPENED,
        module: EventModule.SHIFT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { shiftId: shift.id, station: shift.station },
      },
      em,
    );

    return { shift };
  }
}
