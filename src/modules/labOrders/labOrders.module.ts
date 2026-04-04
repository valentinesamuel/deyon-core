import { Module } from '@nestjs/common';
import { LabOrderController } from './controllers/labOrder.controller';
import { LabOrderService } from './service/labOrder.service';
import { LabOrderRepository } from '@adapters/repositories/labOrder.repository';
import { LabOrderItemRepository } from '@adapters/repositories/labOrderItem.repository';
import { LabOrderResultRepository } from '@adapters/repositories/labOrderResult.repository';
import { CreateLabOrderUsecase } from './usecases/createLabOrder.uc';
import { FetchAllLabOrdersUsecase } from './usecases/fetchAllLabOrders.uc';
import { FetchLabOrderByIdUsecase } from './usecases/fetchLabOrderById.uc';
import { CollectSampleUsecase } from './usecases/collectSample.uc';
import { StartProcessingUsecase } from './usecases/startProcessing.uc';
import { EnterLabResultUsecase } from './usecases/enterLabResult.uc';
import { CompleteLabOrderUsecase } from './usecases/completeLabOrder.uc';
import { CancelLabOrderUsecase } from './usecases/cancelLabOrder.uc';
import { FetchSampleQueueUsecase } from './usecases/fetchSampleQueue.uc';
import { StorageModule } from '@adapters/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [LabOrderController],
  providers: [
    LabOrderService,
    LabOrderRepository,
    LabOrderItemRepository,
    LabOrderResultRepository,
    CreateLabOrderUsecase,
    FetchAllLabOrdersUsecase,
    FetchLabOrderByIdUsecase,
    CollectSampleUsecase,
    StartProcessingUsecase,
    EnterLabResultUsecase,
    CompleteLabOrderUsecase,
    CancelLabOrderUsecase,
    FetchSampleQueueUsecase,
  ],
  exports: [LabOrderService],
})
export class LabOrdersModule {}
