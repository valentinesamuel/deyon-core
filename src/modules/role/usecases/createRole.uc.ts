import { Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateRoleDto } from '@modules/role/dto/createRole.dto';
import { RequestMetadata } from '@shared/validations/reqMetadata.dto';
import { RoleService } from '@modules/role/service/role.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Permission } from '@modules/core/entities/permission.entity';
import { Role } from '@modules/core/entities/role.entity';
import { RequestContextService } from '@shared/context/requestContext.service';

type CreateRoleParams = { params: CreateRoleDto; metadata: RequestMetadata };

export interface CreateRoleResult {
  name: string;
  alias: string;
  permissions: {
    code: string;
    description: string;
    isActive: boolean;
  }[];
}

@Injectable()
export class CreateRoleUsecase extends Usecase<CreateRoleResult, CreateRoleParams> {
  constructor(
    private readonly roleService: RoleService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateRoleParams): Promise<CreateRoleResult> {
    const { params: dto, metadata } = params;
    const { ipAddress, userAgent } = metadata.requestMetadata;
    const actorId = this.requestContextService.getUser()?.id;

    // 1. Check role name doesn't exist
    await this.roleService.findOneByDataAndFailIfExists({ where: { name: dto.name } }, em);

    // 2. Compute alias
    const alias = dto.name.toLowerCase().replaceAll(/\s+/g, '_');
    const permCodes = dto.permissions ?? [];

    // 3. Bulk upsert permissions
    if (permCodes.length > 0) {
      await em
        .createQueryBuilder()
        .insert()
        .into(Permission)
        .values(permCodes.map((code) => ({ code, description: code })))
        .orIgnore()
        .execute();
    }

    // 4. Fetch permissions by code
    const permissions =
      permCodes.length > 0
        ? await em.getRepository(Permission).find({ where: { code: In(permCodes) } })
        : [];

    // 5. Create + save role with permissions
    const role = em.getRepository(Role).create({ name: dto.name, alias, permissions });
    const saved = await em.getRepository(Role).save(role);

    // 6. Log event
    await this.eventService.log({
      actorId,
      event: EventType.ROLE_CREATED,
      module: EventModule.AUTH,
      ipAddress,
      userAgent,
      metadata: { roleName: dto.name, permissions: permCodes },
    });

    // 7. Return result
    return {
      name: saved.name,
      alias: saved.alias,
      permissions: saved.permissions.map((p) => ({
        code: p.code,
        description: p.description,
        isActive: p.isActive,
      })),
    };
  }
}
