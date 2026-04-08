import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PatientService } from '../service/patient.service';
import { Patient } from '@modules/core/entities/patient.entity';

type TFetchPatientByIdParams = { id: string };
type TFetchPatientByIdResult = { patient: Patient };

@Injectable()
export class FetchPatientByIdUsecase extends Usecase<
  TFetchPatientByIdResult,
  TFetchPatientByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly patientService: PatientService) {
    super();
  }

  async execute(
    _em: EntityManager,
    params: TFetchPatientByIdParams,
  ): Promise<TFetchPatientByIdResult> {
    const patient = await this.patientService.getPatientOrFail(
      {
        where: { id: params.id },
        relations: {
          lga: {
            state: true,
          },
        },
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
          version: true,
          mrn: true,
          firstname: true,
          email: true,
          phoneNumber: true,
          lastname: true,
          middlename: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          maritalStatus: true,
          address: true,
          nationality: true,
          paymentType: true,
          nextOfKin: true,
          occupation: true,
          isActive: true,
          lgaId: true,
          lga: {
            id: true,
            name: true,
            state: {
              id: true,
              name: true,
            },
          },
        },
      },
      _em,
    );
    return { patient };
  }
}
