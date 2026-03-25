import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { BulkReassignDto } from '@modules/role/dto/reassignStaff.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';

type TDeleteBulkParams = { id: string; params: BulkReassignDto };
type TDeleteBulkResult = { deleted: boolean; reassigned: number };

@Injectable()
export class DeleteRoleWithBulkReassignUsecase extends Usecase<
  TDeleteBulkResult,
  TDeleteBulkParams
> {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly staffRepository: StaffRepository,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TDeleteBulkParams): Promise<TDeleteBulkResult> {
    const { id, params: dto } = params;
    const actorId = this.requestContextService.getUser()?.id;

    const role = await this.roleRepository.findRoleById(id, em);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystemRole) throw new ForbiddenException('System roles cannot be deleted');

    const targetRole = await this.roleRepository.findRoleById(dto.targetRoleId, em);
    if (!targetRole) throw new NotFoundException('Target role not found');

    const staffs = await this.staffRepository.findStaffByRoleId(id, em);
    const staffIds = staffs.map((s) => s.id);

    if (staffIds.length > 0) {
      await this.staffRepository.bulkUpdateRoleId(staffIds, dto.targetRoleId, em);
    }

    await this.roleRepository.softDeleteRole(id, em);

    await this.eventService.log({
      actorId,
      event: EventType.ROLE_DELETED,
      module: EventModule.AUTH,
      ipAddress: this.requestContextService.getIp(),
      userAgent: this.requestContextService.getUserAgent(),
      metadata: { roleId: id, targetRoleId: dto.targetRoleId, reassigned: staffIds.length },
    });

    await this.eventService.log({
      actorId,
      event: EventType.STAFF_ROLE_REASSIGNED,
      module: EventModule.AUTH,
      ipAddress: this.requestContextService.getIp(),
      userAgent: this.requestContextService.getUserAgent(),
      metadata: { fromRoleId: id, toRoleId: dto.targetRoleId, staffCount: staffIds.length },
    });

    return { deleted: true, reassigned: staffIds.length };
  }
}
