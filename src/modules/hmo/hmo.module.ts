import { Module } from '@nestjs/common';
import { HmoController } from './controllers/hmo.controller';
import { FetchAllHmoProvidersUsecase } from './usecases/fetchAllHmoProviders.uc';
import { HmoProvidersController } from './controllers/hmoProviders.controller';

@Module({
  controllers: [HmoController, HmoProvidersController],
  providers: [FetchAllHmoProvidersUsecase],
})
export class HmoModule {}
