import { Module } from '@nestjs/common';
import { ProtocolsController } from './controllers/protocols.controller';

import { FetchAllProtocolBundlesUsecase } from './usecases/fetchAllProtocolBundles.uc';
import { CreateProtocolBundleUsecase } from './usecases/createProtocolBundle.uc';
import { FetchProtocolBundleByIdUsecase } from './usecases/fetchProtocolBundleById.uc';
import { UpdateProtocolBundleUsecase } from './usecases/updateProtocolBundle.uc';
import { DeleteProtocolBundleUsecase } from './usecases/deleteProtocolBundle.uc';
import { FetchProtocolBundleByCodeUsecase } from './usecases/fetchProtocolBundleByCode.uc';
import { AddProtocolBundleItemUsecase } from './usecases/addProtocolBundleItem.uc';
import { RemoveProtocolBundleItemUsecase } from './usecases/removeProtocolBundleItem.uc';

import { ProtocolBundleService } from './service/protocolBundle.service';
import { ProtocolBundleItemService } from './service/protocolBundleItem.service';

import { ProtocolBundleRepository } from '@adapters/repositories/protocolBundle.repository';
import { ProtocolBundleItemRepository } from '@adapters/repositories/protocolBundleItem.repository';

@Module({
  controllers: [ProtocolsController],
  providers: [
    // Usecases
    FetchAllProtocolBundlesUsecase,
    CreateProtocolBundleUsecase,
    FetchProtocolBundleByIdUsecase,
    UpdateProtocolBundleUsecase,
    DeleteProtocolBundleUsecase,
    FetchProtocolBundleByCodeUsecase,
    AddProtocolBundleItemUsecase,
    RemoveProtocolBundleItemUsecase,

    // Services
    ProtocolBundleService,
    ProtocolBundleItemService,

    // Repositories
    ProtocolBundleRepository,
    ProtocolBundleItemRepository,
  ],
})
export class ProtocolsModule {}
