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
export class MfaSetupTokenGuard implements CanActivate {
  private readonly logger = new Logger(MfaSetupTokenGuard.name);

  constructor(
    private readonly cacheAdapter: CacheAdapter,
    private readonly requestContextService: RequestContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const setupToken = req?.body?.setupToken;

    if (!setupToken) {
      throw new UnauthorizedException('Setup token is required');
    }

    const data = await this.cacheAdapter.get<{ staffId: string }>(RedisKeys.mfaSetup(setupToken), {
      db: CacheDbType.AUTH,
    });

    if (!data) {
      throw new UnauthorizedException('Invalid or expired setup token');
    }

    this.requestContextService.setUserId(data.staffId);
    return true;
  }
}
