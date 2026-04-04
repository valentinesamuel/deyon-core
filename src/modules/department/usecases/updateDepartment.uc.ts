import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DepartmentService } from '../service/department.service';
import { UpdateDepartmentDto } from '../dto/updateDepartment.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TUpdateDepartmentResult = {
  department: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
    alias: string;
  };
};

type TUpdateDepartmentParams = { id: string; dto: UpdateDepartmentDto };

@Injectable()
export class UpdateDepartmentUsecase extends Usecase<
  TUpdateDepartmentResult,
  TUpdateDepartmentParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly departmentService: DepartmentService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TUpdateDepartmentParams,
  ): Promise<TUpdateDepartmentResult> {
    const { id, dto } = params;

    await this.departmentService.getDepartmentByDataOrFailIfNotExists({ where: { id } }, em);

    const updated = await this.departmentService.updateDepartment(
      id,
      {
        name: dto.name,
        alias: dto.alias,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.DEPARTMENT_UPDATED,
        module: EventModule.DEPARTMENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          id,
          name: dto.name,
          alias: dto.alias,
        },
      },
      em,
    );

    return {
      department: {
        id: updated.id,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        name: updated.name,
        alias: updated.alias,
      },
    };
  }
}
