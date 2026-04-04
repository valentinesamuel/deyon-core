import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { AddToQueueDto } from '../dto/addToQueue.dto';
import { AddToQueueUsecase } from '../usecases/addToQueue.uc';
import { FetchAllQueueEntriesUsecase } from '../usecases/fetchAllQueueEntries.uc';
import { FetchQueueEntryByIdUsecase } from '../usecases/fetchQueueEntryById.uc';
import { CallPatientUsecase } from '../usecases/callPatient.uc';
import { CompleteServiceUsecase } from '../usecases/completeService.uc';
import { RemoveFromQueueUsecase } from '../usecases/removeFromQueue.uc';

@ApiTags('Queue')
@Controller('queue')
export class QueueController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly addToQueueUsecase: AddToQueueUsecase,
    private readonly fetchAllQueueEntriesUsecase: FetchAllQueueEntriesUsecase,
    private readonly fetchQueueEntryByIdUsecase: FetchQueueEntryByIdUsecase,
    private readonly callPatientUsecase: CallPatientUsecase,
    private readonly completeServiceUsecase: CompleteServiceUsecase,
    private readonly removeFromQueueUsecase: RemoveFromQueueUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.QUEUE.CREATE])
  addToQueue(@Body() dto: AddToQueueDto) {
    return this.serviceBroker.runUsecases([this.addToQueueUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.QUEUE.LIST])
  getAllQueueEntries(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllQueueEntriesUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.QUEUE.READ])
  getQueueEntryById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchQueueEntryByIdUsecase], { id });
  }

  @Patch(':id/call')
  @RequirePermissions([PERMISSION.QUEUE.CALL])
  callPatient(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.callPatientUsecase], { id });
  }

  @Patch(':id/complete')
  @RequirePermissions([PERMISSION.QUEUE.COMPLETE])
  completeService(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.completeServiceUsecase], { id });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.QUEUE.REMOVE])
  removeFromQueue(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.removeFromQueueUsecase], { id });
  }
}
