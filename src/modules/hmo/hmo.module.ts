import { Module } from '@nestjs/common';
import { HmoController } from './controllers/hmo.controller';
import { HmoProvidersController } from './controllers/hmoProviders.controller';
import { HmoContractsController } from './controllers/hmoContracts.controller';
import { HmoRulesController } from './controllers/hmoRules.controller';

import { FetchAllHmoProvidersUsecase } from './usecases/hmoProviders/fetchAllHmoProviders.uc';
import { CreateHmoProviderUsecase } from './usecases/hmoProviders/createHmoProvider.uc';
import { UpdateHmoProviderUsecase } from './usecases/hmoProviders/updateHmoProvider.uc';
import { FetchHmoProviderByCodeUsecase } from './usecases/hmoProviders/fetchHmoProviderByCode.uc';
import { FetchHmoProviderByIdUsecase } from './usecases/hmoProviders/fetchHmoProviderById.uc';
import { UpdateHmoProviderStatusUsecase } from './usecases/hmoProviders/updateHmoProviderStatus.uc';

import { FetchAllHmoContractsUsecase } from './usecases/hmoContracts/fetchAllHmoContracts.uc';
import { CreateHmoContractUsecase } from './usecases/hmoContracts/createHmoContract.uc';
import { FetchHmoContractByIdUsecase } from './usecases/hmoContracts/fetchHmoContractById.uc';
import { UpdateHmoContractUsecase } from './usecases/hmoContracts/updateHmoContract.uc';
import { ToggleHmoContractStatusUsecase } from './usecases/hmoContracts/toggleHmoContractStatus.uc';
import { DeleteHmoContractUsecase } from './usecases/hmoContracts/deleteHmoContract.uc';

import { FetchAllHmoRulesUsecase } from './usecases/hmoRules/fetchAllHmoRules.uc';
import { CreateHmoRuleUsecase } from './usecases/hmoRules/createHmoRule.uc';
import { FetchHmoRuleByIdUsecase } from './usecases/hmoRules/fetchHmoRuleById.uc';
import { UpdateHmoRuleUsecase } from './usecases/hmoRules/updateHmoRule.uc';
import { DeleteHmoRuleUsecase } from './usecases/hmoRules/deleteHmoRule.uc';

import { HmoProviderService } from './service/hmoProvider.service';
import { HmoContractService } from './service/hmoContract.service';
import { HmoRulesService } from './service/hmoRules.service';

import { HmoProviderRepository } from '@adapters/repositories/hmoProvider.repository';
import { HmoContractRepository } from '@adapters/repositories/hmoContract.repository';
import { HmoRulesRepository } from '@adapters/repositories/hmoRules.repository';

@Module({
  controllers: [HmoController, HmoProvidersController, HmoContractsController, HmoRulesController],
  providers: [
    // Provider usecases
    FetchAllHmoProvidersUsecase,
    CreateHmoProviderUsecase,
    UpdateHmoProviderUsecase,
    FetchHmoProviderByCodeUsecase,
    FetchHmoProviderByIdUsecase,
    UpdateHmoProviderStatusUsecase,

    // Contract usecases
    FetchAllHmoContractsUsecase,
    CreateHmoContractUsecase,
    FetchHmoContractByIdUsecase,
    UpdateHmoContractUsecase,
    ToggleHmoContractStatusUsecase,
    DeleteHmoContractUsecase,

    // Rule usecases
    FetchAllHmoRulesUsecase,
    CreateHmoRuleUsecase,
    FetchHmoRuleByIdUsecase,
    UpdateHmoRuleUsecase,
    DeleteHmoRuleUsecase,

    // Services
    HmoProviderService,
    HmoContractService,
    HmoRulesService,

    // Repositories
    HmoProviderRepository,
    HmoContractRepository,
    HmoRulesRepository,
  ],
})
export class HmoModule {}
