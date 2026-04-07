import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ShiftsService } from '../service/shifts.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { Shift } from '@modules/core/entities/shift.entity';

type TResult = { shift: Shift | null };

@Injectable()
export class FetchActiveShiftUsecase extends Usecase<TResult, Record<string, never>> {
  readonly config = { requiresTransaction: false };

  constructor(
    private readonly shiftsService: ShiftsService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(_em: EntityManager): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();
    const shift = await this.shiftsService.findActiveShiftByStaff(staffId);
    return { shift: shift ?? null };
  }
}
