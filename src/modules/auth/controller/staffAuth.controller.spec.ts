import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { StaffAuthController } from './staffAuth.controller';
import { Broker } from '@broker/broker';
import { TokenService } from '../services/token.service';
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

describe('StaffAuthController', () => {
  let controller: StaffAuthController;
  let broker: ReturnType<typeof mock<Broker>>;
  let tokenService: ReturnType<typeof mock<TokenService>>;
  let loginStaffUc: ReturnType<typeof mock<LoginStaffUsecase>>;
  let verifyMfaUc: ReturnType<typeof mock<VerifyMfaUsecase>>;
  let verifyBackupCodeUc: ReturnType<typeof mock<VerifyBackupCodeUsecase>>;
  let refreshTokenUc: ReturnType<typeof mock<RefreshTokenUsecase>>;
  let logoutUc: ReturnType<typeof mock<LogoutUsecase>>;
  let logoutAllUc: ReturnType<typeof mock<LogoutAllUsecase>>;
  let createInviteUc: ReturnType<typeof mock<CreateInviteUsecase>>;
  let sendInviteEmailUc: ReturnType<typeof mock<SendInviteEmailUsecase>>;
  let acceptInviteUc: ReturnType<typeof mock<AcceptInviteUsecase>>;
  let setupMfaUc: ReturnType<typeof mock<SetupMfaUsecase>>;
  let confirmMfaSetupUc: ReturnType<typeof mock<ConfirmMfaSetupUsecase>>;
  let forgotPasswordUc: ReturnType<typeof mock<ForgotPasswordUsecase>>;
  let resetPasswordUc: ReturnType<typeof mock<ResetPasswordUsecase>>;
  let getMeUc: ReturnType<typeof mock<GetMeUsecase>>;

  const mockReq: any = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent' },
    cookies: { access_token: 'access-tok', refresh_token: 'refresh-tok' },
    user: { id: 'staff-public-id-1' },
  };

  const mockRes: any = { cookie: vi.fn(), clearCookie: vi.fn() };

  beforeEach(() => {
    broker = mock<Broker>();
    tokenService = mock<TokenService>();
    loginStaffUc = mock<LoginStaffUsecase>();
    verifyMfaUc = mock<VerifyMfaUsecase>();
    verifyBackupCodeUc = mock<VerifyBackupCodeUsecase>();
    refreshTokenUc = mock<RefreshTokenUsecase>();
    logoutUc = mock<LogoutUsecase>();
    logoutAllUc = mock<LogoutAllUsecase>();
    createInviteUc = mock<CreateInviteUsecase>();
    sendInviteEmailUc = mock<SendInviteEmailUsecase>();
    acceptInviteUc = mock<AcceptInviteUsecase>();
    setupMfaUc = mock<SetupMfaUsecase>();
    confirmMfaSetupUc = mock<ConfirmMfaSetupUsecase>();
    forgotPasswordUc = mock<ForgotPasswordUsecase>();
    resetPasswordUc = mock<ResetPasswordUsecase>();
    getMeUc = mock<GetMeUsecase>();

    controller = new StaffAuthController(
      broker,
      tokenService,
      loginStaffUc,
      verifyMfaUc,
      verifyBackupCodeUc,
      refreshTokenUc,
      logoutUc,
      logoutAllUc,
      createInviteUc,
      sendInviteEmailUc,
      acceptInviteUc,
      setupMfaUc,
      confirmMfaSetupUc,
      forgotPasswordUc,
      resetPasswordUc,
      getMeUc,
    );
  });

  describe('loginStaff', () => {
    it('should pass LoginDto to broker', async () => {
      const dto = { email: 'user@test.com', password: 'pass' };
      broker.runUsecases.mockResolvedValue({ mfaToken: 'token' } as any);

      await controller.loginStaff(dto as any);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [loginStaffUc],
        expect.objectContaining({ email: 'user@test.com', password: 'pass' }),
      );
    });

    it('should return broker result', async () => {
      const dto = { email: 'user@test.com', password: 'pass' };
      const expected = { mfaToken: 'abc123' };
      broker.runUsecases.mockResolvedValue(expected as any);

      const result = await controller.loginStaff(dto as any);

      expect(result).toEqual(expected);
    });
  });

  describe('verifyMfa', () => {
    it('should pass MfaVerifyDto to broker and set auth cookies', async () => {
      const dto = { mfaToken: 'token', totpCode: '123456' };
      broker.runUsecases.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        staffId: 's1',
      } as any);

      await controller.verifyMfa(dto as any, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [verifyMfaUc],
        expect.objectContaining({ mfaToken: 'token', totpCode: '123456' }),
      );
      expect(tokenService.setAuthCookies).toHaveBeenCalledWith(mockRes, 'at', 'rt');
    });
  });

  describe('verifyBackupCode', () => {
    it('should pass backup code to broker and set auth cookies', async () => {
      const dto = { mfaToken: 'token', backupCode: 'ABCDE12345' };
      broker.runUsecases.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        staffId: 's1',
      } as any);

      await controller.verifyBackupCode(dto as any, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [verifyBackupCodeUc],
        expect.objectContaining({ backupCode: 'ABCDE12345' }),
      );
      expect(tokenService.setAuthCookies).toHaveBeenCalledWith(mockRes, 'at', 'rt');
    });
  });

  describe('refreshToken', () => {
    it('should extract refresh token cookie and call setAuthCookies on success', async () => {
      broker.runUsecases.mockResolvedValue({
        accessToken: 'new-at',
        newRefreshToken: 'new-rt',
      } as any);

      await controller.refreshToken(mockReq, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [refreshTokenUc],
        expect.objectContaining({ refreshToken: 'refresh-tok' }),
      );
      expect(tokenService.setAuthCookies).toHaveBeenCalledWith(mockRes, 'new-at', 'new-rt');
    });

    it('should clear cookies and rethrow on error', async () => {
      broker.runUsecases.mockRejectedValue(new Error('Expired'));

      await expect(controller.refreshToken(mockReq, mockRes)).rejects.toThrow('Expired');
      expect(tokenService.clearAuthCookies).toHaveBeenCalledWith(mockRes);
    });
  });

  describe('logout', () => {
    it('should extract cookies, call broker, then clear auth cookies', async () => {
      broker.runUsecases.mockResolvedValue({ loggedOut: true } as any);

      await controller.logout(mockReq, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [logoutUc],
        expect.objectContaining({ accessToken: 'access-tok', refreshToken: 'refresh-tok' }),
      );
      expect(tokenService.clearAuthCookies).toHaveBeenCalledWith(mockRes);
    });
  });

  describe('logoutAll', () => {
    it('should extract access token cookie, call broker, then clear auth cookies', async () => {
      broker.runUsecases.mockResolvedValue({ loggedOut: true } as any);

      await controller.logoutAll(mockReq, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [logoutAllUc],
        expect.objectContaining({ accessToken: 'access-tok' }),
      );
      expect(tokenService.clearAuthCookies).toHaveBeenCalledWith(mockRes);
    });
  });

  describe('invite', () => {
    it('should include createInviteUc and sendInviteEmailUc in usecases array', async () => {
      const dto = {
        email: 'newstaff@hospital.com',
        roleId: 'role-uuid',
        departmentId: 'dept-uuid',
      };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.invite(dto as any);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [createInviteUc, sendInviteEmailUc],
        expect.any(Object),
      );
    });
  });

  describe('acceptInvite', () => {
    it('should pass dto to broker', async () => {
      const dto = {
        token: 'invite-token',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+2348012345678',
        password: 'Str0ng!Pass#2024',
      };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.acceptInvite(dto as any);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [acceptInviteUc],
        expect.objectContaining({ token: 'invite-token' }),
      );
    });
  });

  describe('setupMfa', () => {
    it('should pass dto to broker', async () => {
      const dto = { setupToken: 'setup-token' };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.setupMfa(dto as any);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [setupMfaUc],
        expect.objectContaining({ setupToken: 'setup-token' }),
      );
    });
  });

  describe('confirmMfaSetup', () => {
    it('should pass dto to broker and set auth cookies', async () => {
      const dto = { setupToken: 'setup-token', totpCode: '123456' };
      broker.runUsecases.mockResolvedValue({
        accessToken: 'at',
        refreshToken: 'rt',
        accessGranted: true,
        backupCodes: ['CODE1'],
      } as any);

      await controller.confirmMfaSetup(dto as any, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [confirmMfaSetupUc],
        expect.objectContaining({ setupToken: 'setup-token', totpCode: '123456' }),
      );
      expect(tokenService.setAuthCookies).toHaveBeenCalledWith(mockRes, 'at', 'rt');
    });
  });

  describe('forgotPassword', () => {
    it('should pass email to broker', async () => {
      const dto = { email: 'staff@hospital.com' };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.forgotPassword(dto as any);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [forgotPasswordUc],
        expect.objectContaining({ email: 'staff@hospital.com' }),
      );
    });
  });

  describe('resetPassword', () => {
    it('should pass token and new password to broker', async () => {
      const dto = { token: 'reset-token', newPassword: 'NewStr0ng!Pass#2024' };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.resetPassword(dto as any);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [resetPasswordUc],
        expect.objectContaining({ token: 'reset-token', newPassword: 'NewStr0ng!Pass#2024' }),
      );
    });
  });
});
