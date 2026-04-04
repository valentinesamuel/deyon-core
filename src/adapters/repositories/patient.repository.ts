import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindManyOptions, ILike, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Patient } from '@modules/core/entities/patient.entity';

@Injectable()
export class PatientRepository extends BaseRepository<Patient> {
  private readonly logger = new Logger(PatientRepository.name);

  constructor(@InjectRepository(Patient) private readonly repo: Repository<Patient>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createPatient(data: Partial<Patient>, em?: EntityManager): Promise<Patient> {
    const repo = em ? em.getRepository(Patient) : this;
    const patient = repo.create(data);
    return repo.save(patient);
  }

  updatePatient(id: string, data: Partial<Patient>, em?: EntityManager): Promise<Patient> {
    const entityManager = em ?? this.manager;
    return this.updateExistingRecord({ id }, data as any, entityManager);
  }

  async softDeletePatient(id: string, em?: EntityManager): Promise<Patient> {
    const entityManager = em ?? this.manager;
    const patient = await this.findOneOrFailIfNotExists({ where: { id } }, entityManager);
    return entityManager.getRepository(Patient).softRemove(patient);
  }

  searchPatients(q: string, em?: EntityManager): Promise<Patient[]> {
    const repo = em ? em.getRepository(Patient) : this;
    return repo.find({
      where: [
        { firstname: ILike(`%${q}%`) },
        { lastname: ILike(`%${q}%`) },
        { mrn: ILike(`%${q}%`) },
        { phoneNumber: ILike(`%${q}%`) },
      ],
      take: 20,
    });
  }

  findPatients(options: FindManyOptions<Patient>, em?: EntityManager): Promise<Patient[]> {
    const repo = em ? em.getRepository(Patient) : this;
    return repo.find(options);
  }
}
