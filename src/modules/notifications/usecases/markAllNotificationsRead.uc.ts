import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { NotificationsService } from '../service/notifications.service';
import { RequestContextService } from '@shared/context/requestContext.service';

type TResult = { success: true };

@Injectable()
export class MarkAllNotificationsReadUsecase extends Usecase<TResult, Record<string, never>> {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();
    await this.notificationsService.markAllReadByStaffId(staffId, em);
    return { success: true };
  }
}
