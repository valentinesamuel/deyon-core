import { Module } from '@nestjs/common';
import { QueueController } from './controllers/queue.controller';
import { QueueService } from './service/queue.service';
import { QueueEntryRepository } from '@adapters/repositories/queueEntry.repository';
import { AddToQueueUsecase } from './usecases/addToQueue.uc';
import { FetchAllQueueEntriesUsecase } from './usecases/fetchAllQueueEntries.uc';
import { FetchQueueEntryByIdUsecase } from './usecases/fetchQueueEntryById.uc';
import { CallPatientUsecase } from './usecases/callPatient.uc';
import { CompleteServiceUsecase } from './usecases/completeService.uc';
import { RemoveFromQueueUsecase } from './usecases/removeFromQueue.uc';

@Module({
  controllers: [QueueController],
  providers: [
    QueueService,
    QueueEntryRepository,
    AddToQueueUsecase,
    FetchAllQueueEntriesUsecase,
    FetchQueueEntryByIdUsecase,
    CallPatientUsecase,
    CompleteServiceUsecase,
    RemoveFromQueueUsecase,
  ],
  exports: [QueueService],
})
export class QueueModule {}
