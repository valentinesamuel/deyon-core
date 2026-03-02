import { Broker } from '@broker/broker';
import { Body, Controller, Logger, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@shared/decorators/isPublic.decorator';
import { MfaTokenGuard } from '@shared/guards/mfaToken.guard';
import { MfaSetupTokenGuard } from '@shared/guards/mfaSetupToken.guard';

// DTOs
import { StaffLoginDto } from '../dto/staffLogin.dto';
import { MfaVerifyDto } from '../dto/mfaVerify.dto';
import { MfaBackupVerifyDto } from '../dto/mfaBackupVerify.dto';
import { MfaSetupDto } from '../dto/mfaSetup.dto';
import { MfaSetupConfirmDto } from '../dto/mfaSetupConfirm.dto';
import { StaffInviteDto } from '../dto/staffInvite.dto';
import { AcceptInviteDto } from '../dto/acceptInvite.dto';
import { ForgotPasswordDto } from '../dto/forgotPassword.dto';
import { ResetPasswordDto } from '../dto/resetPassword.dto';

// Use Cases
import { LoginStaffUsecase } from '../usecases/loginStaff.uc';
import { VerifyMfaUsecase } from '../usecases/verifyMfa.uc';
import { VerifyBackupCodeUsecase } from '../usecases/verifyBackupCode.uc';
import { RefreshTokenUsecase } from '../usecases/refreshToken.uc';
import { LogoutUsecase } from '../usecases/logout.uc';
import { LogoutAllUsecase } from '../usecases/logoutAll.uc';
import { CreateInviteUsecase } from '../usecases/createInvite.uc';
import { SendInviteEmailUsecase } from '../usecases/sendInviteEmail.uc';
import { AcceptInviteUsecase } from '../usecases/acceptInvite.uc';
import { SetupMfaUsecase } from '../usecases/setupMfa.uc';
import { ConfirmMfaSetupUsecase } from '../usecases/confirmMfaSetup.uc';
import { ForgotPasswordUsecase } from '../usecases/forgotPassword.uc';
import { ResetPasswordUsecase } from '../usecases/resetPassword.uc';

@Controller('staff/auth')
export class StaffAuthController {
  private readonly logger = new Logger(StaffAuthController.name);

  constructor(
    private readonly serviceBroker: Broker,
    private readonly loginStaffUc: LoginStaffUsecase,
    private readonly verifyMfaUc: VerifyMfaUsecase,
    private readonly verifyBackupCodeUc: VerifyBackupCodeUsecase,
    private readonly refreshTokenUc: RefreshTokenUsecase,
    private readonly logoutUc: LogoutUsecase,
    private readonly logoutAllUc: LogoutAllUsecase,
    private readonly createInviteUc: CreateInviteUsecase,
    private readonly sendInviteEmailUc: SendInviteEmailUsecase,
    private readonly acceptInviteUc: AcceptInviteUsecase,
    private readonly setupMfaUc: SetupMfaUsecase,
    private readonly confirmMfaSetupUc: ConfirmMfaSetupUsecase,
    private readonly forgotPasswordUc: ForgotPasswordUsecase,
    private readonly resetPasswordUc: ResetPasswordUsecase,
  ) {}

  // ── Step 1: Login (credentials only, returns mfaToken) ──────────────────────
  @Public()
  @Post('login')
  loginStaff(@Body() dto: StaffLoginDto, @Req() req: Request) {
    return this.serviceBroker.runUsecases([this.loginStaffUc], {
      ...dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ── Step 2a: Verify TOTP (issues cookies) ───────────────────────────────────
  @Public()
  @UseGuards(MfaTokenGuard)
  @Post('login/mfa-verify')
  verifyMfa(
    @Body() dto: MfaVerifyDto,
    @Req() req: Request & { mfaStaffId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.serviceBroker.runUsecases([this.verifyMfaUc], {
      ...dto,
      mfaStaffId: req.mfaStaffId,
      res,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ── Step 2b: Verify backup code (issues cookies) ─────────────────────────────
  @Public()
  @UseGuards(MfaTokenGuard)
  @Post('login/mfa-backup')
  verifyBackupCode(
    @Body() dto: MfaBackupVerifyDto,
    @Req() req: Request & { mfaStaffId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.serviceBroker.runUsecases([this.verifyBackupCodeUc], {
      ...dto,
      mfaStaffId: req.mfaStaffId,
      res,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ── Token refresh ────────────────────────────────────────────────────────────
  @Public()
  @Post('refresh')
  refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.serviceBroker.runUsecases([this.refreshTokenUc], {
      req,
      res,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.serviceBroker.runUsecases([this.logoutUc], {
      req,
      res,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout-all')
  logoutAll(
    @Req() req: Request & { user: { publicId: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.serviceBroker.runUsecases([this.logoutAllUc], {
      req,
      res,
      staffId: req.user?.publicId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ── Admin invite ─────────────────────────────────────────────────────────────
  @Post('invite')
  invite(@Body() dto: StaffInviteDto, @Req() req: Request & { user: { publicId: string } }) {
    return this.serviceBroker.runUsecases([this.createInviteUc, this.sendInviteEmailUc], {
      ...dto,
      invitedById: req.user?.publicId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ── Accept invite ────────────────────────────────────────────────────────────
  @Public()
  @Post('invite/accept')
  acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    return this.serviceBroker.runUsecases([this.acceptInviteUc], {
      ...dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ── MFA setup (post-invite) ──────────────────────────────────────────────────
  @Public()
  @UseGuards(MfaSetupTokenGuard)
  @Post('mfa/setup')
  setupMfa(@Body() dto: MfaSetupDto, @Req() req: Request & { mfaStaffId: string }) {
    return this.serviceBroker.runUsecases([this.setupMfaUc], {
      ...dto,
      mfaStaffId: req.mfaStaffId,
    });
  }

  @Public()
  @UseGuards(MfaSetupTokenGuard)
  @Post('mfa/setup/confirm')
  confirmMfaSetup(
    @Body() dto: MfaSetupConfirmDto,
    @Req() req: Request & { mfaStaffId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.serviceBroker.runUsecases([this.confirmMfaSetupUc], {
      ...dto,
      mfaStaffId: req.mfaStaffId,
      res,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // ── Forgot / Reset password ──────────────────────────────────────────────────
  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.serviceBroker.runUsecases([this.forgotPasswordUc], {
      ...dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.serviceBroker.runUsecases([this.resetPasswordUc], {
      ...dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
