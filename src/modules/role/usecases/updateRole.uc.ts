import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateRoleDto } from '@modules/role/dto/updateRole.dto';
import { RequestMetadata } from '@shared/validations/reqMetadata.dto';
import { RoleService } from '@modules/role/service/role.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Permission } from '@modules/core/entities/permission.entity';
import { Role } from '@modules/core/entities/role.entity';
import { RequestContextService } from '@shared/context/requestContext.service';
import { RoleRepository } from '@adapters/repositories/role.repository';

type TUpdateRoleParams = { id: string; params: UpdateRoleDto; metadata: RequestMetadata };

type TUpdateRoleResult = {
  id: string;
  name: string;
  alias: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: { code: string; description: string }[];
};

@Injectable()
export class UpdateRoleUsecase extends Usecase<TUpdateRoleResult, TUpdateRoleParams> {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly roleService: RoleService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TUpdateRoleParams): Promise<TUpdateRoleResult> {
    const { id, params: dto, metadata } = params;
    const { ipAddress, userAgent } = metadata.requestMetadata;
    const actorId = this.requestContextService.getUser()?.id;

    const role = await this.roleRepository.findRoleById(id, em);
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystemRole) throw new ForbiddenException('System roles cannot be modified');

    if (dto.name && dto.name !== role.name) {
      await this.roleService.findOneByDataAndFailIfExists({ where: { name: dto.name } }, em);
    }

    let permissions = role.permissions;
    if (dto.permissions && dto.permissions.length > 0) {
      await em
        .createQueryBuilder()
        .insert()
        .into(Permission)
        .values(dto.permissions.map((code) => ({ code, description: code })))
        .orIgnore()
        .execute();
      permissions = await em
        .getRepository(Permission)
        .find({ where: { code: In(dto.permissions) } });
    }

    const newAlias = dto.name ? dto.name.toLowerCase().replaceAll(/\s+/g, '_') : role.alias;
    const updated = await em.getRepository(Role).save({
      ...role,
      name: dto.name ?? role.name,
      alias: newAlias,
      permissions,
    });

    await this.eventService.log({
      actorId,
      event: EventType.ROLE_UPDATED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
      metadata: { roleId: id, name: dto.name, permissions: dto.permissions },
    });

    return {
      id: updated.id,
      name: updated.name,
      alias: updated.alias,
      isSystemRole: updated.isSystemRole,
      isActive: updated.isActive,
      permissions: (updated.permissions ?? []).map((p) => ({
        code: p.code,
        description: p.description,
      })),
    };
  }
}
