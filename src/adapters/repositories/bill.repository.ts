import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Bill } from '@modules/core/entities/bill.entity';

@Injectable()
export class BillRepository extends BaseRepository<Bill> {
  private readonly logger = new Logger(BillRepository.name);

  constructor(@InjectRepository(Bill) private readonly repo: Repository<Bill>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createBill(data: Partial<Bill>, em?: EntityManager): Promise<Bill> {
    const repo = em ? em.getRepository(Bill) : this;
    const bill = repo.create(data);
    return repo.save(bill);
  }

  async generateBillNumber(em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const result = await em.query(`SELECT nextval('bill_number_seq') AS seq`);
    const seq = String(result[0].seq).padStart(5, '0');
    return `BILL-${year}-${seq}`;
  }
}
