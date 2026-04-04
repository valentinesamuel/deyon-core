import { Broker } from '@broker/broker';
import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllMedicalServicesUsecase } from '../usecases/fetchAllMedicalServices.uc';
import { CreateMedicalServiceUsecase } from '../usecases/createMedicalService.uc';
import { FetchMedicalServiceByIdUsecase } from '../usecases/fetchMedicalServiceById.uc';
import { UpdateMedicalServiceUsecase } from '../usecases/updateMedicalService.uc';
import { ToggleMedicalServiceStatusUsecase } from '../usecases/toggleMedicalServiceStatus.uc';
import { FetchPendingServiceApprovalsUsecase } from '../usecases/fetchPendingServiceApprovals.uc';
import { ReviewMedicalServiceApprovalUsecase } from '../usecases/reviewMedicalServiceApproval.uc';
import { CreatePriceChangeRequestUsecase } from '../usecases/createPriceChangeRequest.uc';
import { FetchAllPriceChangeRequestsUsecase } from '../usecases/fetchAllPriceChangeRequests.uc';
import { ReviewPriceChangeRequestUsecase } from '../usecases/reviewPriceChangeRequest.uc';
import { ResolvePriceUsecase } from '../usecases/resolvePrice.uc';
import { CreateMedicalServiceDto } from '../dto/createMedicalService.dto';
import { UpdateMedicalServiceDto } from '../dto/updateMedicalService.dto';
import { UpdateMedicalServiceStatusDto } from '../dto/updateMedicalServiceStatus.dto';
import { ReviewMedicalServiceApprovalDto } from '../dto/reviewMedicalServiceApproval.dto';
import { CreatePriceChangeRequestDto } from '../dto/createPriceChangeRequest.dto';
import { ReviewPriceChangeRequestDto } from '../dto/reviewPriceChangeRequest.dto';
import { ResolvePriceDto } from '../dto/resolvePrice.dto';

@Controller('services')
export class MedicalServiceController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllMedicalServicesUsecase: FetchAllMedicalServicesUsecase,
    private readonly createMedicalServiceUsecase: CreateMedicalServiceUsecase,
    private readonly fetchMedicalServiceByIdUsecase: FetchMedicalServiceByIdUsecase,
    private readonly updateMedicalServiceUsecase: UpdateMedicalServiceUsecase,
    private readonly toggleMedicalServiceStatusUsecase: ToggleMedicalServiceStatusUsecase,
    private readonly fetchPendingServiceApprovalsUsecase: FetchPendingServiceApprovalsUsecase,
    private readonly reviewMedicalServiceApprovalUsecase: ReviewMedicalServiceApprovalUsecase,
    private readonly createPriceChangeRequestUsecase: CreatePriceChangeRequestUsecase,
    private readonly fetchAllPriceChangeRequestsUsecase: FetchAllPriceChangeRequestsUsecase,
    private readonly reviewPriceChangeRequestUsecase: ReviewPriceChangeRequestUsecase,
    private readonly resolvePriceUsecase: ResolvePriceUsecase,
  ) {}

  @Get('approvals')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE.APPROVE])
  async fetchPendingServiceApprovals(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchPendingServiceApprovalsUsecase], { query });
  }

  @Patch('approvals/:id')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE.APPROVE])
  async reviewMedicalServiceApproval(
    @Param('id') id: string,
    @Body() dto: ReviewMedicalServiceApprovalDto,
  ) {
    return this.serviceBroker.runUsecases([this.reviewMedicalServiceApprovalUsecase], { id, dto });
  }

  @Get('price-approvals')
  @RequirePermissions([PERMISSION.PRICE_CHANGE.LIST])
  async fetchAllPriceChangeRequests(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllPriceChangeRequestsUsecase], { query });
  }

  @Post('price-approvals')
  @RequirePermissions([PERMISSION.PRICE_CHANGE.CREATE])
  async createPriceChangeRequest(@Body() dto: CreatePriceChangeRequestDto) {
    return this.serviceBroker.runUsecases([this.createPriceChangeRequestUsecase], dto);
  }

  @Patch('price-approvals/:id')
  @RequirePermissions([PERMISSION.PRICE_CHANGE.APPROVE])
  async reviewPriceChangeRequest(
    @Param('id') id: string,
    @Body() dto: ReviewPriceChangeRequestDto,
  ) {
    return this.serviceBroker.runUsecases([this.reviewPriceChangeRequestUsecase], { id, dto });
  }

  @Post('resolve-price')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE.READ])
  async resolvePrice(@Body() dto: ResolvePriceDto) {
    return this.serviceBroker.runUsecases([this.resolvePriceUsecase], dto);
  }

  @Get('')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE.LIST])
  async getAllMedicalServices(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllMedicalServicesUsecase], { query });
  }

  @Post('')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE.CREATE])
  async createMedicalService(@Body() dto: CreateMedicalServiceDto) {
    return this.serviceBroker.runUsecases([this.createMedicalServiceUsecase], dto);
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE.READ])
  async getMedicalServiceById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchMedicalServiceByIdUsecase], { id });
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE.UPDATE])
  async updateMedicalService(@Param('id') id: string, @Body() dto: UpdateMedicalServiceDto) {
    return this.serviceBroker.runUsecases([this.updateMedicalServiceUsecase], { id, dto });
  }

  @Patch(':id/status')
  @RequirePermissions([PERMISSION.MEDICAL_SERVICE.UPDATE])
  async toggleMedicalServiceStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalServiceStatusDto,
  ) {
    return this.serviceBroker.runUsecases([this.toggleMedicalServiceStatusUsecase], { id, dto });
  }
}
