import { Module } from '@nestjs/common';
import { ServiceCodeCatalogController } from './controllers/serviceCodeCatalog.controller';
import { FetchAllServiceCodeCatalogsUsecase } from './usecases/fetchAllServiceCodeCatalogs.uc';
import { CreateServiceCodeCatalogUsecase } from './usecases/createServiceCodeCatalog.uc';
import { FetchServiceCodeCatalogByIdUsecase } from './usecases/fetchServiceCodeCatalogById.uc';
import { DeleteServiceCodeCatalogUsecase } from './usecases/deleteServiceCodeCatalog.uc';
import { ServiceCodeCatalogService } from './service/serviceCodeCatalog.service';
import { ServiceCodeCatalogRepository } from '@adapters/repositories/serviceCodeCatalog.repository';

@Module({
  controllers: [ServiceCodeCatalogController],
  providers: [
    // Usecases
    FetchAllServiceCodeCatalogsUsecase,
    CreateServiceCodeCatalogUsecase,
    FetchServiceCodeCatalogByIdUsecase,
    DeleteServiceCodeCatalogUsecase,

    // Services
    ServiceCodeCatalogService,

    // Repositories
    ServiceCodeCatalogRepository,
  ],
})
export class ServiceCodeCatalogModule {}
