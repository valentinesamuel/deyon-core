import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AppointmentRepository } from '@adapters/repositories/appointment.repository';
import { Appointment, AppointmentStatusEnum } from '@modules/core/entities/appointment.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  createAppointment(data: Partial<Appointment>, em?: EntityManager) {
    return this.appointmentRepository.createAppointment(data, em);
  }

  getAppointmentOrFail(options: FindResourceOptions<Appointment>, em?: EntityManager) {
    return this.appointmentRepository.findOneOrFailIfNotExists(options, em);
  }

  updateAppointment(id: string, data: Partial<Appointment>, em?: EntityManager) {
    return this.appointmentRepository.updateAppointment(id, data, em);
  }

  updateStatus(
    id: string,
    status: AppointmentStatusEnum,
    extra?: Partial<Appointment>,
    em?: EntityManager,
  ) {
    return this.appointmentRepository.updateAppointmentStatus(id, status, extra, em);
  }
}
