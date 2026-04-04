import { Module } from '@nestjs/common';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsService } from './service/notifications.service';
import { NotificationRepository } from '@adapters/repositories/notification.repository';
import { FetchNotificationsUsecase } from './usecases/fetchNotifications.uc';
import { MarkNotificationReadUsecase } from './usecases/markNotificationRead.uc';
import { MarkAllNotificationsReadUsecase } from './usecases/markAllNotificationsRead.uc';
import { DeleteNotificationUsecase } from './usecases/deleteNotification.uc';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationRepository,
    FetchNotificationsUsecase,
    MarkNotificationReadUsecase,
    MarkAllNotificationsReadUsecase,
    DeleteNotificationUsecase,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
