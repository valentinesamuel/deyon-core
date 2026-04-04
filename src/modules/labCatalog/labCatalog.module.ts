import { Module } from '@nestjs/common';
import { LabCatalogController } from './controllers/labCatalog.controller';

import { FetchAllTestCatalogsUsecase } from './usecases/fetchAllTestCatalogs.uc';
import { CreateTestCatalogUsecase } from './usecases/createTestCatalog.uc';
import { FetchTestCatalogByIdUsecase } from './usecases/fetchTestCatalogById.uc';
import { UpdateTestCatalogUsecase } from './usecases/updateTestCatalog.uc';
import { FetchReferenceRangesByTestUsecase } from './usecases/fetchReferenceRangesByTest.uc';
import { CreateReferenceRangeUsecase } from './usecases/createReferenceRange.uc';
import { UpdateReferenceRangeUsecase } from './usecases/updateReferenceRange.uc';
import { DeleteReferenceRangeUsecase } from './usecases/deleteReferenceRange.uc';

import { TestCatalogService } from './service/testCatalog.service';
import { ReferenceRangeService } from './service/referenceRange.service';

import { TestCatalogRepository } from '@adapters/repositories/testCatalog.repository';
import { ReferenceRangeRepository } from '@adapters/repositories/referenceRange.repository';

@Module({
  controllers: [LabCatalogController],
  providers: [
    // Usecases
    FetchAllTestCatalogsUsecase,
    CreateTestCatalogUsecase,
    FetchTestCatalogByIdUsecase,
    UpdateTestCatalogUsecase,
    FetchReferenceRangesByTestUsecase,
    CreateReferenceRangeUsecase,
    UpdateReferenceRangeUsecase,
    DeleteReferenceRangeUsecase,

    // Services
    TestCatalogService,
    ReferenceRangeService,

    // Repositories
    TestCatalogRepository,
    ReferenceRangeRepository,
  ],
})
export class LabCatalogModule {}
