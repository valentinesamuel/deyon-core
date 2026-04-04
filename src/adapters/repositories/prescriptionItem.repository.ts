import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { PrescriptionItem } from '@modules/core/entities/prescriptionItem.entity';

@Injectable()
export class PrescriptionItemRepository extends BaseRepository<PrescriptionItem> {
  private readonly logger = new Logger(PrescriptionItemRepository.name);

  constructor(
    @InjectRepository(PrescriptionItem) private readonly repo: Repository<PrescriptionItem>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createMany(items: Partial<PrescriptionItem>[], em?: EntityManager): Promise<PrescriptionItem[]> {
    const repo = em ? em.getRepository(PrescriptionItem) : this;
    const entities = repo.create(items);
    return repo.save(entities);
  }

  findByPrescriptionId(prescriptionId: string, em?: EntityManager): Promise<PrescriptionItem[]> {
    const repo = em ? em.getRepository(PrescriptionItem) : this;
    return repo.find({
      where: { prescriptionId },
      relations: { drug: true, substitutedDrug: true },
    });
  }
}
