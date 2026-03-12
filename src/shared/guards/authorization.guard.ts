import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(AuthorizationGuard.name);

  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const healthAuth = this.validateHealthCredentials(req);
    if (healthAuth) {
      return true;
    }

    const debuggerName = this.configService.get<string>('common.debug.debuggerName');
    const debuggerKey = this.configService.get<string>('common.debug.debuggerKey');

    if (debuggerName && req.headers[debuggerName] === debuggerKey) {
      this.logger.log('⛔️⛔️ Request is authorized for debugging mode', {
        ip: req.ip,
        'x-debug-access': req.headers['x-debug-access'],
        'a-api-token': req.headers['a-api-token'],
        cookies: req.headers['cookie'],
      });
      return true;
    }

    // Get the token from the request headers
    const accessKey = req?.headers[this.configService.get<string>('common.auth.authName')!];

    if (!accessKey) {
      this.logger.error('❌ ERR_DYN_1: Request is forbidden');
      throw new ForbiddenException('Request is forbidden', 'ERR_DYN_1');
    }

    if (accessKey !== this.configService.get<string>('common.auth.appKey')) {
      this.logger.error('❌ ERR_DYN_2: Request is forbidden');
      throw new ForbiddenException('Request is forbidden', 'ERR_DYN_2');
    }

    this.logger.log('✅ Request is authorized for public routes');
    return true;
  }

  private validateHealthCredentials(req: Request): boolean | undefined {
    if (req.originalUrl === '/health') {
      const healthHeaderName = this.configService.get<string>('common.metrics.healthName');
      const healthHeaderKey = this.configService.get<string>('common.metrics.healthKey');

      if (healthHeaderName && req.headers[healthHeaderName] === healthHeaderKey) {
        this.logger.log('📊 Request is authorized for health check', {
          ip: req.ip,
        });
        return true;
      }
      return false;
    }
  }
}
