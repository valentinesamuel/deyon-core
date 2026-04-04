import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateStaffDto } from '../dto/updateStaff.dto';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TUpdateStaffParams = { id: string; dto: UpdateStaffDto };

type TUpdateStaffResult = {
  id: string;
  updatedAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  licenseNumber: string;
  specialization: string;
  roleId: string;
  departmentId: string;
};

@Injectable()
export class UpdateStaffUsecase extends Usecase<TUpdateStaffResult, TUpdateStaffParams> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TUpdateStaffParams): Promise<TUpdateStaffResult> {
    const { id, dto } = params;

    await this.staffRepository.findOneOrFailIfNotExists({ where: { id } }, em);

    const updated = await this.staffRepository.updateExistingRecord({ id }, dto as any, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.STAFF_UPDATED,
        module: EventModule.STAFF,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { staffId: id, ...dto },
      },
      em,
    );

    return {
      id: updated.id,
      updatedAt: updated.updatedAt,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      licenseNumber: updated.licenseNumber,
      specialization: updated.specialization,
      roleId: updated.roleId,
      departmentId: updated.departmentId,
    };
  }
}
