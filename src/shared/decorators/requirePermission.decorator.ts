import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for required permissions
 */
export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Permission check mode
 * - ALL: User must have ALL specified permissions (AND logic)
 * - ANY: User must have ANY of the specified permissions (OR logic)
 */
export enum PermissionCheckMode {
  ALL = 'ALL',
  ANY = 'ANY',
}

/**
 * RequirePermissions Decorator
 *
 * Use this decorator to protect routes with permission-based authorization.
 * The PermissionGuard will check if the authenticated user has the required permissions.
 *
 * @param permissions - Array of permission codes (e.g., ['transactions:read', 'users:update'])
 * @param mode - Check mode: ALL (must have all permissions) or ANY (must have any permission)
 *
 * @example
 * // User must have transactions:read permission
 * @RequirePermissions(['transactions:read'])
 * @Get('transactions')
 * async listTransactions() {
 *   return this.transactionService.findAll();
 * }
 *
 * @example
 * // User must have BOTH transactions:read AND transactions:export permissions
 * @RequirePermissions(['transactions:read', 'transactions:export'], PermissionCheckMode.ALL)
 * @Get('transactions/export')
 * async exportTransactions() {
 *   return this.transactionService.export();
 * }
 *
 * @example
 * // User must have EITHER users:update OR users:delete permission
 * @RequirePermissions(['users:update', 'users:delete'], PermissionCheckMode.ANY)
 * @Delete('users/:id')
 * async manageUser() {
 *   return this.userService.manage();
 * }
 */
export const RequirePermissions = (
  permissions: string[],
  mode: PermissionCheckMode = PermissionCheckMode.ALL,
) => {
  return SetMetadata(REQUIRED_PERMISSIONS_KEY, { permissions, mode });
};
