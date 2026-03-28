import { Body, Controller, Delete, Get, Logger, Param, Post } from '@nestjs/common';
import { Broker } from '@broker/broker';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { PERMISSION } from '@shared/constants/permissions';
import { GeneratePatUsecase } from '../usecases/generatePat.uc';
import { ListPatsUsecase } from '../usecases/listPats.uc';
import { RevokePatUsecase } from '../usecases/revokePat.uc';
import { CreatePatDto } from '../dto/createPat.dto';

@Controller('pat')
export class PatController {
  private readonly logger = new Logger(PatController.name);

  constructor(
    private readonly broker: Broker,
    private readonly generatePatUsecase: GeneratePatUsecase,
    private readonly listPatsUsecase: ListPatsUsecase,
    private readonly revokePatUsecase: RevokePatUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.PAT.GENERATE])
  generatePat(@Body() dto: CreatePatDto) {
    return this.broker.runUsecases([this.generatePatUsecase], dto);
  }

  @Get('')
  listPats() {
    return this.broker.runUsecases([this.listPatsUsecase], {});
  }

  @Delete(':id')
  revokePat(@Param('id') id: string) {
    return this.broker.runUsecases([this.revokePatUsecase], { id });
  }
}
