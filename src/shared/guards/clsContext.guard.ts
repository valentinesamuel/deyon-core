import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RequestContextService } from '@shared/context/requestContext.service';

@Injectable()
export class ClsContextGuard implements CanActivate {
  constructor(private readonly requestContext: RequestContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.user) {
      this.requestContext.setUser(request.user);
    }
    this.requestContext.setIp(request.ip);
    this.requestContext.setUserAgent(request.headers['user-agent']);

    return true;
  }
}
