import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ShiftsService } from '../service/shifts.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Shift, ShiftStatusEnum } from '@modules/core/entities/shift.entity';
import { CloseShiftDto } from '../dto/closeShift.dto';

type TParams = { id: string } & CloseShiftDto;
type TResult = { shift: Shift };

@Injectable()
export class CloseShiftUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly shiftsService: ShiftsService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.shiftsService.getShiftOrFail({ where: { id: params.id } }, em);

    if (existing.status !== ShiftStatusEnum.IN_PROGRESS) {
      throw new BadRequestException(`Cannot close a shift that is not in progress.`);
    }

    const staffId = this.requestContextService.getUserId();

    if (existing.staffId !== staffId) {
      throw new ForbiddenException('You can only close your own shift.');
    }

    const openingBalance = Number(existing.openingBalance ?? 0);
    const closingBalance = params.closingBalance;
    // expectedBalance = openingBalance + total payments collected during shift (simplified: closingBalance for non-cashier)
    const expectedBalance = openingBalance;
    const variance = closingBalance - expectedBalance;

    const shift = await this.shiftsService.updateShift(
      { id: params.id },
      {
        status: ShiftStatusEnum.COMPLETED,
        endedAt: new Date(),
        closingBalance,
        expectedBalance,
        variance,
        notes: params.notes ?? existing.notes,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.SHIFT_CLOSED,
        module: EventModule.SHIFT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { shiftId: params.id, variance, closingBalance },
      },
      em,
    );

    return { shift };
  }
}
