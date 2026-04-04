import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ShiftsService } from '../service/shifts.service';
import { Shift } from '@modules/core/entities/shift.entity';

type TParams = { id: string };
type TResult = { shift: Shift };

@Injectable()
export class FetchShiftByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly shiftsService: ShiftsService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const shift = await this.shiftsService.getShiftOrFail({
      where: { id: params.id },
      relations: { staff: true, department: true, payments: true },
    });
    return { shift };
  }
}
