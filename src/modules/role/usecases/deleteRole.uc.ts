import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { RequestContextService } from '@shared/context/requestContext.service';
import { RoleRepository } from '@adapters/repositories/role.repository';

type TDeleteRoleParams = { id: string };
type TDeleteRoleResult = { deleted: boolean };

@Injectable()
export class DeleteRoleUsecase extends Usecase<TDeleteRoleResult, TDeleteRoleParams> {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TDeleteRoleParams): Promise<TDeleteRoleResult> {
    const { id } = params;
    const actorId = this.requestContextService.getUser()?.id;

    const role = await this.roleRepository.findRoleById(id, em);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystemRole) throw new ForbiddenException('System roles cannot be deleted');

    if ((role.staffs ?? []).length > 0) {
      throw new ConflictException({
        message: 'Role has assigned staff and cannot be deleted directly',
        staffCount: role.staffs.length,
        requiresReassignment: true,
      });
    }

    await this.roleRepository.softDeleteRole(id, em);

    await this.eventService.log({
      actorId,
      event: EventType.ROLE_DELETED,
      module: EventModule.AUTH,
      ipAddress: this.requestContextService.getIp(),
      userAgent: this.requestContextService.getUserAgent(),
      metadata: { roleId: id },
    });

    return { deleted: true };
  }
}
