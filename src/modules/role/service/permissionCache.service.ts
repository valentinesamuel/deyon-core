import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheKeyConfig, CacheKeyType } from '@adapters/cache/icache.interface';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';

export class PermissionCacheService {
  constructor(private readonly cacheAdapter: CacheAdapter) {}

  async getRolePermissions(roleId: string): Promise<string[] | null> {
    const key = this.buildPermissionCacheKey(CacheKeyType.ROLE_PERMISSIONS, {
      prefix: 'role',
      suffix: roleId,
    });
    return this.cacheAdapter.get(key, { db: CacheDbType.PERMISSION });
  }

  async setRolePermissions(roleId: string, permissions: string[], ttl?: number): Promise<void> {
    const key = this.buildPermissionCacheKey(CacheKeyType.ROLE_PERMISSIONS, {
      prefix: 'role',
      suffix: roleId,
    });
    await this.cacheAdapter.set(key, permissions, { db: CacheDbType.PERMISSION, ttl });
  }

  async getProfilePermissions(profileId: string): Promise<string[] | null> {
    const key = this.buildPermissionCacheKey(CacheKeyType.PROFILE_PERMISSIONS, {
      prefix: 'profile',
      suffix: profileId,
    });
    return this.cacheAdapter.get(key, { db: CacheDbType.PERMISSION });
  }

  async setProfilePermissions(
    profileId: string,
    permissions: string[],
    ttl?: number,
  ): Promise<void> {
    const key = this.buildPermissionCacheKey(CacheKeyType.PROFILE_PERMISSIONS, {
      prefix: 'profile',
      suffix: profileId,
    });
    await this.cacheAdapter.set(key, permissions, { db: CacheDbType.PERMISSION, ttl });
  }

  async invalidateProfileCache(profileId: string): Promise<void> {
    const key = this.buildPermissionCacheKey(CacheKeyType.PROFILE_PERMISSIONS, {
      prefix: 'profile',
      suffix: profileId,
    });
    await this.cacheAdapter.del(key, { db: CacheDbType.PERMISSION });
  }

  async invalidateRoleCache(roleId: string): Promise<void> {
    const key = this.buildPermissionCacheKey(CacheKeyType.ROLE_PERMISSIONS, {
      prefix: 'role',
      suffix: roleId,
    });
    await this.cacheAdapter.del(key, { db: CacheDbType.PERMISSION });
  }

  private buildPermissionCacheKey(type: CacheKeyType, config: CacheKeyConfig): string {
    switch (type) {
      case CacheKeyType.ROLE_PERMISSIONS:
        return `${config.prefix}:${config.suffix}:perms`;
      case CacheKeyType.PROFILE_PERMISSIONS:
        return `${config.prefix}:${config.suffix}:perms`;
      default:
        return `${config.prefix}:${config.suffix}`;
    }
  }
}
