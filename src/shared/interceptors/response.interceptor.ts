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

interface ValidationErrorItem {
  property: string;
  constraints: Record<string, string>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, TResponse<T>> {
  private readonly logger = new Logger(ResponseInterceptor.name);

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
  responseHandler(res: unknown, context: ExecutionContext, startTime: number) {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = response.statusCode;

    const duration = Date.now() - startTime;
    this.logger.log(`${request.method} ${request.url} ${statusCode} ${duration}ms`);

    return {
      statusCode,
      success: true,
      message: 'Request successful',
      result: res as T,
      path: request.url,
      duration: Date.now() - startTime,
    };
  }

  // Handles error response
  errorHandler(
    exception: HttpException | Error,
    context: ExecutionContext,
    startTime: number,
  ): HttpException | Error {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const rawResponse = exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      rawResponse && typeof rawResponse === 'object' && 'message' in rawResponse
        ? (rawResponse as { message: string | ValidationErrorItem[] }).message
        : exception.message;
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof BadRequestException) {
      if (Array.isArray(message)) {
        const responseMsr = message.map((data) => {
          const errors: string[] = [];
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

        response.status(status).json({
          statusCode: status,
          success: false,
          message: 'Bad Request',
          error: responseMsr,
          path: request.path,
          duration: Date.now() - startTime,
        });

        return exception;
      }
    }

    let logMessage: string;
    if (Array.isArray(message)) {
      logMessage = `${message.length} validation error(s)`;
    } else if (typeof message === 'string') {
      logMessage = message;
    } else {
      logMessage = 'Request failed';
    }

    // Concise error logging to prevent memory bloat
    this.logger.error({
      statusCode: status,
      message: logMessage,
      errorName: exception.name,
      url: request.url,
      method: request.method,
      duration: Date.now() - startTime,
    });

    response.status(status).json({
      statusCode: status,
      success: false,
      message: logMessage,
      errors: [],
      path: request.url,
      duration: Date.now() - startTime,
    });

    return exception;
  }
}
