import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { CreateLabReferralDto } from '../dto/createLabReferral.dto';
import { ReceiveResultsDto } from '../dto/receiveResults.dto';
import { CreateLabReferralUsecase } from '../usecases/createLabReferral.uc';
import { FetchAllLabReferralsUsecase } from '../usecases/fetchAllLabReferrals.uc';
import { FetchLabReferralByIdUsecase } from '../usecases/fetchLabReferralById.uc';
import { DispatchReferralUsecase } from '../usecases/dispatchReferral.uc';
import { ReceiveResultsUsecase } from '../usecases/receiveResults.uc';
import { CompleteReferralUsecase } from '../usecases/completeReferral.uc';

@ApiTags('Lab Referrals')
@Controller('lab/referrals')
export class LabReferralsController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly createLabReferralUsecase: CreateLabReferralUsecase,
    private readonly fetchAllLabReferralsUsecase: FetchAllLabReferralsUsecase,
    private readonly fetchLabReferralByIdUsecase: FetchLabReferralByIdUsecase,
    private readonly dispatchReferralUsecase: DispatchReferralUsecase,
    private readonly receiveResultsUsecase: ReceiveResultsUsecase,
    private readonly completeReferralUsecase: CompleteReferralUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.LAB_REFERRAL.CREATE])
  createReferral(@Body() dto: CreateLabReferralDto) {
    return this.serviceBroker.runUsecases([this.createLabReferralUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.LAB_REFERRAL.LIST])
  getAllReferrals(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllLabReferralsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.LAB_REFERRAL.READ])
  getReferralById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchLabReferralByIdUsecase], { id });
  }

  @Patch(':id/dispatch')
  @RequirePermissions([PERMISSION.LAB_REFERRAL.DISPATCH])
  dispatchReferral(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.dispatchReferralUsecase], { id });
  }

  @Post(':id/results')
  @RequirePermissions([PERMISSION.LAB_REFERRAL.RECEIVE_RESULTS])
  receiveResults(@Param('id') id: string, @Body() dto: ReceiveResultsDto) {
    return this.serviceBroker.runUsecases([this.receiveResultsUsecase], { id, ...dto });
  }

  @Patch(':id/complete')
  @RequirePermissions([PERMISSION.LAB_REFERRAL.COMPLETE])
  completeReferral(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.completeReferralUsecase], { id });
  }
}
