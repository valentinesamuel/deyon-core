import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

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
import { CoreModule } from '@modules/core/core.module';

@Module({
  imports: [JwtModule.register({}), EmailModule, CoreModule],
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
