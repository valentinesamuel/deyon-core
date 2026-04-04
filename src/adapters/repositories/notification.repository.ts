import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThan, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Notification } from '@modules/core/entities/notification.entity';

@Injectable()
export class NotificationRepository extends BaseRepository<Notification> {
  constructor(@InjectRepository(Notification) private readonly repo: Repository<Notification>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  async createNotification(data: Partial<Notification>, em?: EntityManager): Promise<Notification> {
    const repo = em ? em.getRepository(Notification) : this;
    const notification = repo.create(data);
    return repo.save(notification);
  }

  async findByStaffId(staffId: string, em?: EntityManager): Promise<Notification[]> {
    const repo = em ? em.getRepository(Notification) : this;
    return repo.find({
      where: { staffId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async markAllReadByStaffId(staffId: string, em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(Notification) : this;
    return repo
      .update({ staffId, isRead: false }, { isRead: true, readAt: new Date() })
      .then(() => undefined);
  }

  purgeExpired(em?: EntityManager): Promise<void> {
    const repo = em ? em.getRepository(Notification) : this;
    return repo.softDelete({ expiresAt: LessThan(new Date()) }).then(() => undefined);
  }
}
