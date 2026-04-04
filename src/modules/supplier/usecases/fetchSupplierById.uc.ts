import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { SupplierService } from '../service/supplier.service';

type TGetSupplierResult = {
  supplier: {
    id: string;
    createdAt: Date;
    name: string;
    contactPhone: string;
    contactEmail: string;
    address: string;
    isActive: boolean;
  };
};

type TGetSupplierByIdParams = { id: string };

@Injectable()
export class FetchSupplierByIdUsecase extends Usecase<TGetSupplierResult, TGetSupplierByIdParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly supplierService: SupplierService) {
    super();
  }

  async execute(em: EntityManager, params: TGetSupplierByIdParams): Promise<TGetSupplierResult> {
    const supplier = await this.supplierService.getSupplierByDataOrFailIfNotExists(
      {
        where: {
          id: params.id,
        },
        select: {
          id: true,
          createdAt: true,
          name: true,
          contactPhone: true,
          contactEmail: true,
          address: true,
          isActive: true,
        },
      },
      em,
    );

    return {
      supplier: {
        id: supplier.id,
        createdAt: supplier.createdAt,
        name: supplier.name,
        contactPhone: supplier.contactPhone,
        contactEmail: supplier.contactEmail,
        address: supplier.address,
        isActive: supplier.isActive,
      },
    };
  }
}
