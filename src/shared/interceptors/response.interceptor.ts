import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Response, Request } from 'express';

export type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  result: T;
  path: string;
  duration: number;
};

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, TResponse<T>> {
  private readonly logger = new Logger(ResponseInterceptor.name);
  constructor() {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<TResponse<T>> {
    const startTime = Date.now();
    return next.handle().pipe(
      map((res: unknown) => this.responseHandler(res, context, startTime)),
      catchError((err: HttpException) =>
        throwError(() => this.errorHandler(err, context, startTime)),
      ),
    );
  }

  // Handles success response
  responseHandler(res: any, context: ExecutionContext, startTime: number) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const statusCode = response.statusCode;

    const duration = Date.now() - startTime;
    this.logger.log(`${request.method} ${request.url} ${statusCode} ${duration}ms`);

    return {
      statusCode,
      success: true,
      message: 'Request successful',
      result: res,
      path: request.url,
      duration: Date.now() - startTime,
    };
  }

  // Handles error response
  errorHandler(exception: any, context: ExecutionContext, startTime: number) {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const message = exception?.getResponse ? exception?.getResponse().message : exception.message;
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof BadRequestException) {
      if (typeof message === 'object') {
        const responseMsr = message.map((data: any) => {
          const errors = [];
          for (const key of Object.keys(data.constraints)) {
            errors.push(data.constraints[key]);
          }
          return {
            field: data.property,
            errors,
          };
        });

        // Concise error logging to prevent memory bloat
        this.logger.error({
          statusCode: status,
          message: 'Bad Request',
          errorName: exception.name,
          fields: responseMsr.map((r: { field: string }) => r.field),
          url: request.url,
          method: request.method,
          duration: Date.now() - startTime,
        });

        return response.status(status).json({
          statusCode: status,
          success: false,
          message: 'Bad Request',
          error: responseMsr,
          path: request.path,
          duration: Date.now() - startTime,
        });
      }
    }

    // Concise error logging to prevent memory bloat
    this.logger.error({
      statusCode: status,
      message: message ?? 'Request failed',
      errorName: exception.name,
      url: request.url,
      method: request.method,
      duration: Date.now() - startTime,
    });

    // Send to Slack for 500+ errors
    // if (status >= 500) {
    //   this.slackService.sendErrorNotification(exception, request, response).catch((error) => {
    //     this.logger.error('❌ Failed to send Slack notification:', error);
    //   });
    // }

    response.status(status).json({
      statusCode: status,
      success: false,
      message: message ?? 'Request failed',
      errors: [],
      path: request.url,
      duration: Date.now() - startTime,
    });
  }
}
