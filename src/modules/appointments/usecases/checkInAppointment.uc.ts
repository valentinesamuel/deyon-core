import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AppointmentService } from '../service/appointment.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Appointment, AppointmentStatusEnum } from '@modules/core/entities/appointment.entity';
import { Episode, EpisodeStatusEnum } from '@modules/core/entities/episode.entity';
import {
  QueueEntry,
  QueuePaymentStatusEnum,
  QueuePriorityEnum,
  QueueTypeEnum,
} from '@modules/core/entities/queueEntry.entity';

type TCheckInAppointmentParams = { id: string };
type TCheckInAppointmentResult = {
  appointment: Appointment;
  episode: Episode;
  queueEntry: QueueEntry;
};

@Injectable()
export class CheckInAppointmentUsecase extends Usecase<
  TCheckInAppointmentResult,
  TCheckInAppointmentParams
> {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TCheckInAppointmentParams,
  ): Promise<TCheckInAppointmentResult> {
    const { id } = params;
    const actorId = this.requestContextService.getUserId();

    const existing = await this.appointmentService.getAppointmentOrFail({ where: { id } }, em);

    if (
      existing.status !== AppointmentStatusEnum.SCHEDULED &&
      existing.status !== AppointmentStatusEnum.CONFIRMED
    ) {
      throw new BadRequestException('Appointment must be scheduled or confirmed to check in');
    }

    // 1. Open an Episode
    const year = new Date().getFullYear();
    const seq: { nextval: string }[] = await em.query(`SELECT nextval('episode_number_seq')`);
    const episodeNumber = `EP-${year}-${String(seq[0].nextval).padStart(5, '0')}`;

    const episode = em.getRepository(Episode).create({
      patientId: existing.patientId,
      episodeNumber,
      status: EpisodeStatusEnum.OPEN,
    });
    const savedEpisode = await em.getRepository(Episode).save(episode);

    // 2. Create a QueueEntry (triage)
    const queueEntry = em.getRepository(QueueEntry).create({
      patientId: existing.patientId,
      episodeId: savedEpisode.id,
      queueType: QueueTypeEnum.TRIAGE,
      priority: QueuePriorityEnum.NORMAL,
      paymentStatus: QueuePaymentStatusEnum.PENDING,
      enteredAt: new Date(),
    });
    const savedQueue = await em.getRepository(QueueEntry).save(queueEntry);

    // 3. Update appointment status
    const appointment = await this.appointmentService.updateStatus(
      id,
      AppointmentStatusEnum.CHECKED_IN,
      { checkedInAt: new Date(), checkedInBy: actorId },
      em,
    );

    await this.eventService.log(
      {
        actorId,
        event: EventType.APPOINTMENT_CHECKED_IN,
        module: EventModule.APPOINTMENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          appointmentId: id,
          episodeId: savedEpisode.id,
          queueEntryId: savedQueue.id,
        },
      },
      em,
    );

    return { appointment, episode: savedEpisode, queueEntry: savedQueue };
  }
}
