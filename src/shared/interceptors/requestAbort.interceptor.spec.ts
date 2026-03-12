import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { RequestAbortInterceptor } from './requestAbort.interceptor';
import { RequestContextService } from '@shared/context/requestContext.service';
import { SKIP_ABORT_CHECK_KEY } from '@shared/decorators/skipAbortCheck.decorator';

function makeContext(
  options: {
    skipAbortCheck?: boolean;
    writableEnded?: boolean;
  } = {},
): {
  ctx: ExecutionContext;
  request: any;
  response: any;
} {
  const { writableEnded = false } = options;

  const listeners: Record<string, (() => void)[]> = {};
  const request: any = {
    method: 'GET',
    url: '/test',
    on: vi.fn((event: string, cb: () => void) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    emit: (event: string) => {
      if (listeners[event]) listeners[event].forEach((cb) => cb());
    },
  };

  const response: any = { writableEnded };

  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue({
    getRequest: () => request,
    getResponse: () => response,
  } as any);
  ctx.getHandler.mockReturnValue(() => {});
  ctx.getClass.mockReturnValue(class {});

  return { ctx, request, response };
}

describe('RequestAbortInterceptor', () => {
  let interceptor: RequestAbortInterceptor;
  let requestContextService: ReturnType<typeof mock<RequestContextService>>;
  let reflector: ReturnType<typeof mock<Reflector>>;

  beforeEach(() => {
    requestContextService = mock<RequestContextService>();
    reflector = mock<Reflector>();
    interceptor = new RequestAbortInterceptor(requestContextService, reflector);
  });

  it('should call next.handle() directly when @SkipAbortCheck() is present', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { ctx } = makeContext();

    const handleSpy = vi.fn().mockReturnValue(of(null));
    const next = { handle: handleSpy } as any;

    interceptor.intercept(ctx, next);

    expect(handleSpy).toHaveBeenCalledTimes(1);
    expect(requestContextService.setAbortSignal).not.toHaveBeenCalled();
  });

  it('should call requestContext.setAbortSignal with an AbortSignal for normal requests', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = makeContext();

    const next = { handle: vi.fn().mockReturnValue(of(null)) } as any;
    interceptor.intercept(ctx, next);

    expect(requestContextService.setAbortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it('should register a "close" listener on the request', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { ctx, request } = makeContext();

    const next = { handle: vi.fn().mockReturnValue(of(null)) } as any;
    interceptor.intercept(ctx, next);

    expect(request.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('should abort the signal when close fires and response is not writable ended', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { ctx, request, response } = makeContext({ writableEnded: false });

    let capturedSignal: AbortSignal | undefined;
    requestContextService.setAbortSignal.mockImplementation((signal: AbortSignal) => {
      capturedSignal = signal;
    });

    const next = { handle: vi.fn().mockReturnValue(of(null)) } as any;
    interceptor.intercept(ctx, next);

    expect(capturedSignal!.aborted).toBe(false);

    // Fire the close event
    response.writableEnded = false;
    request.emit('close');

    expect(capturedSignal!.aborted).toBe(true);
  });

  it('should NOT abort the signal when close fires and response is already writable ended', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { ctx, request } = makeContext({ writableEnded: true });

    let capturedSignal: AbortSignal | undefined;
    requestContextService.setAbortSignal.mockImplementation((signal: AbortSignal) => {
      capturedSignal = signal;
    });

    const next = { handle: vi.fn().mockReturnValue(of(null)) } as any;
    interceptor.intercept(ctx, next);

    expect(capturedSignal!.aborted).toBe(false);

    // Fire the close event - but writableEnded = true means no abort
    request.emit('close');

    expect(capturedSignal!.aborted).toBe(false);
  });

  it('should return the observable from next.handle()', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = makeContext();

    const expectedObservable = of({ result: 'data' });
    const next = { handle: vi.fn().mockReturnValue(expectedObservable) } as any;

    const result = interceptor.intercept(ctx, next);

    expect(result).toBe(expectedObservable);
  });

  it('should use SKIP_ABORT_CHECK_KEY to check the reflector', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const { ctx } = makeContext();

    const next = { handle: vi.fn().mockReturnValue(of(null)) } as any;
    interceptor.intercept(ctx, next);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      SKIP_ABORT_CHECK_KEY,
      expect.any(Array),
    );
  });
});
