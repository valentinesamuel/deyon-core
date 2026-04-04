import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { NotificationsService } from '../service/notifications.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { Notification } from '@modules/core/entities/notification.entity';

type TResult = { notifications: Notification[] };

@Injectable()
export class FetchNotificationsUsecase extends Usecase<TResult, Record<string, never>> {
  readonly config = { requiresTransaction: false };

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(_em: EntityManager): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();
    const notifications = await this.notificationsService.findByStaffId(staffId);
    return { notifications };
  }
}
