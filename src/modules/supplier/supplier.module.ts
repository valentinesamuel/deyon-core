import { Module } from '@nestjs/common';
import { SupplierController } from './controllers/supplier.controller';
import { FetchAllSuppliersUsecase } from './usecases/fetchAllSuppliers.uc';
import { CreateSupplierUsecase } from './usecases/createSupplier.uc';
import { UpdateSupplierUsecase } from './usecases/updateSupplier.uc';
import { FetchSupplierByIdUsecase } from './usecases/fetchSupplierById.uc';
import { ToggleSupplierStatusUsecase } from './usecases/toggleSupplierStatus.uc';
import { SupplierService } from './service/supplier.service';
import { SupplierRepository } from '@adapters/repositories/supplier.repository';

@Module({
  controllers: [SupplierController],
  providers: [
    FetchAllSuppliersUsecase,
    CreateSupplierUsecase,
    UpdateSupplierUsecase,
    FetchSupplierByIdUsecase,
    ToggleSupplierStatusUsecase,
    SupplierService,
    SupplierRepository,
  ],
})
export class SupplierModule {}
