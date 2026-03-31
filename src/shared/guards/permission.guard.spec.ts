import { mock } from 'vitest-mock-extended';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PermissionCheckMode } from '@shared/decorators/requirePermission.decorator';

function makeCtx(user?: any): ExecutionContext {
  const request = { user };
  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue({ getRequest: () => request } as any);
  ctx.getHandler.mockReturnValue(() => {});
  ctx.getClass.mockReturnValue(class {});
  return ctx;
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: ReturnType<typeof mock<Reflector>>;

  beforeEach(() => {
    reflector = mock<Reflector>();
    guard = new PermissionGuard(reflector);
  });

  it('should return true for @Public() routes', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic
    expect(guard.canActivate(makeCtx())).toBe(true);
  });

  it('should return true if no @RequirePermissions metadata', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false) // isPublic = false
      .mockReturnValueOnce(undefined); // no permission metadata
    expect(guard.canActivate(makeCtx({ roles: [] }))).toBe(true);
  });

  it('should throw UnauthorizedException if no user on request', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ permissions: ['staff:read'], mode: PermissionCheckMode.ANY });
    expect(() => guard.canActivate(makeCtx(undefined))).toThrow(UnauthorizedException);
  });

  it('should return true if user has ANY required permission', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ permissions: ['staff:read'], mode: PermissionCheckMode.ANY });

    const user = {
      roles: [{ permissions: [{ code: 'staff:read', isActive: true }] }],
    };
    expect(guard.canActivate(makeCtx(user))).toBe(true);
  });

  it('should throw ForbiddenException if missing required permission', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ permissions: ['role:delete'], mode: PermissionCheckMode.ANY });

    const user = {
      roles: [{ permissions: [{ code: 'staff:read', isActive: true }] }],
    };
    expect(() => guard.canActivate(makeCtx(user))).toThrow(ForbiddenException);
  });

  it('should return true if user has ALL required permissions (ALL mode)', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce({
      permissions: ['staff:read', 'staff:write'],
      mode: PermissionCheckMode.ALL,
    });

    const user = {
      roles: [
        {
          permissions: [
            { code: 'staff:read', isActive: true },
            { code: 'staff:write', isActive: true },
          ],
        },
      ],
    };
    expect(guard.canActivate(makeCtx(user))).toBe(true);
  });

  it('should throw ForbiddenException if missing one of ALL required permissions', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false).mockReturnValueOnce({
      permissions: ['staff:read', 'staff:delete'],
      mode: PermissionCheckMode.ALL,
    });

    const user = {
      roles: [{ permissions: [{ code: 'staff:read', isActive: true }] }],
    };
    expect(() => guard.canActivate(makeCtx(user))).toThrow(ForbiddenException);
  });

  it('should grant access with *:* superadmin wildcard', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ permissions: ['anything:delete'], mode: PermissionCheckMode.ALL });

    const user = {
      roles: [{ permissions: [{ code: '*:*', isActive: true }] }],
    };
    expect(guard.canActivate(makeCtx(user))).toBe(true);
  });

  it('should grant access with module wildcard (module:all)', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ permissions: ['staff:delete'], mode: PermissionCheckMode.ANY });

    const user = {
      roles: [{ permissions: [{ code: 'staff:all', isActive: true }] }],
    };
    expect(guard.canActivate(makeCtx(user))).toBe(true);
  });

  it('should ignore inactive permissions', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ permissions: ['staff:read'], mode: PermissionCheckMode.ANY });

    const user = {
      roles: [{ permissions: [{ code: 'staff:read', isActive: false }] }], // inactive
    };
    expect(() => guard.canActivate(makeCtx(user))).toThrow(ForbiddenException);
  });

  it('should extract permissions from singular role property', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ permissions: ['staff:read'], mode: PermissionCheckMode.ANY });

    const user = {
      role: { permissions: [{ code: 'staff:read', isActive: true }] },
    };
    expect(guard.canActivate(makeCtx(user))).toBe(true);
  });

  it('should handle role with no permissions array gracefully', () => {
    reflector.getAllAndOverride
      .mockReturnValueOnce(false)
      .mockReturnValueOnce({ permissions: ['staff:read'], mode: PermissionCheckMode.ANY });

    const user = {
      roles: [{ name: 'admin' }], // no permissions field
    };
    expect(() => guard.canActivate(makeCtx(user))).toThrow(ForbiddenException);
  });
});
