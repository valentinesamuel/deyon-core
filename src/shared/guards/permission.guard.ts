import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '@shared/decorators/isPublic.decorator';
import {
  PermissionCheckMode,
  REQUIRED_PERMISSIONS_KEY,
} from '@shared/decorators/requirePermission.decorator';

/**
 * Permission Guard
 *
 * Checks if the authenticated user has the required permissions to access a route.
 * Works with the @RequirePermissions() decorator.
 *
 * Authorization Flow:
 * 1. Check if route is public (@Public decorator) → allow
 * 2. Check if route has @RequirePermissions decorator → if not, allow (no permission required)
 * 3. Extract user from request (set by JwtAuthGuard)
 * 4. Extract user's permissions from their roles
 * 5. Check if user has required permissions based on check mode (ALL or ANY)
 * 6. Allow or deny access
 *
 * Usage:
 * - Apply globally in app.module.ts or per controller/route
 * - Requires JwtAuthGuard to run first (sets request.user)
 *
 * @example Global registration in app.module.ts
 * providers: [
 *   {
 *     provide: APP_GUARD,
 *     useClass: JwtAuthGuard, // Must run first
 *   },
 *   {
 *     provide: APP_GUARD,
 *     useClass: PermissionGuard, // Runs after JwtAuthGuard
 *   },
 * ]
 */
@Injectable()
export class PermissionGuard {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required permissions metadata from decorator
    const permissionMetadata = this.reflector.getAllAndOverride<{
      permissions: string[];
      mode: PermissionCheckMode;
    }>(REQUIRED_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // If no @RequirePermissions decorator, allow access
    if (!permissionMetadata) {
      return true;
    }

    const { permissions: requiredPermissions, mode } = permissionMetadata;

    // Extract user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('ERR_SPY_7');
    }

    // Extract user's permissions from their roles
    const userPermissions = this.extractUserPermissions(user);

    // Check if user has required permissions
    const hasPermission = this.checkPermissions(userPermissions, requiredPermissions, mode);

    if (!hasPermission) {
      throw new ForbiddenException({
        // statusCode: 403,
        // error: 'INSUFFICIENT_PERMISSIONS',
        message: 'ERR_SPY_8',
        // required: requiredPermissions,
        // mode,
      });
    }

    return true;
  }

  /**
   * Extract permission codes from user's roles
   * User object should contain roles with permissions (set by JWT strategy)
   */
  private extractUserPermissions(user: any): string[] {
    if (!user.roles || !Array.isArray(user.roles)) {
      return [];
    }

    const permissionSet = new Set<string>();

    // Iterate through user's roles and collect all permissions
    for (const role of user.roles) {
      if (role.permissions && Array.isArray(role.permissions)) {
        for (const permission of role.permissions) {
          if (permission.code && permission.isActive) {
            permissionSet.add(permission.code);
          }
        }
      }
    }

    return Array.from(permissionSet);
  }

  /**
   * Check if user has required permissions based on mode
   * @param userPermissions - Array of permission codes user has
   * @param requiredPermissions - Array of permission codes required
   * @param mode - Check mode: ALL (must have all) or ANY (must have any)
   */
  private checkPermissions(
    userPermissions: string[],
    requiredPermissions: string[],
    mode: PermissionCheckMode,
  ): boolean {
    if (requiredPermissions.length === 0) {
      return true; // No permissions required
    }

    if (userPermissions.length === 0) {
      return false; // User has no permissions
    }

    // Check for wildcard permission (e.g., "*:*" or "transactions:all")
    if (this.hasWildcardPermission(userPermissions, requiredPermissions)) {
      return true;
    }

    // Check based on mode
    if (mode === PermissionCheckMode.ALL) {
      // User must have ALL required permissions
      return requiredPermissions.every((required) => userPermissions.includes(required));
    } else {
      // User must have ANY of the required permissions
      return requiredPermissions.some((required) => userPermissions.includes(required));
    }
  }

  /**
   * Check if user has wildcard permissions
   * Supports:
   * - *:* (superadmin - all permissions)
   * - module:all (all actions on a module, e.g., transactions:all)
   */
  private hasWildcardPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    // Check for superadmin wildcard
    if (userPermissions.includes('*:*')) {
      return true;
    }

    // Check for module-level wildcards
    for (const required of requiredPermissions) {
      const [module] = required.split(':');
      const moduleWildcard = `${module}:all`;

      if (userPermissions.includes(moduleWildcard)) {
        return true;
      }
    }

    return false;
  }
}
