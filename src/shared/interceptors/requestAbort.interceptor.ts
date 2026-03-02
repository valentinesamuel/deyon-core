import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { RequestContextService } from '@shared/context/requestContext.service';
import { SKIP_ABORT_CHECK_KEY } from '@shared/decorators/skipAbortCheck.decorator';

/**
 * Request Abort Interceptor
 *
 * Detects client disconnections and propagates an AbortSignal via CLS so that
 * downstream brokers can stop processing between usecase steps.
 *
 * How it works:
 * 1. Creates an AbortController per request
 * 2. Stores the AbortSignal in CLS (via RequestContextService)
 * 3. Listens to the request 'close' event
 * 4. If the client disconnects before the response is fully sent, calls abort()
 * 5. Brokers check the signal between usecase executions and throw to trigger rollback
 *
 * Must be registered FIRST in the interceptor chain so the signal is available
 * to all subsequent interceptors and the handler.
 */
@Injectable()
export class RequestAbortInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestAbortInterceptor.name);

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipAbortCheck = this.reflector.getAllAndOverride<boolean>(SKIP_ABORT_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAbortCheck) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const abortController = new AbortController();
    this.requestContext.setAbortSignal(abortController.signal);

    const onClose = () => {
      if (!response.writableEnded) {
        this.logger.warn(
          `Client disconnected before response was sent: ${request.method} ${request.url}`,
        );
        abortController.abort();
      }
    };

    request.on('close', onClose);

    return next.handle();
  }
}
