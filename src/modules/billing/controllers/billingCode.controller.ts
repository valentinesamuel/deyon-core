import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GenerateBillingCodeDto } from '../dto/generateBillingCode.dto';
import { GenerateBillingCodeUsecase } from '../usecases/generateBillingCode.uc';
import { ValidateBillingCodeUsecase } from '../usecases/validateBillingCode.uc';

@ApiTags('Billing Codes')
@Controller('billing-codes')
export class BillingCodeController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly generateBillingCodeUsecase: GenerateBillingCodeUsecase,
    private readonly validateBillingCodeUsecase: ValidateBillingCodeUsecase,
  ) {}

  @Post('generate')
  @RequirePermissions([PERMISSION.BILLING.GENERATE_CODE])
  generateBillingCode(@Body() dto: GenerateBillingCodeDto) {
    return this.serviceBroker.runUsecases([this.generateBillingCodeUsecase], dto);
  }

  @Get(':code/validate')
  @RequirePermissions([PERMISSION.BILLING.VALIDATE_CODE])
  validateBillingCode(@Param('code') code: string) {
    return this.serviceBroker.runUsecases([this.validateBillingCodeUsecase], { code });
  }
}
