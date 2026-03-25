import { Module } from '@nestjs/common';
import { HmoController } from './controllers/hmo.controller';
import { FetchAllHmoProvidersUsecase } from './usecases/fetchAllHmoProviders.uc';
import { HmoProvidersController } from './controllers/hmoProviders.controller';
import { CreateHmoProviderUsecase } from './usecases/createHmoProvider.uc';
import { HmoProviderService } from './service/hmoProvider.service';

@Module({
  controllers: [HmoController, HmoProvidersController],
  providers: [FetchAllHmoProvidersUsecase, CreateHmoProviderUsecase, HmoProviderService],
})
export class HmoModule {}
