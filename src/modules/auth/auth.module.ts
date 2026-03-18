import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoreModule } from '@modules/core/core.module';

// Entities
import { Staff } from '@modules/core/entities/staff.entity';
import { Permission } from '@modules/core/entities/permission.entity';
import { RefreshToken } from '../core/entities/refreshToken.entity';
import { MfaConfig } from '../core/entities/mfaConfig.entity';
import { InviteToken } from '../core/entities/inviteToken.entity';
import { EventLog } from '../core/entities/eventLog.entity';

// Controller
import { StaffAuthController } from './controller/staffAuth.controller';

// Services
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { MfaService } from './services/mfa.service';
import { EventLogService } from './services/eventLog.service';
import { SessionService } from './services/session.service';

// Repositories
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { RefreshTokenRepository } from '@adapters/repositories/refreshToken.repository';
import { MfaConfigRepository } from '@adapters/repositories/mfaConfig.repository';
import { InviteTokenRepository } from '@adapters/repositories/inviteToken.repository';
import { PermissionRepository } from '@adapters/repositories/permission.repository';

// Use Cases
import { LoginStaffUsecase } from './usecases/loginStaff.uc';
import { VerifyMfaUsecase } from './usecases/verifyMfa.uc';
import { VerifyBackupCodeUsecase } from './usecases/verifyBackupCode.uc';
import { RefreshTokenUsecase } from './usecases/refreshToken.uc';
import { LogoutUsecase } from './usecases/logout.uc';
import { LogoutAllUsecase } from './usecases/logoutAll.uc';
import { CreateInviteUsecase } from './usecases/createInvite.uc';
import { SendInviteEmailUsecase } from './usecases/sendInviteEmail.uc';
import { AcceptInviteUsecase } from './usecases/acceptInvite.uc';
import { SetupMfaUsecase } from './usecases/setupMfa.uc';
import { ConfirmMfaSetupUsecase } from './usecases/confirmMfaSetup.uc';
import { ForgotPasswordUsecase } from './usecases/forgotPassword.uc';
import { ResetPasswordUsecase } from './usecases/resetPassword.uc';
import { GetMeUsecase } from './usecases/getMe.uc';

// Email adapter
import { EmailModule } from '@adapters/email/email.module';

// Shared utilities
import { EncryptionUtility } from '@shared/utility/encryption/encryption.utility';
import { EventLogRepository } from '@adapters/repositories/eventLog.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Staff, Permission, RefreshToken, MfaConfig, InviteToken, EventLog]),
    JwtModule.register({}),
    CoreModule,
    EmailModule,
  ],
  controllers: [StaffAuthController],
  providers: [
    // Services
    AuthService,
    TokenService,
    MfaService,
    EventLogService,
    SessionService,
    EncryptionUtility,

    // Repositories
    StaffRepository,
    RefreshTokenRepository,
    MfaConfigRepository,
    InviteTokenRepository,
    EventLogRepository,
    PermissionRepository,

    // Use Cases
    LoginStaffUsecase,
    VerifyMfaUsecase,
    VerifyBackupCodeUsecase,
    RefreshTokenUsecase,
    LogoutUsecase,
    LogoutAllUsecase,
    CreateInviteUsecase,
    SendInviteEmailUsecase,
    AcceptInviteUsecase,
    SetupMfaUsecase,
    ConfirmMfaSetupUsecase,
    ForgotPasswordUsecase,
    ResetPasswordUsecase,
    GetMeUsecase,
  ],
  exports: [TokenService, AuthService, EventLogService, StaffRepository],
})
export class AuthModule {}
