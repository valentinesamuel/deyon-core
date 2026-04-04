import { Injectable, ForbiddenException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { NotificationsService } from '../service/notifications.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { Notification } from '@modules/core/entities/notification.entity';

type TParams = { id: string };
type TResult = { notification: Notification };

@Injectable()
export class MarkNotificationReadUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();
    const existing = await this.notificationsService.getNotificationOrFail(
      { where: { id: params.id } },
      em,
    );

    if (existing.staffId !== staffId) {
      throw new ForbiddenException("Cannot mark another staff member's notification as read.");
    }

    const notification = await this.notificationsService.updateNotification(
      { id: params.id },
      { isRead: true, readAt: new Date() },
      em,
    );

    return { notification };
  }
}
