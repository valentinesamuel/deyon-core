import { createHash } from 'crypto';
import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CacheAdapter } from '@adapters/cache/cache.adapter';
import { CacheDbType } from '@adapters/cache/providers/redis.provider';
import { RedisKeys, RedisTTL } from '@adapters/cache/cache.constants';
import { IS_PUBLIC_KEY } from '@shared/decorators/isPublic.decorator';
import { RequestContextService } from '@shared/context/requestContext.service';

const IDEMPOTENCY_HEADER = 'x-idempotency-key';
const IDEMPOTENCY_REPLAY_HEADER = 'X-Idempotency-Replayed';
const PENDING_SENTINEL = '__PENDING__';
const CACHE_OPT = { db: CacheDbType.AUTH };

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly cache: CacheAdapter,
    private readonly reflector: Reflector,
    private readonly requestContext: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    if (!['POST', 'PUT'].includes(request.method)) {
      return next.handle();
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return next.handle();
    }

    const clientKey = request.headers[IDEMPOTENCY_HEADER] as string | undefined;
    if (!clientKey) {
      throw new BadRequestException(
        'X-Idempotency-Key header is required for POST and PUT requests',
      );
    }

    const userId = this.requestContext.getUserId();
    const method = request.method;
    const path = request.path;
    const bodyHash = createHash('sha256')
      .update(JSON.stringify(request.body ?? {}))
      .digest('hex');
    const redisKey = RedisKeys.idempotencyKey(userId, method, path, clientKey, bodyHash);

    return new Observable((subscriber) => {
      this.processIdempotency(redisKey, response, next).then(
        (obs) => obs.subscribe(subscriber),
        (err) => subscriber.error(err),
      );
    });
  }

  private async processIdempotency(
    redisKey: string,
    response: Response,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cached = await this.cache.get<{ result: unknown } | string>(redisKey, CACHE_OPT);

    if (cached) {
      if (cached === PENDING_SENTINEL) {
        throw new ConflictException(
          'A request with this idempotency key is already being processed',
        );
      }
      this.logger.log(`Idempotency replay: ${redisKey}`);
      response.setHeader(IDEMPOTENCY_REPLAY_HEADER, 'true');
      return of((cached as { result: unknown }).result);
    }

    // Atomically claim the key — prevents concurrent requests from racing
    const locked = await this.cache.setnx(
      redisKey,
      PENDING_SENTINEL,
      RedisTTL.idempotencyPending,
      CACHE_OPT,
    );

    if (!locked) {
      // Another instance claimed it — re-read to determine state
      const raceValue = await this.cache.get<{ result: unknown } | string>(redisKey, CACHE_OPT);
      if (raceValue === PENDING_SENTINEL) {
        throw new ConflictException(
          'A request with this idempotency key is already being processed',
        );
      }
      if (raceValue) {
        response.setHeader(IDEMPOTENCY_REPLAY_HEADER, 'true');
        return of((raceValue as { result: unknown }).result);
      }
      // Key was deleted (prior request failed) — fall through and proceed normally
    }

    return next.handle().pipe(
      tap(async (result) => {
        await this.cache.set(
          redisKey,
          { result },
          { db: CacheDbType.AUTH, ttl: RedisTTL.idempotency },
        );
      }),
      catchError((err) => {
        // Remove sentinel so the client can safely retry after a failed request
        this.cache.del(redisKey, CACHE_OPT).catch(() => {});
        return throwError(() => err);
      }),
    );
  }
}
