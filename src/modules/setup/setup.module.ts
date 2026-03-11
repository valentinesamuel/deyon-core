import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '@modules/core/entities/systemConfig.entity';
import { MfaConfig } from '@modules/core/entities/mfaConfig.entity';
import { Role } from '@modules/core/entities/role.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { SystemConfigRepository } from '@adapters/repositories/systemConfig.repository';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { RoleRepository } from '@adapters/repositories/role.repository';
import { MfaService } from '@modules/auth/services/mfa.service';
import { EncryptionUtility } from '@shared/utility/encryption/encryption.utility';
import { SetupNotCompleteGuard } from './guards/setupNotComplete.guard';
import { RegisterCmoUsecase } from './usecases/registerCmo.uc';
import { BootstrapSystemUsecase } from './usecases/bootstrapSystem.uc';
import { SetupController } from './controller/setup.controller';
import { Broker } from '@broker/broker';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig, MfaConfig, Role]), AuthModule],
  controllers: [SetupController],
  providers: [
    Broker,
    EncryptionUtility,
    MfaService,
    SystemConfigRepository,
    MfaConfigRepository,
    RoleRepository,
    SetupNotCompleteGuard,
    RegisterCmoUsecase,
    BootstrapSystemUsecase,
  ],
})
export class SetupModule {}
