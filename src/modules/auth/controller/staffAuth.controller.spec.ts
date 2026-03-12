import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { StaffAuthController } from './staffAuth.controller';
import { Broker } from '@broker/broker';
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

describe('StaffAuthController', () => {
  let controller: StaffAuthController;
  let broker: ReturnType<typeof mock<Broker>>;
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

  const mockReq: any = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent' },
    user: { publicId: 'staff-public-id-1' },
  };

  const mockRes: any = {};

  beforeEach(() => {
    broker = mock<Broker>();
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

    controller = new StaffAuthController(
      broker,
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
    );
  });

  describe('loginStaff', () => {
    it('should pass LoginDto, ip, and userAgent to broker', async () => {
      const dto = { email: 'user@test.com', password: 'pass' };
      broker.runUsecases.mockResolvedValue({ mfaToken: 'token' } as any);

      await controller.loginStaff(dto as any, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [loginStaffUc],
        expect.objectContaining({
          email: 'user@test.com',
          password: 'pass',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });

    it('should return broker result', async () => {
      const dto = { email: 'user@test.com', password: 'pass' };
      const expected = { mfaToken: 'abc123' };
      broker.runUsecases.mockResolvedValue(expected as any);

      const result = await controller.loginStaff(dto as any, mockReq);

      expect(result).toEqual(expected);
    });
  });

  describe('verifyMfa', () => {
    it('should pass MfaVerifyDto, mfaStaffId, and res to broker', async () => {
      const dto = { mfaToken: 'token', totpCode: '123456' };
      const reqWithMfaId: any = { ...mockReq, mfaStaffId: 'staff-mfa-id' };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.verifyMfa(dto as any, reqWithMfaId, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [verifyMfaUc],
        expect.objectContaining({
          mfaToken: 'token',
          totpCode: '123456',
          mfaStaffId: 'staff-mfa-id',
          res: mockRes,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });

    it('should return broker result', async () => {
      const dto = { mfaToken: 'token', totpCode: '123456' };
      const reqWithMfaId: any = { ...mockReq, mfaStaffId: 'staff-mfa-id' };
      const expected = { accessToken: 'jwt' };
      broker.runUsecases.mockResolvedValue(expected as any);

      const result = await controller.verifyMfa(dto as any, reqWithMfaId, mockRes);

      expect(result).toEqual(expected);
    });
  });

  describe('verifyBackupCode', () => {
    it('should pass backup code, mfaStaffId, and res to broker', async () => {
      const dto = { mfaToken: 'token', backupCode: 'ABCDE12345' };
      const reqWithMfaId: any = { ...mockReq, mfaStaffId: 'staff-mfa-id' };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.verifyBackupCode(dto as any, reqWithMfaId, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [verifyBackupCodeUc],
        expect.objectContaining({
          backupCode: 'ABCDE12345',
          mfaStaffId: 'staff-mfa-id',
          res: mockRes,
        }),
      );
    });
  });

  describe('refreshToken', () => {
    it('should pass req and res to broker', async () => {
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.refreshToken(mockReq, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [refreshTokenUc],
        expect.objectContaining({
          req: mockReq,
          res: mockRes,
        }),
      );
    });
  });

  describe('logout', () => {
    it('should pass req and res to broker', async () => {
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.logout(mockReq, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [logoutUc],
        expect.objectContaining({
          req: mockReq,
          res: mockRes,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });
  });

  describe('logoutAll', () => {
    it('should extract ip, userAgent, and req.user.publicId', async () => {
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.logoutAll(mockReq, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [logoutAllUc],
        expect.objectContaining({
          staffId: 'staff-public-id-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
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

      await controller.invite(dto as any, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [createInviteUc, sendInviteEmailUc],
        expect.any(Object),
      );
    });

    it('should pass invitedById from req.user.publicId', async () => {
      const dto = {
        email: 'newstaff@hospital.com',
        roleId: 'role-uuid',
        departmentId: 'dept-uuid',
      };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.invite(dto as any, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          invitedById: 'staff-public-id-1',
          email: 'newstaff@hospital.com',
          roleId: 'role-uuid',
          departmentId: 'dept-uuid',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });
  });

  describe('acceptInvite', () => {
    it('should pass dto, ipAddress, and userAgent to broker', async () => {
      const dto = {
        token: 'invite-token',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+2348012345678',
        password: 'Str0ng!Pass#2024',
      };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.acceptInvite(dto as any, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [acceptInviteUc],
        expect.objectContaining({
          ...dto,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });
  });

  describe('setupMfa', () => {
    it('should extract mfaStaffId from guard and pass to broker', async () => {
      const dto = { setupToken: 'setup-token' };
      const reqWithMfaId: any = { ...mockReq, mfaStaffId: 'setup-staff-id' };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.setupMfa(dto as any, reqWithMfaId);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [setupMfaUc],
        expect.objectContaining({
          setupToken: 'setup-token',
          mfaStaffId: 'setup-staff-id',
        }),
      );
    });
  });

  describe('confirmMfaSetup', () => {
    it('should extract mfaStaffId from guard and pass with dto and res', async () => {
      const dto = { setupToken: 'setup-token', totpCode: '123456' };
      const reqWithMfaId: any = { ...mockReq, mfaStaffId: 'setup-staff-id' };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.confirmMfaSetup(dto as any, reqWithMfaId, mockRes);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [confirmMfaSetupUc],
        expect.objectContaining({
          setupToken: 'setup-token',
          totpCode: '123456',
          mfaStaffId: 'setup-staff-id',
          res: mockRes,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });
  });

  describe('forgotPassword', () => {
    it('should pass email and request metadata to broker', async () => {
      const dto = { email: 'staff@hospital.com' };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.forgotPassword(dto as any, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [forgotPasswordUc],
        expect.objectContaining({
          email: 'staff@hospital.com',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });

    it('should return broker result', async () => {
      const dto = { email: 'staff@hospital.com' };
      const expected = { sent: true };
      broker.runUsecases.mockResolvedValue(expected as any);

      const result = await controller.forgotPassword(dto as any, mockReq);

      expect(result).toEqual(expected);
    });
  });

  describe('resetPassword', () => {
    it('should pass token, new password, and request metadata to broker', async () => {
      const dto = { token: 'reset-token', newPassword: 'NewStr0ng!Pass#2024' };
      broker.runUsecases.mockResolvedValue({} as any);

      await controller.resetPassword(dto as any, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [resetPasswordUc],
        expect.objectContaining({
          token: 'reset-token',
          newPassword: 'NewStr0ng!Pass#2024',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      );
    });
  });
});
