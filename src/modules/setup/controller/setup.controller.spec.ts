import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { SetupController } from './setup.controller';
import { Broker } from '@broker/broker';
import { SystemConfigRepository } from '@adapters/repositories/systemConfig.repository';
import { RegisterCmoUsecase } from '../usecases/registerCmo.uc';
import { BootstrapSystemUsecase } from '../usecases/bootstrapSystem.uc';

describe('SetupController', () => {
  let controller: SetupController;
  let broker: ReturnType<typeof mock<Broker>>;
  let systemConfigRepository: ReturnType<typeof mock<SystemConfigRepository>>;
  let registerCmoUc: ReturnType<typeof mock<RegisterCmoUsecase>>;
  let bootstrapSystemUc: ReturnType<typeof mock<BootstrapSystemUsecase>>;

  const mockReq: any = {
    ip: '192.168.1.1',
    headers: { 'user-agent': 'test-agent' },
    user: { id: 'staff-public-id-123' },
  };

  beforeEach(() => {
    broker = mock<Broker>();
    systemConfigRepository = mock<SystemConfigRepository>();
    registerCmoUc = mock<RegisterCmoUsecase>();
    bootstrapSystemUc = mock<BootstrapSystemUsecase>();

    controller = new SetupController(
      broker,
      systemConfigRepository,
      registerCmoUc,
      bootstrapSystemUc,
    );
  });

  describe('getStatus', () => {
    it('should return { completed: true } when config value is truthy', async () => {
      systemConfigRepository.findByKey.mockResolvedValue({
        key: 'setup_complete',
        value: { completed: true },
      } as any);

      const result = await controller.getStatus();

      expect(result).toEqual({ completed: true });
    });

    it('should return { completed: false } when config is null', async () => {
      systemConfigRepository.findByKey.mockResolvedValue(null);

      const result = await controller.getStatus();

      expect(result).toEqual({ completed: false });
    });

    it('should return { completed: false } when config value.completed is false', async () => {
      systemConfigRepository.findByKey.mockResolvedValue({
        key: 'setup_complete',
        value: { completed: false },
      } as any);

      const result = await controller.getStatus();

      expect(result).toEqual({ completed: false });
    });
  });

  describe('register', () => {
    it('should pass dto, ipAddress, and userAgent to broker', async () => {
      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'cmo@hospital.com',
        phoneNumber: '+2348012345678',
        password: 'Secure1234pass',
      };

      broker.runUsecases.mockResolvedValue({ staffId: 'new-staff-id' } as any);

      await controller.register(dto as any, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [registerCmoUc],
        expect.objectContaining({
          ...dto,
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
        }),
      );
    });

    it('should return the broker result', async () => {
      const dto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'cmo2@hospital.com',
        phoneNumber: '+2348012345679',
        password: 'Secure1234pass',
      };
      const expectedResult = { staffId: 'new-staff-id' };
      broker.runUsecases.mockResolvedValue(expectedResult as any);

      const result = await controller.register(dto as any, mockReq);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('bootstrap', () => {
    it('should pass dto fields and id from req.user to broker', async () => {
      const dto = { totpCode: '123456' };

      broker.runUsecases.mockResolvedValue({ success: true } as any);

      await controller.bootstrap(dto as any, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        [bootstrapSystemUc],
        expect.objectContaining({
          totpCode: '123456',
          staffId: 'staff-public-id-123',
          ipAddress: '192.168.1.1',
          userAgent: 'test-agent',
        }),
      );
    });

    it('should return the broker result', async () => {
      const dto = { totpCode: '654321' };
      const expectedResult = { bootstrapped: true };
      broker.runUsecases.mockResolvedValue(expectedResult as any);

      const result = await controller.bootstrap(dto as any, mockReq);

      expect(result).toEqual(expectedResult);
    });
  });
});
