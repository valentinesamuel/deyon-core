export interface RolePermission {
  code: string;
  isActive: boolean;
}

export interface RequestRole {
  name: string;
  alias: string;
  permissions: RolePermission[];
}

export interface RequestUser {
  id: number;
  publicId: string;
  email: string;
  firstname: string;
  lastname: string;
  rateLimitTier: string;
  roles: RequestRole[];
}
