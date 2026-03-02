import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { RequestTrackerService, RequestMetrics } from '../observability/requestTracker.service';
import { UserSessionType } from '../context/request.context';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RequestTrackerInterceptor implements NestInterceptor {
  constructor(
    private readonly requestTracker: RequestTrackerService,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const debuggerName = this.configService.get<string>('common.debug.debuggerName');
    const debuggerKey = this.configService.get<string>('common.debug.debuggerKey');

    // Skip tracking for debug requests but still process the request
    if (request.headers[debuggerName] === debuggerKey) {
      return next.handle();
    }

    const serviceAccessName = this.configService.get<string>('common.auth.serviceAccessName');
    // Skip tracking for internal service requests but still process the request
    if (request.headers[serviceAccessName] === 'false') {
      return next.handle();
    }

    const requestId = (request.headers['x-request-id'] as string) || uuidv4();
    const path = request.url?.split('?')[0] || request.url;
    const method = request.method;

    // Capture starting resource usage
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Get user context (populated by auth guards that run before interceptors)
    const user: UserSessionType | undefined = request.user;

    const metrics: RequestMetrics = {
      requestId,
      path,
      method,
      startTime: Date.now(),
      startHeapUsedMB: memUsage.heapUsed / 1024 / 1024,
      startCpuUser: cpuUsage.user,
      startCpuSystem: cpuUsage.system,

      // User context
      userId: user?.id,
      userEmail: user?.email,
      role: user?.role?.name,
    };

    this.requestTracker.startRequest(metrics);

    return next.handle().pipe(
      finalize(() => {
        const statusCode = response.statusCode || 200;
        this.requestTracker.endRequest(requestId, statusCode);
      }),
    );
  }
}
