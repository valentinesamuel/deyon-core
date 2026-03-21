export const PERMISSION = {
  WILDCARD: '*:*',
  ROLE: {
    CREATE: 'role:create',
    READ: 'role:read',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
  },
  STAFF: {
    INVITE: 'staff:invite',
    READ: 'staff:read',
    LIST: 'staff:list',
    UPDATE: 'staff:update',
    DEACTIVATE: 'staff:deactivate',
  },
  DEPARTMENT: {
    CREATE: 'department:create',
    READ: 'department:read',
    UPDATE: 'department:update',
    DELETE: 'department:delete',
  },
  PERMISSION: {
    READ: 'permission:read',
  },
  PAT: {
    GENERATE: 'pat:generate',
  },
} as const;
