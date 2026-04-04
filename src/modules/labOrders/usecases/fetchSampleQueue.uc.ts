import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { LabOrderService } from '../service/labOrder.service';
import { LabOrder } from '@modules/core/entities/labOrder.entity';

type TResult = { queue: LabOrder[] };

@Injectable()
export class FetchSampleQueueUsecase extends Usecase<TResult, Record<string, never>> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly labOrderService: LabOrderService) {
    super();
  }

  async execute(_em: EntityManager, _params: Record<string, never>): Promise<TResult> {
    const queue = await this.labOrderService.findSampleQueue();
    return { queue };
  }
}
