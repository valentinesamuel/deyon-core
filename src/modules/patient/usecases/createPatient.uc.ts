import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreatePatientDto } from '../dto/createPatient.dto';
import { PatientService } from '../service/patient.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { GenderEnum, Patient, PaymentTypeEnum } from '@modules/core/entities/patient.entity';

type TCreatePatientResult = {
  id: string;
  mrn: string;
  firstname: string;
  lastname: string;
  phoneNumber: string;
  gender: GenderEnum;
  paymentType: PaymentTypeEnum;
  createdAt: Date;
};

@Injectable()
export class CreatePatientUsecase extends Usecase<TCreatePatientResult, CreatePatientDto> {
  constructor(
    private readonly patientService: PatientService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreatePatientDto): Promise<TCreatePatientResult> {
    const year = new Date().getFullYear();
    const seq: { nextval: string }[] = await em.query(`SELECT nextval('patient_mrn_seq')`);
    const mrn = `CF-${year}-${String(seq[0].nextval).padStart(5, '0')}`;

    const patient = await this.patientService.createPatient(
      {
        ...params,
        mrn,
        isActive: true,
      } as Partial<Patient>,
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.PATIENT_REGISTERED,
        module: EventModule.PATIENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { mrn, patientId: patient.id },
      },
      em,
    );

    return {
      id: patient.id,
      mrn: patient.mrn,
      firstname: patient.firstname,
      lastname: patient.lastname,
      phoneNumber: patient.phoneNumber,
      gender: patient.gender,
      paymentType: patient.paymentType,
      createdAt: patient.createdAt,
    };
  }
}
