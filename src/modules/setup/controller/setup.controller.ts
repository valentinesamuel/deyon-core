import { Broker } from '@broker/broker';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public } from '@shared/decorators/isPublic.decorator';
import { SetupNotCompleteGuard } from '../guards/setupNotComplete.guard';
import { SystemConfigRepository } from '@adapters/repositories/systemConfig.repository';
import { RegisterCmoDto } from '../dto/registerCmo.dto';
import { BootstrapSystemDto } from '../dto/bootstrapSystem.dto';
import { RegisterCmoUsecase } from '../usecases/registerCmo.uc';
import { BootstrapSystemUsecase } from '../usecases/bootstrapSystem.uc';

@Controller('setup')
export class SetupController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly systemConfigRepository: SystemConfigRepository,
    private readonly registerCmoUc: RegisterCmoUsecase,
    private readonly bootstrapSystemUc: BootstrapSystemUsecase,
  ) {}

  @Public()
  @Get('status')
  async getStatus() {
    const config = await this.systemConfigRepository.findByKey('setup_complete');
    const completed = (config?.value as { completed?: boolean })?.completed === true;
    return { completed };
  }

  @Public()
  @UseGuards(SetupNotCompleteGuard)
  @Post('register')
  register(@Body() dto: RegisterCmoDto) {
    return this.serviceBroker.runUsecases([this.registerCmoUc], dto);
  }

  @UseGuards(SetupNotCompleteGuard)
  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapSystemDto) {
    return this.serviceBroker.runUsecases([this.bootstrapSystemUc], dto);
  }
}
