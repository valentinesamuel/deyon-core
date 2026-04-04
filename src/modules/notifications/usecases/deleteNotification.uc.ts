import { Injectable, ForbiddenException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { NotificationsService } from '../service/notifications.service';
import { RequestContextService } from '@shared/context/requestContext.service';

type TParams = { id: string };
type TResult = { success: true };

@Injectable()
export class DeleteNotificationUsecase extends Usecase<TResult, TParams> {
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
      throw new ForbiddenException("Cannot delete another staff member's notification.");
    }

    await this.notificationsService.deleteNotification({ id: params.id }, em);
    return { success: true };
  }
}
