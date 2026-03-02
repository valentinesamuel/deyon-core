import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { RedisKeys } from '@shared/redis/redis.constants';

@Injectable()
export class MfaSetupTokenGuard implements CanActivate {
  private readonly logger = new Logger(MfaSetupTokenGuard.name);

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const setupToken = req?.body?.setupToken;

    if (!setupToken) {
      throw new UnauthorizedException('Setup token is required');
    }

    const data = await this.redisService.getJson<{ staffId: string }>(
      RedisKeys.mfaSetup(setupToken),
    );

    if (!data) {
      throw new UnauthorizedException('Invalid or expired setup token');
    }

    req.mfaStaffId = data.staffId;
    return true;
  }
}
