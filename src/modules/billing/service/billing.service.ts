import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { BillRepository } from '@adapters/repositories/bill.repository';
import { BillItemRepository } from '@adapters/repositories/billItem.repository';
import { PaymentRepository } from '@adapters/repositories/payment.repository';
import { BillingCodeRepository } from '@adapters/repositories/billingCode.repository';
import { Bill } from '@modules/core/entities/bill.entity';
import { BillItem } from '@modules/core/entities/billItem.entity';
import { Payment } from '@modules/core/entities/payment.entity';
import { BillingCode } from '@modules/core/entities/billingCode.entity';
import { MedicalServiceDepartmentEnum } from '@modules/core/entities/medicalService.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly billRepository: BillRepository,
    private readonly billItemRepository: BillItemRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly billingCodeRepository: BillingCodeRepository,
  ) {}

  async createBill(data: Partial<Bill>, em: EntityManager): Promise<Bill> {
    const billNumber = await this.billRepository.generateBillNumber(em);
    return this.billRepository.createBill({ ...data, billNumber }, em);
  }

  getBillOrFail(options: FindResourceOptions<Bill>, em?: EntityManager): Promise<Bill> {
    return this.billRepository.findOneOrFailIfNotExists(options, em);
  }

  updateBill(criteria: { id: string }, data: Partial<Bill>, em?: EntityManager): Promise<Bill> {
    return this.billRepository.updateExistingRecord(criteria, data as any, em);
  }

  createBillItems(items: Partial<BillItem>[], em?: EntityManager): Promise<BillItem[]> {
    return this.billItemRepository.createMany(items, em);
  }

  findItemsByBillId(billId: string, em?: EntityManager): Promise<BillItem[]> {
    return this.billItemRepository.findByBillId(billId, em);
  }

  async createPayment(data: Partial<Payment>, em: EntityManager): Promise<Payment> {
    const receiptNumber = await this.paymentRepository.generateReceiptNumber(em);
    return this.paymentRepository.createPayment({ ...data, receiptNumber }, em);
  }

  findPaymentsByBillId(billId: string, em?: EntityManager): Promise<Payment[]> {
    return this.paymentRepository.findByBillId(billId, em);
  }

  async createBillingCode(
    data: Partial<BillingCode>,
    department: MedicalServiceDepartmentEnum,
    em: EntityManager,
  ): Promise<BillingCode> {
    const code = await this.billingCodeRepository.generateCode(department, em);
    return this.billingCodeRepository.createBillingCode({ ...data, code }, em);
  }

  getBillingCodeOrFail(
    options: FindResourceOptions<BillingCode>,
    em?: EntityManager,
  ): Promise<BillingCode> {
    return this.billingCodeRepository.findOneOrFailIfNotExists(options, em);
  }
}
