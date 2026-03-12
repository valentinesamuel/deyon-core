import { mock } from 'vitest-mock-extended';
import { EntityManager, Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { CreateRoleUsecase } from './createRole.uc';
import { RoleService } from '@modules/role/service/role.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { Permission } from '@modules/core/entities/permission.entity';
import { Role } from '@modules/core/entities/role.entity';

describe('CreateRoleUsecase', () => {
  let usecase: CreateRoleUsecase;
  let roleService: ReturnType<typeof mock<RoleService>>;
  let eventLogService: ReturnType<typeof mock<EventLogService>>;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let em: ReturnType<typeof mock<EntityManager>>;

  const mockParams = {
    params: { name: 'Doctor', permissions: ['staff:read', 'patient:view'] },
    metadata: { requestMetadata: { ipAddress: '127.0.0.1', userAgent: 'test' } },
  };

  const savedRole = {
    id: 'role-1',
    name: 'Doctor',
    alias: 'doctor',
    permissions: [
      { code: 'staff:read', description: 'staff:read', isActive: true },
      { code: 'patient:view', description: 'patient:view', isActive: true },
    ],
  };

  beforeEach(() => {
    roleService = mock<RoleService>();
    eventLogService = mock<EventLogService>();
    requestContextService = mock<RequestContextService>();
    em = mock<EntityManager>();

    usecase = new CreateRoleUsecase(roleService, eventLogService, requestContextService);

    eventLogService.log.mockResolvedValue(undefined);
    requestContextService.getUser.mockReturnValue({ publicId: 'admin-1' } as any);

    // Mock EntityManager query builder
    const qb = {
      insert: vi.fn().mockReturnThis(),
      into: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      orIgnore: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({}),
    };
    em.createQueryBuilder.mockReturnValue(qb as any);

    const permRepo = mock<Repository<Permission>>();
    permRepo.find.mockResolvedValue(savedRole.permissions as any);

    const roleRepo = mock<Repository<Role>>();
    roleRepo.create.mockReturnValue(savedRole as any);
    roleRepo.save.mockResolvedValue(savedRole as any);

    em.getRepository.mockImplementation((entity: any) => {
      if (entity === Permission) return permRepo as any;
      if (entity === Role) return roleRepo as any;
      return mock<Repository<any>>();
    });
  });

  it('should create a role and return name, alias, permissions', async () => {
    roleService.findOneByDataAndFailIfExists.mockResolvedValue(null as any);

    const result = await usecase.execute(em, mockParams as any);

    expect(result).toEqual({
      name: 'Doctor',
      alias: 'doctor',
      permissions: [
        { code: 'staff:read', description: 'staff:read', isActive: true },
        { code: 'patient:view', description: 'patient:view', isActive: true },
      ],
    });
  });

  it('should throw ConflictException if role name already exists', async () => {
    roleService.findOneByDataAndFailIfExists.mockRejectedValue(new ConflictException('exists'));

    await expect(usecase.execute(em, mockParams as any)).rejects.toThrow(ConflictException);
  });

  it('should compute alias from name', async () => {
    roleService.findOneByDataAndFailIfExists.mockResolvedValue(null as any);

    const params = {
      params: { name: 'Senior Doctor', permissions: [] },
      metadata: { requestMetadata: { ipAddress: '127.0.0.1', userAgent: 'test' } },
    };

    const roleRepo = em.getRepository(Role as any) as any;
    const createdRole = {
      ...savedRole,
      name: 'Senior Doctor',
      alias: 'senior_doctor',
      permissions: [],
    };
    roleRepo.create.mockReturnValue(createdRole);
    roleRepo.save.mockResolvedValue(createdRole);

    const result = await usecase.execute(em, params as any);
    expect(result.alias).toBe('senior_doctor');
  });
});
