import { Module } from '@nestjs/common';
import { BillingController } from './controllers/billing.controller';
import { BillingCodeController } from './controllers/billingCode.controller';
import { BillingService } from './service/billing.service';
import { BillRepository } from '@adapters/repositories/bill.repository';
import { BillItemRepository } from '@adapters/repositories/billItem.repository';
import { PaymentRepository } from '@adapters/repositories/payment.repository';
import { BillingCodeRepository } from '@adapters/repositories/billingCode.repository';
import { CreateBillUsecase } from './usecases/createBill.uc';
import { FetchAllBillsUsecase } from './usecases/fetchAllBills.uc';
import { FetchBillByIdUsecase } from './usecases/fetchBillById.uc';
import { AddBillItemsUsecase } from './usecases/addBillItems.uc';
import { RecordPaymentUsecase } from './usecases/recordPayment.uc';
import { RefundPaymentUsecase } from './usecases/refundPayment.uc';
import { GenerateBillingCodeUsecase } from './usecases/generateBillingCode.uc';
import { ValidateBillingCodeUsecase } from './usecases/validateBillingCode.uc';

@Module({
  controllers: [BillingController, BillingCodeController],
  providers: [
    BillingService,
    BillRepository,
    BillItemRepository,
    PaymentRepository,
    BillingCodeRepository,
    CreateBillUsecase,
    FetchAllBillsUsecase,
    FetchBillByIdUsecase,
    AddBillItemsUsecase,
    RecordPaymentUsecase,
    RefundPaymentUsecase,
    GenerateBillingCodeUsecase,
    ValidateBillingCodeUsecase,
  ],
  exports: [BillingService],
})
export class BillingModule {}
