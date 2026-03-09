import { Injectable, Logger } from '@nestjs/common';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { Role } from '@modules/core/entities/role.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';
import { CreateRoleDto } from '@modules/role/dto/createRole.dto';
import { EntityManager } from 'typeorm';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(private readonly roleRepository: RoleRepository) {}

  async createRole(data: CreateRoleDto, entityManager?: EntityManager) {
    return this.roleRepository.createRole({ name: data.name }, entityManager);
  }

  async findOneByDataAndFailIfNotExists(
    options: FindResourceOptions<Role>,
    entitymanger?: EntityManager,
  ) {
    return this.roleRepository.findOneOrFailIfNotExists(options, entitymanger);
  }

  async findOneByDataAndFailIfExists(
    options: FindResourceOptions<Role>,
    entitymanger?: EntityManager,
  ) {
    return this.roleRepository.findOneOrFailIfExists(options, entitymanger);
  }
}
