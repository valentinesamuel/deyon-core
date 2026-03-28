import { Module } from '@nestjs/common';
import { HmoController } from './controllers/hmo.controller';
import { FetchAllHmoProvidersUsecase } from './usecases/fetchAllHmoProviders.uc';
import { HmoProvidersController } from './controllers/hmoProviders.controller';
import { CreateHmoProviderUsecase } from './usecases/createHmoProvider.uc';
import { UpdateHmoProviderUsecase } from './usecases/updateHmoProvider.uc';
import { HmoProviderService } from './service/hmoProvider.service';
import { HmoProviderRepository } from '@adapters/repositories/hmoProvider.repository';
import { FetchHmoProviderByCodeUsecase } from './usecases/fetchHmoProviderByCode.uc';

@Module({
  controllers: [HmoController, HmoProvidersController],
  providers: [
    FetchAllHmoProvidersUsecase,
    CreateHmoProviderUsecase,
    UpdateHmoProviderUsecase,
    FetchHmoProviderByCodeUsecase,
    HmoProviderService,
    HmoProviderRepository,
  ],
})
export class HmoModule {}
