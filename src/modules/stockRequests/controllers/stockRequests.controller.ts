import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { CreateStockRequestDto } from '../dto/createStockRequest.dto';
import { ApproveStockRequestDto } from '../dto/approveStockRequest.dto';
import { RejectStockRequestDto } from '../dto/rejectStockRequest.dto';
import { RequestInfoDto } from '../dto/requestInfo.dto';
import { ProvideInfoDto } from '../dto/provideInfo.dto';
import { CreateStockRequestUsecase } from '../usecases/createStockRequest.uc';
import { FetchAllStockRequestsUsecase } from '../usecases/fetchAllStockRequests.uc';
import { FetchStockRequestByIdUsecase } from '../usecases/fetchStockRequestById.uc';
import { ApproveStockRequestUsecase } from '../usecases/approveStockRequest.uc';
import { RejectStockRequestUsecase } from '../usecases/rejectStockRequest.uc';
import { ForwardToCmoUsecase } from '../usecases/forwardToCmo.uc';
import { RequestInfoUsecase } from '../usecases/requestInfo.uc';
import { ProvideInfoUsecase } from '../usecases/provideInfo.uc';

@ApiTags('Stock Requests')
@Controller('stock-requests')
export class StockRequestsController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly createStockRequestUsecase: CreateStockRequestUsecase,
    private readonly fetchAllStockRequestsUsecase: FetchAllStockRequestsUsecase,
    private readonly fetchStockRequestByIdUsecase: FetchStockRequestByIdUsecase,
    private readonly approveStockRequestUsecase: ApproveStockRequestUsecase,
    private readonly rejectStockRequestUsecase: RejectStockRequestUsecase,
    private readonly forwardToCmoUsecase: ForwardToCmoUsecase,
    private readonly requestInfoUsecase: RequestInfoUsecase,
    private readonly provideInfoUsecase: ProvideInfoUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.STOCK_REQUEST.CREATE])
  createStockRequest(@Body() dto: CreateStockRequestDto) {
    return this.serviceBroker.runUsecases([this.createStockRequestUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.STOCK_REQUEST.LIST])
  getAllStockRequests(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllStockRequestsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.STOCK_REQUEST.READ])
  getStockRequestById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchStockRequestByIdUsecase], { id });
  }

  @Patch(':id/approve')
  @RequirePermissions([PERMISSION.STOCK_REQUEST.APPROVE])
  approveStockRequest(@Param('id') id: string, @Body() dto: ApproveStockRequestDto) {
    return this.serviceBroker.runUsecases([this.approveStockRequestUsecase], { id, ...dto });
  }

  @Patch(':id/reject')
  @RequirePermissions([PERMISSION.STOCK_REQUEST.REJECT])
  rejectStockRequest(@Param('id') id: string, @Body() dto: RejectStockRequestDto) {
    return this.serviceBroker.runUsecases([this.rejectStockRequestUsecase], { id, ...dto });
  }

  @Patch(':id/forward-to-cmo')
  @RequirePermissions([PERMISSION.STOCK_REQUEST.ESCALATE])
  forwardToCmo(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.forwardToCmoUsecase], { id });
  }

  @Patch(':id/request-info')
  @RequirePermissions([PERMISSION.STOCK_REQUEST.REQUEST_INFO])
  requestInfo(@Param('id') id: string, @Body() dto: RequestInfoDto) {
    return this.serviceBroker.runUsecases([this.requestInfoUsecase], { id, ...dto });
  }

  @Patch(':id/provide-info')
  @RequirePermissions([PERMISSION.STOCK_REQUEST.PROVIDE_INFO])
  provideInfo(@Param('id') id: string, @Body() dto: ProvideInfoDto) {
    return this.serviceBroker.runUsecases([this.provideInfoUsecase], { id, ...dto });
  }
}
