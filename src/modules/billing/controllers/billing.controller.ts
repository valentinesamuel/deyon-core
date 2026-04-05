import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { CreateBillDto } from '../dto/createBill.dto';
import { AddBillItemsDto } from '../dto/addBillItems.dto';
import { RecordPaymentDto } from '../dto/recordPayment.dto';
import { RefundPaymentDto } from '../dto/refundPayment.dto';
import { CreateBillUsecase } from '../usecases/createBill.uc';
import { FetchAllBillsUsecase } from '../usecases/fetchAllBills.uc';
import { FetchBillByIdUsecase } from '../usecases/fetchBillById.uc';
import { AddBillItemsUsecase } from '../usecases/addBillItems.uc';
import { RecordPaymentUsecase } from '../usecases/recordPayment.uc';
import { RefundPaymentUsecase } from '../usecases/refundPayment.uc';
import { FetchAllPaymentsUsecase } from '../usecases/fetchAllPayments.uc';

@ApiTags('Billing')
@Controller('bills')
export class BillingController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly createBillUsecase: CreateBillUsecase,
    private readonly fetchAllBillsUsecase: FetchAllBillsUsecase,
    private readonly fetchBillByIdUsecase: FetchBillByIdUsecase,
    private readonly addBillItemsUsecase: AddBillItemsUsecase,
    private readonly recordPaymentUsecase: RecordPaymentUsecase,
    private readonly refundPaymentUsecase: RefundPaymentUsecase,
    private readonly fetchAllPaymentsUsecase: FetchAllPaymentsUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.BILLING.CREATE])
  createBill(@Body() dto: CreateBillDto) {
    return this.serviceBroker.runUsecases([this.createBillUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.BILLING.LIST])
  getAllBills(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllBillsUsecase], { query });
  }

  @Get('payments')
  @RequirePermissions([PERMISSION.BILLING.LIST])
  getAllPayments(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllPaymentsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.BILLING.READ])
  getBillById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchBillByIdUsecase], { id });
  }

  @Patch(':id/items')
  @RequirePermissions([PERMISSION.BILLING.MANAGE_ITEMS])
  addBillItems(@Param('id') id: string, @Body() dto: AddBillItemsDto) {
    return this.serviceBroker.runUsecases([this.addBillItemsUsecase], { id, ...dto });
  }

  @Post(':id/payments')
  @RequirePermissions([PERMISSION.BILLING.RECORD_PAYMENT])
  recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.serviceBroker.runUsecases([this.recordPaymentUsecase], { id, ...dto });
  }

  @Post(':id/refund')
  @RequirePermissions([PERMISSION.BILLING.REFUND])
  refundPayment(@Param('id') id: string, @Body() dto: RefundPaymentDto) {
    return this.serviceBroker.runUsecases([this.refundPaymentUsecase], { id, ...dto });
  }
}
