import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { LabOrderService } from '../service/labOrder.service';
import { LabOrder } from '@modules/core/entities/labOrder.entity';

type TParams = { id: string };
type TResult = { labOrder: LabOrder };

@Injectable()
export class FetchLabOrderByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly labOrderService: LabOrderService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const labOrder = await this.labOrderService.getLabOrderOrFail({
      where: { id: params.id },
      relations: { patient: true, doctor: true, episode: true, items: { result: true } },
    });
    return { labOrder };
  }
}
