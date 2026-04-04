import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Appointment, AppointmentStatusEnum } from '@modules/core/entities/appointment.entity';

@Injectable()
export class AppointmentRepository extends BaseRepository<Appointment> {
  private readonly logger = new Logger(AppointmentRepository.name);

  constructor(@InjectRepository(Appointment) private readonly repo: Repository<Appointment>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createAppointment(data: Partial<Appointment>, em?: EntityManager): Promise<Appointment> {
    const repo = em ? em.getRepository(Appointment) : this;
    const appointment = repo.create(data);
    return repo.save(appointment);
  }

  updateAppointmentStatus(
    id: string,
    status: AppointmentStatusEnum,
    extra?: Partial<Appointment>,
    em?: EntityManager,
  ): Promise<Appointment> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord({ id }, { status, ...extra } as any, entityManager);
  }

  updateAppointment(
    id: string,
    data: Partial<Appointment>,
    em?: EntityManager,
  ): Promise<Appointment> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord({ id }, data as any, entityManager);
  }
}
