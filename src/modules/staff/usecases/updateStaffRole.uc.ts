import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateStaffRoleDto } from '@modules/staff/dto/updateStaffRole.dto';
import { RequestMetadata } from '@shared/validations/reqMetadata.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RoleRepository } from '@adapters/repositories/role.repository';

type TUpdateStaffRoleParams = {
  staffId: string;
  params: UpdateStaffRoleDto;
  metadata: RequestMetadata;
};
type TUpdateStaffRoleResult = { updated: boolean };

@Injectable()
export class UpdateStaffRoleUsecase extends Usecase<
  TUpdateStaffRoleResult,
  TUpdateStaffRoleParams
> {
  constructor(
    private readonly staffRepository: StaffRepository,
    private readonly roleRepository: RoleRepository,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TUpdateStaffRoleParams,
  ): Promise<TUpdateStaffRoleResult> {
    const { staffId, params: dto, metadata } = params;
    const { ipAddress, userAgent } = metadata.requestMetadata;
    const actorId = this.requestContextService.getUser()?.id;

    const staff = await this.staffRepository.findOneOrFailIfNotExists({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('Staff not found');

    const role = await this.roleRepository.findRoleById(dto.roleId, em);
    if (!role) throw new NotFoundException('Role not found');

    await this.staffRepository.updateStaffRoleById(staffId, dto.roleId, em);

    await this.eventService.log({
      actorId,
      event: EventType.STAFF_ROLE_REASSIGNED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
      metadata: { staffId, newRoleId: dto.roleId },
    });

    return { updated: true };
  }
}
