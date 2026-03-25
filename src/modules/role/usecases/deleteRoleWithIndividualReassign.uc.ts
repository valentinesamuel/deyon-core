import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { IndividualReassignDto } from '@modules/role/dto/reassignStaff.dto';
import { RequestMetadata } from '@shared/validations/reqMetadata.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { StaffRepository } from '@adapters/repositories/staff.repository';

type TDeleteIndividualParams = {
  id: string;
  params: IndividualReassignDto;
  metadata: RequestMetadata;
};
type TDeleteIndividualResult = { deleted: boolean; reassigned: number };

@Injectable()
export class DeleteRoleWithIndividualReassignUsecase extends Usecase<
  TDeleteIndividualResult,
  TDeleteIndividualParams
> {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly staffRepository: StaffRepository,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TDeleteIndividualParams,
  ): Promise<TDeleteIndividualResult> {
    const { id, params: dto, metadata } = params;
    const { ipAddress, userAgent } = metadata.requestMetadata;
    const actorId = this.requestContextService.getUser()?.id;

    const role = await this.roleRepository.findRoleById(id, em);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystemRole) throw new ForbiddenException('System roles cannot be deleted');

    const targetRoleIds = [...new Set(dto.assignments.map((a) => a.targetRoleId))];
    for (const targetRoleId of targetRoleIds) {
      const targetRole = await this.roleRepository.findRoleById(targetRoleId, em);
      if (!targetRole) throw new NotFoundException(`Target role ${targetRoleId} not found`);
    }

    const staffsInRole = await this.staffRepository.findStaffByRoleId(id, em);
    const staffIdsInRole = new Set(staffsInRole.map((s) => s.id));
    for (const assignment of dto.assignments) {
      if (!staffIdsInRole.has(assignment.staffId)) {
        throw new BadRequestException(`Staff ${assignment.staffId} does not belong to this role`);
      }
    }

    for (const assignment of dto.assignments) {
      await this.staffRepository.updateStaffRoleById(
        assignment.staffId,
        assignment.targetRoleId,
        em,
      );
    }

    await this.roleRepository.softDeleteRole(id, em);

    await this.eventService.log({
      actorId,
      event: EventType.ROLE_DELETED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
      metadata: { roleId: id, reassigned: dto.assignments.length },
    });

    await this.eventService.log({
      actorId,
      event: EventType.STAFF_ROLE_REASSIGNED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
      metadata: { fromRoleId: id, assignments: dto.assignments },
    });

    return { deleted: true, reassigned: dto.assignments.length };
  }
}
