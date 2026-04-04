import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DepartmentService } from '../service/department.service';

type TGetDepartmentResult = {
  department: {
    id: string;
    createdAt: Date;
    name: string;
    alias: string;
  };
};

type TGetDepartmentByIdParams = { id: string };

@Injectable()
export class FetchDepartmentByIdUsecase extends Usecase<
  TGetDepartmentResult,
  TGetDepartmentByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly departmentService: DepartmentService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TGetDepartmentByIdParams,
  ): Promise<TGetDepartmentResult> {
    const department = await this.departmentService.getDepartmentByDataOrFailIfNotExists(
      {
        where: {
          id: params.id,
        },
        select: {
          id: true,
          createdAt: true,
          name: true,
          alias: true,
        },
      },
      em,
    );

    return {
      department: {
        id: department.id,
        createdAt: department.createdAt,
        name: department.name,
        alias: department.alias,
      },
    };
  }
}
