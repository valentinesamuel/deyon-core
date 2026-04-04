import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { Payment } from '@modules/core/entities/payment.entity';

@Injectable()
export class PaymentRepository extends BaseRepository<Payment> {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(@InjectRepository(Payment) private readonly repo: Repository<Payment>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createPayment(data: Partial<Payment>, em?: EntityManager): Promise<Payment> {
    const repo = em ? em.getRepository(Payment) : this;
    const payment = repo.create(data);
    return repo.save(payment);
  }

  async generateReceiptNumber(em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const result = await em.query(`SELECT nextval('receipt_number_seq') AS seq`);
    const seq = String(result[0].seq).padStart(6, '0');
    return `RCP-${year}-${seq}`;
  }

  findByBillId(billId: string, em?: EntityManager): Promise<Payment[]> {
    const repo = em ? em.getRepository(Payment) : this;
    return repo.find({ where: { billId }, order: { createdAt: 'DESC' } });
  }
}
