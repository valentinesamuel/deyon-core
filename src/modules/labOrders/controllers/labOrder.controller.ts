import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { CreateLabOrderDto } from '../dto/createLabOrder.dto';
import { EnterLabResultDto } from '../dto/enterLabResult.dto';
import { CreateLabOrderUsecase } from '../usecases/createLabOrder.uc';
import { FetchAllLabOrdersUsecase } from '../usecases/fetchAllLabOrders.uc';
import { FetchLabOrderByIdUsecase } from '../usecases/fetchLabOrderById.uc';
import { CollectSampleUsecase } from '../usecases/collectSample.uc';
import { StartProcessingUsecase } from '../usecases/startProcessing.uc';
import { EnterLabResultUsecase } from '../usecases/enterLabResult.uc';
import { CompleteLabOrderUsecase } from '../usecases/completeLabOrder.uc';
import { CancelLabOrderUsecase } from '../usecases/cancelLabOrder.uc';
import { FetchSampleQueueUsecase } from '../usecases/fetchSampleQueue.uc';

@ApiTags('Lab Orders')
@Controller('lab')
export class LabOrderController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly createLabOrderUsecase: CreateLabOrderUsecase,
    private readonly fetchAllLabOrdersUsecase: FetchAllLabOrdersUsecase,
    private readonly fetchLabOrderByIdUsecase: FetchLabOrderByIdUsecase,
    private readonly collectSampleUsecase: CollectSampleUsecase,
    private readonly startProcessingUsecase: StartProcessingUsecase,
    private readonly enterLabResultUsecase: EnterLabResultUsecase,
    private readonly completeLabOrderUsecase: CompleteLabOrderUsecase,
    private readonly cancelLabOrderUsecase: CancelLabOrderUsecase,
    private readonly fetchSampleQueueUsecase: FetchSampleQueueUsecase,
  ) {}

  @Post('orders')
  @RequirePermissions([PERMISSION.LAB_ORDER.CREATE])
  createLabOrder(@Body() dto: CreateLabOrderDto) {
    return this.serviceBroker.runUsecases([this.createLabOrderUsecase], dto);
  }

  @Get('orders')
  @RequirePermissions([PERMISSION.LAB_ORDER.LIST])
  getAllLabOrders(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllLabOrdersUsecase], { query });
  }

  @Get('sample-queue')
  @RequirePermissions([PERMISSION.LAB_ORDER.LIST])
  getSampleQueue() {
    return this.serviceBroker.runUsecases([this.fetchSampleQueueUsecase], {} as any);
  }

  @Get('orders/:id')
  @RequirePermissions([PERMISSION.LAB_ORDER.READ])
  getLabOrderById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchLabOrderByIdUsecase], { id });
  }

  @Patch('orders/:id/collect-sample')
  @RequirePermissions([PERMISSION.LAB_ORDER.COLLECT_SAMPLE])
  collectSample(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.collectSampleUsecase], { id });
  }

  @Patch('orders/:id/start-processing')
  @RequirePermissions([PERMISSION.LAB_ORDER.PROCESS])
  startProcessing(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.startProcessingUsecase], { id });
  }

  @Post('orders/:id/results')
  @RequirePermissions([PERMISSION.LAB_ORDER.ENTER_RESULT])
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('file'))
  enterLabResult(
    @Param('id') id: string,
    @Body() dto: EnterLabResultDto,
    @UploadedFile() file?: { originalname: string; buffer: Buffer; mimetype: string },
  ) {
    return this.serviceBroker.runUsecases([this.enterLabResultUsecase], { id, ...dto, file });
  }

  @Patch('orders/:id/complete')
  @RequirePermissions([PERMISSION.LAB_ORDER.COMPLETE])
  completeLabOrder(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.completeLabOrderUsecase], { id });
  }

  @Delete('orders/:id')
  @RequirePermissions([PERMISSION.LAB_ORDER.CANCEL])
  cancelLabOrder(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.cancelLabOrderUsecase], { id });
  }
}
