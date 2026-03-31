import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@shared/decorators/isPublic.decorator';
import { TokenService } from '@modules/auth/services/token.service';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys, RedisTTL } from '@adapters/cache/cache.constants';
import { RequestContextService, TRequestUser } from '@shared/context/requestContext.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { Role } from '@modules/core/entities/role.entity';
import { PersonalAccessTokenRepository } from '@adapters/repositories/personalAccessToken.repository';

interface StaffProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isApproved: boolean;
  role: Pick<Role, 'id' | 'alias' | 'isActive' | 'isSystemRole' | 'name' | 'permissions'>;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly cacheAdapter: CacheAdapter,
    private readonly requestContextService: RequestContextService,
    private readonly staffRepository: StaffRepository,
    private readonly patRepository: PersonalAccessTokenRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();

    // Try PAT bearer path first
    const bearerToken = this.extractBearerToken(req);
    if (bearerToken) {
      await this.handlePatAuth(req, bearerToken);
      return true;
    }

    // Existing cookie JWT path (unchanged)
    const accessToken = req?.cookies?.access_token;

    if (!accessToken) {
      throw new UnauthorizedException('No access token provided');
    }

    const payload = this.tokenService.verifyAccessToken(accessToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // Check JTI blocklist
    const blacklisted = await this.cacheAdapter.exists(RedisKeys.jtiBlocklist(payload.jti), {
      db: CacheDbType.AUTH,
    });
    if (blacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Load staff profile from cache or DB
    const profileCacheKey = RedisKeys.profile(payload.sub);
    let staffProfile = await this.cacheAdapter.get<StaffProfile>(profileCacheKey, {
      db: CacheDbType.AUTH,
    });

    if (!staffProfile) {
      const staff = await this.staffRepository.findOne({
        where: { id: payload.sub },
        relations: ['role', 'role.permissions'],
      });

      if (!staff) {
        throw new UnauthorizedException('Staff not found');
      }

      staffProfile = {
        id: staff.id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        isActive: staff.isActive,
        isApproved: staff.isApproved,
        role: {
          id: staff.role.id,
          name: staff.role.name,
          isActive: staff.role.isActive,
          alias: staff.role.alias,
          isSystemRole: staff.role.isSystemRole,
          permissions: staff.role.permissions ?? [],
        },
      };

      await this.cacheAdapter.set(profileCacheKey, staffProfile, {
        db: CacheDbType.AUTH,
        ttl: RedisTTL.profile,
      });
    }

    if (!staffProfile.isActive || !staffProfile.isApproved) {
      throw new UnauthorizedException('Account is inactive or not approved');
    }

    const requestUser: TRequestUser = {
      id: staffProfile.id,
      email: staffProfile.email,
      firstname: staffProfile.firstName,
      lastname: staffProfile.lastName,
      role: {
        id: staffProfile.role.id,
        name: staffProfile.role.name,
        isActive: staffProfile.role.isActive,
        alias: staffProfile.role.alias,
        isSystemRole: staffProfile.role.isSystemRole,
        permissions: staffProfile.role.permissions ?? [],
      },
    };

    this.requestContextService.setUser(requestUser);
    req.user = requestUser;

    return true;
  }

  /**
   * Extracts a Bearer token from the Authorization header.
   * Returns null if the header is absent, not "Bearer ", or starts with "ey"
   * (which indicates a JWT — guards against clients accidentally passing a JWT in the header).
   */
  private extractBearerToken(req: any): string | null {
    const authHeader: string | undefined = req?.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    // "ey" prefix is characteristic of Base64-encoded JWTs — not opaque PATs
    if (token.startsWith('ey')) return null;
    return token;
  }

  private async handlePatAuth(req: any, rawToken: string): Promise<void> {
    const tokenHash = this.tokenService.sha256(rawToken);

    // Check revocation sentinel first
    const isRevoked = await this.cacheAdapter.exists(RedisKeys.patRevoked(tokenHash), {
      db: CacheDbType.AUTH,
    });
    if (isRevoked) {
      throw new UnauthorizedException('Personal access token has been revoked');
    }

    // Check positive cache
    let staffProfile = await this.cacheAdapter.get<StaffProfile>(RedisKeys.pat(tokenHash), {
      db: CacheDbType.AUTH,
    });

    if (!staffProfile) {
      const pat = await this.patRepository.findByTokenHash(tokenHash);

      if (!pat) {
        throw new UnauthorizedException('Invalid personal access token');
      }

      if (pat.isRevoked) {
        throw new UnauthorizedException('Personal access token has been revoked');
      }

      if (pat.expiresAt && pat.expiresAt < new Date()) {
        throw new UnauthorizedException('Personal access token has expired');
      }

      const staff = pat.staff;
      if (!staff.isActive || !staff.isApproved) {
        throw new UnauthorizedException('Account is inactive or not approved');
      }

      staffProfile = {
        id: staff.id,
        email: staff.email,
        firstName: staff.firstName,
        lastName: staff.lastName,
        isActive: staff.isActive,
        isApproved: staff.isApproved,
        role: {
          id: staff.role.id,
          name: staff.role.name,
          isActive: staff.role.isActive,
          alias: staff.role.alias,
          isSystemRole: staff.role.isSystemRole,
          permissions: staff.role.permissions ?? [],
        },
      };

      await this.cacheAdapter.set(RedisKeys.pat(tokenHash), staffProfile, {
        db: CacheDbType.AUTH,
        ttl: RedisTTL.pat,
      });

      // Fire-and-forget last used update
      this.patRepository.updateLastUsed(pat.id).catch((err) => {
        this.logger.warn(`Failed to update PAT lastUsedAt: ${err?.message}`);
      });
    }

    const requestUser: TRequestUser = {
      id: staffProfile.id,
      email: staffProfile.email,
      firstname: staffProfile.firstName,
      lastname: staffProfile.lastName,
      role: {
        id: staffProfile.role.id,
        name: staffProfile.role.name,
        isActive: staffProfile.role.isActive,
        alias: staffProfile.role.alias,
        isSystemRole: staffProfile.role.isSystemRole,
        permissions: staffProfile.role.permissions ?? [],
      },
    };

    this.requestContextService.setUser(requestUser);
    req.user = requestUser;
  }
}
