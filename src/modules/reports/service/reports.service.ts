import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Bill, BillStatusEnum } from '@modules/core/entities/bill.entity';
import { Payment } from '@modules/core/entities/payment.entity';
import { Consultation } from '@modules/core/entities/consultation.entity';
import { LabOrder } from '@modules/core/entities/labOrder.entity';
import { Prescription } from '@modules/core/entities/prescription.entity';
import { Inventory } from '@modules/core/entities/inventory.entity';
import { Claim, ClaimStatusEnum } from '@modules/core/entities/claim.entity';

export interface DateRangeParams {
  from?: Date;
  to?: Date;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Bill) private readonly billRepo: Repository<Bill>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Consultation) private readonly consultationRepo: Repository<Consultation>,
    @InjectRepository(LabOrder) private readonly labOrderRepo: Repository<LabOrder>,
    @InjectRepository(Prescription) private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Inventory) private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(Claim) private readonly claimRepo: Repository<Claim>,
  ) {}

  async getFinancialReport(range: DateRangeParams) {
    const dateFilter = range.from && range.to ? { createdAt: Between(range.from, range.to) } : {};

    const [totalBills, paidBills, partialBills, pendingBills] = await Promise.all([
      this.billRepo.count({ where: dateFilter }),
      this.billRepo.count({ where: { ...dateFilter, status: BillStatusEnum.PAID } }),
      this.billRepo.count({ where: { ...dateFilter, status: BillStatusEnum.PARTIAL } }),
      this.billRepo.count({ where: { ...dateFilter, status: BillStatusEnum.PENDING } }),
    ]);

    const revenueResult = await this.billRepo
      .createQueryBuilder('bill')
      .select('COALESCE(SUM(bill.amount_paid), 0)', 'totalCollected')
      .addSelect('COALESCE(SUM(bill.total), 0)', 'totalBilled')
      .addSelect('COALESCE(SUM(bill.balance), 0)', 'totalOutstanding')
      .where(range.from && range.to ? 'bill.created_at BETWEEN :from AND :to' : '1=1', {
        from: range.from,
        to: range.to,
      })
      .getRawOne();

    return {
      totalBills,
      paidBills,
      partialBills,
      pendingBills,
      totalCollected: Number(revenueResult?.totalCollected ?? 0),
      totalBilled: Number(revenueResult?.totalBilled ?? 0),
      totalOutstanding: Number(revenueResult?.totalOutstanding ?? 0),
    };
  }

  async getConsultationsReport(range: DateRangeParams) {
    const dateFilter = range.from && range.to ? { createdAt: Between(range.from, range.to) } : {};

    const total = await this.consultationRepo.count({ where: dateFilter });

    const byStatus = await this.consultationRepo
      .createQueryBuilder('consultation')
      .select('consultation.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(range.from && range.to ? 'consultation.created_at BETWEEN :from AND :to' : '1=1', {
        from: range.from,
        to: range.to,
      })
      .groupBy('consultation.status')
      .getRawMany();

    return { total, byStatus };
  }

  async getLabReport(range: DateRangeParams) {
    const dateFilter = range.from && range.to ? { createdAt: Between(range.from, range.to) } : {};

    const total = await this.labOrderRepo.count({ where: dateFilter });

    const byStatus = await this.labOrderRepo
      .createQueryBuilder('lab_order')
      .select('lab_order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(range.from && range.to ? 'lab_order.created_at BETWEEN :from AND :to' : '1=1', {
        from: range.from,
        to: range.to,
      })
      .groupBy('lab_order.status')
      .getRawMany();

    return { total, byStatus };
  }

  async getPharmacyReport(range: DateRangeParams) {
    const dateFilter = range.from && range.to ? { createdAt: Between(range.from, range.to) } : {};

    const total = await this.prescriptionRepo.count({ where: dateFilter });

    const byStatus = await this.prescriptionRepo
      .createQueryBuilder('prescription')
      .select('prescription.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where(range.from && range.to ? 'prescription.created_at BETWEEN :from AND :to' : '1=1', {
        from: range.from,
        to: range.to,
      })
      .groupBy('prescription.status')
      .getRawMany();

    return { total, byStatus };
  }

  async getInventoryReport() {
    const items = await this.inventoryRepo.find({
      order: { currentStock: 'ASC' },
      take: 100,
    });

    const lowStock = items.filter((i) => i.currentStock <= i.reorderLevel);
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + 30);
    const nearExpiry = items.filter(
      (i) => i.expiryDate && new Date(i.expiryDate) <= expiryThreshold,
    );

    return {
      totalItems: items.length,
      lowStockItems: lowStock.length,
      nearExpiryItems: nearExpiry.length,
      lowStock: lowStock.map((i) => ({
        id: i.id,
        name: i.name,
        currentStock: i.currentStock,
        reorderLevel: i.reorderLevel,
      })),
      nearExpiry: nearExpiry.map((i) => ({
        id: i.id,
        name: i.name,
        expiryDate: i.expiryDate,
        currentStock: i.currentStock,
      })),
    };
  }

  async getClaimsReport(range: DateRangeParams) {
    const dateFilter = range.from && range.to ? { createdAt: Between(range.from, range.to) } : {};

    const [total, draft, submitted, approved, denied, paid, withdrawn] = await Promise.all([
      this.claimRepo.count({ where: dateFilter }),
      this.claimRepo.count({ where: { ...dateFilter, status: ClaimStatusEnum.DRAFT } }),
      this.claimRepo.count({ where: { ...dateFilter, status: ClaimStatusEnum.SUBMITTED } }),
      this.claimRepo.count({ where: { ...dateFilter, status: ClaimStatusEnum.APPROVED } }),
      this.claimRepo.count({ where: { ...dateFilter, status: ClaimStatusEnum.DENIED } }),
      this.claimRepo.count({ where: { ...dateFilter, status: ClaimStatusEnum.PAID } }),
      this.claimRepo.count({ where: { ...dateFilter, status: ClaimStatusEnum.WITHDRAWN } }),
    ]);

    return { total, draft, submitted, approved, denied, paid, withdrawn };
  }

  async getAlertsReport() {
    const lowStockCount = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .where('inventory.current_stock <= inventory.reorder_level')
      .getCount();

    const overdueClaimsCount = await this.claimRepo
      .createQueryBuilder('claim')
      .where('claim.status = :status', { status: ClaimStatusEnum.SUBMITTED })
      .andWhere("claim.created_at < NOW() - INTERVAL '30 days'")
      .getCount();

    return {
      alerts: [
        ...(lowStockCount > 0
          ? [{ type: 'low_stock', count: lowStockCount, severity: 'warning' }]
          : []),
        ...(overdueClaimsCount > 0
          ? [{ type: 'overdue_claim', count: overdueClaimsCount, severity: 'warning' }]
          : []),
      ],
    };
  }
}
