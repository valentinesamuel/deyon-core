import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { RequestTrackerInterceptor } from './requestTracker.interceptor';
import { RequestTrackerService } from '../observability/requestTracker.service';

function makeContext(
  options: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    user?: any;
    statusCode?: number;
  } = {},
): { ctx: ExecutionContext; request: any; response: any } {
  const { url = '/api/test', method = 'GET', headers = {}, user, statusCode = 200 } = options;

  const request: any = { url, method, headers, user };
  const response: any = { statusCode };

  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue({
    getRequest: () => request,
    getResponse: () => response,
  } as any);

  return { ctx, request, response };
}

describe('RequestTrackerInterceptor', () => {
  let interceptor: RequestTrackerInterceptor;
  let requestTracker: ReturnType<typeof mock<RequestTrackerService>>;
  let configService: ReturnType<typeof mock<ConfigService>>;

  beforeEach(() => {
    requestTracker = mock<RequestTrackerService>();
    configService = mock<ConfigService>();

    // Default: no special debug/service headers configured
    configService.get.mockReturnValue(undefined);

    interceptor = new RequestTrackerInterceptor(requestTracker, configService);
  });

  describe('skip tracking', () => {
    it('should skip tracking and return next.handle() when debugger header matches config value', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'common.debug.debuggerName') return 'x-debugger';
        if (key === 'common.debug.debuggerKey') return 'secret-key';
        return undefined;
      });

      const { ctx } = makeContext({ headers: { 'x-debugger': 'secret-key' } });
      const handleSpy = vi.fn().mockReturnValue(of('result'));
      const next = { handle: handleSpy } as any;

      interceptor.intercept(ctx, next);

      expect(handleSpy).toHaveBeenCalled();
      expect(requestTracker.startRequest).not.toHaveBeenCalled();
    });

    it('should skip tracking when internal service header is present', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'common.debug.debuggerName') return undefined;
        if (key === 'common.debug.debuggerKey') return undefined;
        if (key === 'common.auth.serviceAccessName') return 'x-internal-service';
        return undefined;
      });

      const { ctx } = makeContext({ headers: { 'x-internal-service': 'false' } });
      const handleSpy = vi.fn().mockReturnValue(of('result'));
      const next = { handle: handleSpy } as any;

      interceptor.intercept(ctx, next);

      expect(handleSpy).toHaveBeenCalled();
      expect(requestTracker.startRequest).not.toHaveBeenCalled();
    });
  });

  describe('normal request tracking', () => {
    it('should call startRequest with path, method, requestId, and startTime', () => {
      const { ctx } = makeContext({ url: '/api/users', method: 'POST' });
      const next = { handle: vi.fn().mockReturnValue(of('result')) } as any;

      interceptor.intercept(ctx, next);

      expect(requestTracker.startRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/users',
          method: 'POST',
          requestId: expect.any(String),
          startTime: expect.any(Number),
        }),
      );
    });

    it('should use x-request-id header as requestId when provided', () => {
      const { ctx } = makeContext({ headers: { 'x-request-id': 'my-request-id-123' } });
      const next = { handle: vi.fn().mockReturnValue(of('result')) } as any;

      interceptor.intercept(ctx, next);

      expect(requestTracker.startRequest).toHaveBeenCalledWith(
        expect.objectContaining({ requestId: 'my-request-id-123' }),
      );
    });

    it('should generate a UUID requestId when x-request-id header is not provided', () => {
      const { ctx } = makeContext({ headers: {} });
      const next = { handle: vi.fn().mockReturnValue(of('result')) } as any;

      interceptor.intercept(ctx, next);

      expect(requestTracker.startRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
        }),
      );
    });

    it('should call endRequest with requestId and status code after observable completes', async () => {
      const { ctx, response } = makeContext({ statusCode: 201 });
      response.statusCode = 201;

      const next = { handle: vi.fn().mockReturnValue(of('result')) } as any;

      await new Promise<void>((resolve) => {
        interceptor.intercept(ctx, next).subscribe({
          next: () => {},
          error: () => resolve(),
          complete: () => resolve(),
        });
      });

      expect(requestTracker.endRequest).toHaveBeenCalledWith(expect.any(String), 201);
    });
  });

  describe('user context', () => {
    it('should include userId, userEmail, and role when request.user is populated', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: { name: 'admin', alias: 'admin' },
      };

      const { ctx } = makeContext({ user });
      const next = { handle: vi.fn().mockReturnValue(of('result')) } as any;

      interceptor.intercept(ctx, next);

      expect(requestTracker.startRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          userEmail: 'test@example.com',
          role: 'admin',
        }),
      );
    });

    it('should have undefined userId/userEmail/role when no request.user', () => {
      const { ctx } = makeContext({ user: undefined });
      const next = { handle: vi.fn().mockReturnValue(of('result')) } as any;

      interceptor.intercept(ctx, next);

      expect(requestTracker.startRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: undefined,
          userEmail: undefined,
          role: undefined,
        }),
      );
    });
  });
});
