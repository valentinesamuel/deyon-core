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
export class MfaTokenGuard implements CanActivate {
  private readonly logger = new Logger(MfaTokenGuard.name);

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const mfaToken = req?.body?.mfaToken;

    if (!mfaToken) {
      throw new UnauthorizedException('MFA token is required');
    }

    const data = await this.redisService.getJson<{ staffId: string }>(
      RedisKeys.mfaPending(mfaToken),
    );

    if (!data) {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    req.mfaStaffId = data.staffId;
    return true;
  }
}
