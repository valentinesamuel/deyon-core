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
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys, RedisTTL } from '@shared/redis/redis.constants';
import { RequestContextService } from '@shared/context/requestContext.service';
import { StaffRepository } from '@adapters/repositories/staff.repository';
import { Role } from '@modules/core/entities/role.entity';

interface StaffProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isApproved: boolean;
  role: Role | null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly requestContextService: RequestContextService,
    private readonly staffRepository: StaffRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const accessToken = req?.cookies?.access_token;

    if (!accessToken) {
      throw new UnauthorizedException('No access token provided');
    }

    const payload = this.tokenService.verifyAccessToken(accessToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    // Check JTI blocklist
    const blocklisted = await this.redisService.exists(RedisKeys.jtiBlocklist(payload.jti));
    if (blocklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Load staff profile from Redis cache or DB
    const profileCacheKey = RedisKeys.profile(payload.sub);
    let staffProfile = await this.redisService.getJson<StaffProfile>(profileCacheKey);

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
        role: staff.role,
      };

      await this.redisService.setJson(profileCacheKey, staffProfile, RedisTTL.profile);
    }

    if (!staffProfile.isActive || !staffProfile.isApproved) {
      throw new UnauthorizedException('Account is inactive or not approved');
    }

    const requestUser = {
      id: 0,
      publicId: staffProfile.id,
      email: staffProfile.email,
      firstname: staffProfile.firstName,
      lastname: staffProfile.lastName,
      rateLimitTier: 'standard',
      roles: staffProfile.role ? [staffProfile.role] : [],
    };

    this.requestContextService.setUser(requestUser);
    req.user = requestUser;

    return true;
  }
}
