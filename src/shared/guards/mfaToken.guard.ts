import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys } from '@adapters/cache/cache.constants';
import { RequestContextService } from '@shared/context/requestContext.service';

@Injectable()
export class MfaTokenGuard implements CanActivate {
  private readonly logger = new Logger(MfaTokenGuard.name);

  constructor(
    private readonly cacheAdapter: CacheAdapter,
    private readonly requestContextService: RequestContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const mfaToken = req?.body?.mfaToken;

    if (!mfaToken) {
      throw new UnauthorizedException('MFA token is required');
    }

    const data = await this.cacheAdapter.get<{ staffId: string }>(RedisKeys.mfaPending(mfaToken), {
      db: CacheDbType.AUTH,
    });

    if (!data) {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    this.requestContextService.setUserId(data.staffId);
    return true;
  }
}
