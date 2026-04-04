import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { LabOrder } from '@modules/core/entities/labOrder.entity';
import { LabOrderStatusEnum } from '@modules/core/entities/labOrder.enums';

@Injectable()
export class LabOrderRepository extends BaseRepository<LabOrder> {
  private readonly logger = new Logger(LabOrderRepository.name);

  constructor(@InjectRepository(LabOrder) private readonly repo: Repository<LabOrder>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createLabOrder(data: Partial<LabOrder>, em?: EntityManager): Promise<LabOrder> {
    const repo = em ? em.getRepository(LabOrder) : this;
    const order = repo.create(data);
    return repo.save(order);
  }

  findSampleQueue(em?: EntityManager): Promise<LabOrder[]> {
    const repo = em ? em.getRepository(LabOrder) : this;
    return repo.find({
      where: { status: LabOrderStatusEnum.PENDING },
      relations: { patient: true, doctor: true, items: true },
      order: { createdAt: 'ASC' },
    });
  }
}
