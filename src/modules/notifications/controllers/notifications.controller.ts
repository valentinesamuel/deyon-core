import { Controller, Delete, Get, MessageEvent, Param, Patch, Sse } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { Observable, from, interval, switchMap } from 'rxjs';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { RequestContextService } from '@shared/context/requestContext.service';
import { NotificationsService } from '../service/notifications.service';
import { FetchNotificationsUsecase } from '../usecases/fetchNotifications.uc';
import { MarkNotificationReadUsecase } from '../usecases/markNotificationRead.uc';
import { MarkAllNotificationsReadUsecase } from '../usecases/markAllNotificationsRead.uc';
import { DeleteNotificationUsecase } from '../usecases/deleteNotification.uc';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly notificationsService: NotificationsService,
    private readonly requestContextService: RequestContextService,
    private readonly fetchNotificationsUsecase: FetchNotificationsUsecase,
    private readonly markNotificationReadUsecase: MarkNotificationReadUsecase,
    private readonly markAllNotificationsReadUsecase: MarkAllNotificationsReadUsecase,
    private readonly deleteNotificationUsecase: DeleteNotificationUsecase,
  ) {}

  @Get()
  @RequirePermissions([PERMISSION.NOTIFICATION.LIST])
  getNotifications() {
    return this.serviceBroker.runUsecases([this.fetchNotificationsUsecase], {});
  }

  @Patch(':id/read')
  @RequirePermissions([PERMISSION.NOTIFICATION.READ])
  markRead(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.markNotificationReadUsecase], { id });
  }

  @Patch('read-all')
  @RequirePermissions([PERMISSION.NOTIFICATION.READ])
  markAllRead() {
    return this.serviceBroker.runUsecases([this.markAllNotificationsReadUsecase], {});
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.NOTIFICATION.DELETE])
  deleteNotification(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteNotificationUsecase], { id });
  }

  /**
   * Server-Sent Events stream for real-time notifications.
   * Polls the DB every 10 seconds and pushes unread notifications.
   */
  @Sse('stream')
  @RequirePermissions([PERMISSION.NOTIFICATION.LIST])
  stream(): Observable<MessageEvent> {
    const staffId = this.requestContextService.getUserId();
    return interval(10_000).pipe(
      switchMap(() =>
        from(
          this.notificationsService.findByStaffId(staffId).then((notifications) => {
            const unread = notifications.filter((n) => !n.isRead);
            return { data: { notifications: unread } } as MessageEvent;
          }),
        ),
      ),
    );
  }
}
