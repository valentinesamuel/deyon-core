import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { Reflector } from '@nestjs/core';
import { RoleController } from './role.controller';
import { Broker } from '@broker/broker';
import { CreateRoleUsecase } from '@modules/role/usecases/createRole.uc';
import { ListRolesUsecase } from '@modules/role/usecases/listRoles.uc';
import { GetRoleByIdUsecase } from '@modules/role/usecases/getRoleById.uc';
import { UpdateRoleUsecase } from '@modules/role/usecases/updateRole.uc';
import { DeleteRoleUsecase } from '@modules/role/usecases/deleteRole.uc';
import { DeleteRoleWithBulkReassignUsecase } from '@modules/role/usecases/deleteRoleWithBulkReassign.uc';
import { DeleteRoleWithIndividualReassignUsecase } from '@modules/role/usecases/deleteRoleWithIndividualReassign.uc';
import { REQUIRED_PERMISSIONS_KEY } from '@shared/decorators/requirePermission.decorator';

describe('RoleController', () => {
  let controller: RoleController;
  let broker: ReturnType<typeof mock<Broker>>;
  let createRoleUsecase: ReturnType<typeof mock<CreateRoleUsecase>>;
  let listRolesUsecase: ReturnType<typeof mock<ListRolesUsecase>>;
  let getRoleByIdUsecase: ReturnType<typeof mock<GetRoleByIdUsecase>>;
  let updateRoleUsecase: ReturnType<typeof mock<UpdateRoleUsecase>>;
  let deleteRoleUsecase: ReturnType<typeof mock<DeleteRoleUsecase>>;
  let deleteBulkUsecase: ReturnType<typeof mock<DeleteRoleWithBulkReassignUsecase>>;
  let deleteIndividualUsecase: ReturnType<typeof mock<DeleteRoleWithIndividualReassignUsecase>>;

  const mockDto = { name: 'Doctor', permissions: ['staff:read'] };
  const mockReq: any = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'test-agent' },
  };

  beforeEach(() => {
    broker = mock<Broker>();
    createRoleUsecase = mock<CreateRoleUsecase>();
    listRolesUsecase = mock<ListRolesUsecase>();
    getRoleByIdUsecase = mock<GetRoleByIdUsecase>();
    updateRoleUsecase = mock<UpdateRoleUsecase>();
    deleteRoleUsecase = mock<DeleteRoleUsecase>();
    deleteBulkUsecase = mock<DeleteRoleWithBulkReassignUsecase>();
    deleteIndividualUsecase = mock<DeleteRoleWithIndividualReassignUsecase>();
    controller = new RoleController(
      broker,
      createRoleUsecase,
      listRolesUsecase,
      getRoleByIdUsecase,
      updateRoleUsecase,
      deleteRoleUsecase,
      deleteBulkUsecase,
      deleteIndividualUsecase,
    );
  });

  describe('createRole', () => {
    it('should pass createRoleUsecase to broker.runUsecases', async () => {
      broker.runUsecases.mockResolvedValue({ name: 'Doctor' } as any);

      await controller.createRole(mockDto, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith([createRoleUsecase], expect.any(Object));
    });

    it('should pass dto, ipAddress, and userAgent to broker', async () => {
      broker.runUsecases.mockResolvedValue({ name: 'Doctor' } as any);

      await controller.createRole(mockDto, mockReq);

      expect(broker.runUsecases).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          params: mockDto,
          metadata: {
            requestMetadata: {
              ipAddress: '127.0.0.1',
              userAgent: 'test-agent',
            },
          },
        }),
      );
    });

    it('should return the broker result', async () => {
      const expectedResult = { name: 'Doctor', alias: 'doctor' };
      broker.runUsecases.mockResolvedValue(expectedResult as any);

      const result = await controller.createRole(mockDto, mockReq);

      expect(result).toEqual(expectedResult);
    });

    it('should have RequirePermissions metadata with role:create', () => {
      const reflector = new Reflector();
      const metadata = reflector.get(REQUIRED_PERMISSIONS_KEY, controller.createRole);

      expect(metadata).toBeDefined();
      expect(metadata.permissions).toContain('role:create');
    });
  });
});
