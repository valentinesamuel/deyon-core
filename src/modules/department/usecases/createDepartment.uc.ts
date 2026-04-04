import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateDepartmentDto } from '../dto/createDepartment.dto';
import { DepartmentService } from '../service/department.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateDepartmentResult = {
  id: string;
  createdAt: Date;
  name: string;
  alias: string;
};

@Injectable()
export class CreateDepartmentUsecase extends Usecase<TCreateDepartmentResult, CreateDepartmentDto> {
  constructor(
    private readonly departmentService: DepartmentService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateDepartmentDto): Promise<TCreateDepartmentResult> {
    await this.departmentService.getDepartmentByDataOrFailIfExists(
      {
        where: {
          name: params.name,
        },
      },
      em,
    );

    const newDepartment = await this.departmentService.createDepartment(
      {
        name: params.name,
        alias: params.alias,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.DEPARTMENT_CREATED,
        module: EventModule.DEPARTMENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          name: params.name,
          alias: params.alias,
        },
      },
      em,
    );

    return {
      id: newDepartment.id,
      createdAt: newDepartment.createdAt,
      name: newDepartment.name,
      alias: newDepartment.alias,
    };
  }
}
