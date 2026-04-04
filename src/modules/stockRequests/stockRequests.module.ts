import { Module } from '@nestjs/common';
import { StockRequestsController } from './controllers/stockRequests.controller';
import { StockRequestsService } from './service/stockRequests.service';
import { RestockRequestRepository } from '@adapters/repositories/restockRequest.repository';
import { RestockRequestItemRepository } from '@adapters/repositories/restockRequestItem.repository';
import { CreateStockRequestUsecase } from './usecases/createStockRequest.uc';
import { FetchAllStockRequestsUsecase } from './usecases/fetchAllStockRequests.uc';
import { FetchStockRequestByIdUsecase } from './usecases/fetchStockRequestById.uc';
import { ApproveStockRequestUsecase } from './usecases/approveStockRequest.uc';
import { RejectStockRequestUsecase } from './usecases/rejectStockRequest.uc';
import { ForwardToCmoUsecase } from './usecases/forwardToCmo.uc';
import { RequestInfoUsecase } from './usecases/requestInfo.uc';
import { ProvideInfoUsecase } from './usecases/provideInfo.uc';

@Module({
  controllers: [StockRequestsController],
  providers: [
    StockRequestsService,
    RestockRequestRepository,
    RestockRequestItemRepository,
    CreateStockRequestUsecase,
    FetchAllStockRequestsUsecase,
    FetchStockRequestByIdUsecase,
    ApproveStockRequestUsecase,
    RejectStockRequestUsecase,
    ForwardToCmoUsecase,
    RequestInfoUsecase,
    ProvideInfoUsecase,
  ],
  exports: [StockRequestsService],
})
export class StockRequestsModule {}
