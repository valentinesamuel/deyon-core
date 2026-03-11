import { mock } from 'vitest-mock-extended';
import { Repository } from 'typeorm';
import { EventLog, EventType, EventModule } from '@modules/core/entities/eventLog.entity';
import { EventLogService } from './eventLog.service';

describe('EventLogService', () => {
  let service: EventLogService;
  let repo: ReturnType<typeof mock<Repository<EventLog>>>;

  beforeEach(() => {
    repo = mock<Repository<EventLog>>();
    service = new EventLogService(repo);
  });

  describe('log', () => {
    it('should create and save a log entry with all provided fields', async () => {
      const entry = {} as EventLog;
      repo.create.mockReturnValue(entry);
      repo.save.mockResolvedValue(entry);

      await service.log({
        event: EventType.LOGIN_SUCCESS,
        module: EventModule.AUTH,
        actorId: 'staff-1',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        metadata: { foo: 'bar' },
        success: true,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event: EventType.LOGIN_SUCCESS,
          module: EventModule.AUTH,
          actorId: 'staff-1',
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          metadata: { foo: 'bar' },
          success: true,
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(entry);
    });

    it('should default actorId to null when not provided', async () => {
      const entry = {} as EventLog;
      repo.create.mockReturnValue(entry);
      repo.save.mockResolvedValue(entry);

      await service.log({
        event: EventType.LOGIN_FAILED,
        module: EventModule.AUTH,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: null,
          module: EventModule.AUTH,
          success: true,
        }),
      );
    });

    it('should default module to null when not provided', async () => {
      const entry = {} as EventLog;
      repo.create.mockReturnValue(entry);
      repo.save.mockResolvedValue(entry);

      await service.log({
        event: EventType.LOGOUT,
        actorId: 'staff-1',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          module: null,
        }),
      );
    });

    it('should swallow errors and never throw (audit must not break auth flow)', async () => {
      repo.create.mockReturnValue({} as EventLog);
      repo.save.mockRejectedValue(new Error('DB connection lost'));

      await expect(
        service.log({
          event: EventType.LOGIN_FAILED,
          module: EventModule.AUTH,
        }),
      ).resolves.not.toThrow();
    });

    it('should handle success=false correctly', async () => {
      const entry = {} as EventLog;
      repo.create.mockReturnValue(entry);
      repo.save.mockResolvedValue(entry);

      await service.log({
        event: EventType.MFA_FAILED,
        module: EventModule.AUTH,
        success: false,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });
  });
});
