import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { Role } from '../core/entities/role.entity';
import { Permission } from '../core/entities/permission.entity';
import { EventLog } from '../core/entities/eventLog.entity';
import { AuthModule } from '../auth/auth.module';
import { RoleController } from './controllers/role.controller';
import { RoleService } from './service/role.service';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { PermissionRepository } from '@adapters/repositories/permission.repository';
import { CreateRoleUsecase } from './usecases/createRole.uc';
import { Broker } from '@broker/broker';
import { RequestContextService } from '@shared/context/requestContext.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission, EventLog]), ClsModule, AuthModule],
  controllers: [RoleController],
  providers: [
    RoleService,
    RoleRepository,
    PermissionRepository,
    CreateRoleUsecase,
    Broker,
    RequestContextService,
  ],
})
export class RoleModule {}
