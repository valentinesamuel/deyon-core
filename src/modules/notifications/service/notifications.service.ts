import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { NotificationRepository } from '@adapters/repositories/notification.repository';
import { Notification, NotificationTypeEnum } from '@modules/core/entities/notification.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

export interface SendNotificationParams {
  staffId: string;
  type: NotificationTypeEnum;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly notificationRepository: NotificationRepository) {}

  async send(params: SendNotificationParams, em?: EntityManager): Promise<Notification> {
    return this.notificationRepository.createNotification(
      {
        staffId: params.staffId,
        type: params.type,
        title: params.title,
        body: params.body,
        metadata: params.metadata ?? null,
        isRead: false,
        readAt: null,
        expiresAt: params.expiresAt ?? null,
      },
      em,
    );
  }

  async getNotificationOrFail(
    options: FindResourceOptions<Notification>,
    em?: EntityManager,
  ): Promise<Notification> {
    return this.notificationRepository.findOneOrFailIfNotExists(options, em);
  }

  async updateNotification(
    criteria: { id: string },
    data: Partial<Notification>,
    em?: EntityManager,
  ): Promise<Notification> {
    return this.notificationRepository.updateExistingRecord(criteria, data as any, em);
  }

  async deleteNotification(criteria: { id: string }, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(Notification) : this.notificationRepository;
    return repo.softDelete(criteria).then(() => undefined);
  }

  async findByStaffId(staffId: string, em?: EntityManager): Promise<Notification[]> {
    return this.notificationRepository.findByStaffId(staffId, em);
  }

  async markAllReadByStaffId(staffId: string, em?: EntityManager): Promise<void> {
    return this.notificationRepository.markAllReadByStaffId(staffId, em);
  }
}
