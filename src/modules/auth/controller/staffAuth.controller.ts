import { Broker } from '@broker/broker';
import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@shared/decorators/isPublic.decorator';
import { MfaTokenGuard } from '@shared/guards/mfaToken.guard';
import { MfaSetupTokenGuard } from '@shared/guards/mfaSetupToken.guard';
import { TokenService } from '../services/token.service';

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
import { GetMeUsecase } from '../usecases/getMe.uc';

@Controller('staff/auth')
export class StaffAuthController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly tokenService: TokenService,
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
    private readonly getMeUc: GetMeUsecase,
  ) {}

  // ── Get current user profile ─────────────────────────────────────────────────
  @Get('me')
  getMe() {
    return this.serviceBroker.runUsecases([this.getMeUc], {});
  }

  // ── Step 1: Login (credentials only, returns mfaToken) ──────────────────────
  @Public()
  @Post('login')
  loginStaff(@Body() dto: StaffLoginDto) {
    return this.serviceBroker.runUsecases([this.loginStaffUc], { ...dto });
  }

  // ── Step 2a: Verify TOTP (issues cookies) ───────────────────────────────────
  @Public()
  @UseGuards(MfaTokenGuard)
  @Post('login/mfa-verify')
  async verifyMfa(@Body() dto: MfaVerifyDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.serviceBroker.runUsecases([this.verifyMfaUc], { ...dto });
    this.tokenService.setAuthCookies(
      res,
      result['accessToken'] as string,
      result['refreshToken'] as string,
    );
    const { accessToken: _at, refreshToken: _rt, ...rest } = result as Record<string, unknown>;
    return rest;
  }

  // ── Step 2b: Verify backup code (issues cookies) ─────────────────────────────
  @Public()
  @UseGuards(MfaTokenGuard)
  @Post('login/mfa-backup')
  async verifyBackupCode(
    @Body() dto: MfaBackupVerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.serviceBroker.runUsecases([this.verifyBackupCodeUc], { ...dto });
    this.tokenService.setAuthCookies(
      res,
      result['accessToken'] as string,
      result['refreshToken'] as string,
    );
    const { accessToken: _at, refreshToken: _rt, ...rest } = result as Record<string, unknown>;
    return rest;
  }

  // ── Token refresh ────────────────────────────────────────────────────────────
  @Public()
  @Post('refresh')
  async refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'] as string;
    try {
      const result = await this.serviceBroker.runUsecases([this.refreshTokenUc], { refreshToken });
      this.tokenService.setAuthCookies(
        res,
        result['accessToken'] as string,
        result['newRefreshToken'] as string,
      );
      return { refreshed: true };
    } catch (err) {
      this.tokenService.clearAuthCookies(res);
      throw err;
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const accessToken = req.cookies['access_token'] as string;
    const refreshToken = req.cookies['refresh_token'] as string;
    const result = await this.serviceBroker.runUsecases([this.logoutUc], {
      accessToken,
      refreshToken,
    });
    this.tokenService.clearAuthCookies(res);
    return result;
  }

  @Post('logout-all')
  async logoutAll(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const accessToken = req.cookies['access_token'] as string;
    const result = await this.serviceBroker.runUsecases([this.logoutAllUc], { accessToken });
    this.tokenService.clearAuthCookies(res);
    return result;
  }

  // ── Admin invite ─────────────────────────────────────────────────────────────
  @Post('invite')
  invite(@Body() dto: StaffInviteDto) {
    return this.serviceBroker.runUsecases([this.createInviteUc, this.sendInviteEmailUc], {
      ...dto,
    });
  }

  // ── Accept invite ────────────────────────────────────────────────────────────
  @Public()
  @Post('invite/accept')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.serviceBroker.runUsecases([this.acceptInviteUc], { ...dto });
  }

  // ── MFA setup (post-invite) ──────────────────────────────────────────────────
  @Public()
  @UseGuards(MfaSetupTokenGuard)
  @Post('mfa/setup')
  setupMfa(@Body() dto: MfaSetupDto) {
    return this.serviceBroker.runUsecases([this.setupMfaUc], { ...dto });
  }

  @Public()
  @UseGuards(MfaSetupTokenGuard)
  @Post('mfa/setup/confirm')
  async confirmMfaSetup(
    @Body() dto: MfaSetupConfirmDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.serviceBroker.runUsecases([this.confirmMfaSetupUc], { ...dto });
    this.tokenService.setAuthCookies(
      res,
      result['accessToken'] as string,
      result['refreshToken'] as string,
    );
    const { accessToken: _at, refreshToken: _rt, ...rest } = result as Record<string, unknown>;
    return rest;
  }

  // ── Forgot / Reset password ──────────────────────────────────────────────────
  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.serviceBroker.runUsecases([this.forgotPasswordUc], { ...dto });
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.serviceBroker.runUsecases([this.resetPasswordUc], { ...dto });
  }
}
