import { describe, it, expect, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { ExecutionContext, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

function makeContext(
  overrides: {
    statusCode?: number;
    method?: string;
    url?: string;
    path?: string;
  } = {},
): ExecutionContext {
  const { statusCode = 200, method = 'GET', url = '/test', path = '/test' } = overrides;
  const response = { statusCode, status: () => ({ json: () => {} }) } as any;
  const request = { method, url, path } as any;

  const ctx = mock<ExecutionContext>();
  ctx.switchToHttp.mockReturnValue({
    getResponse: () => response,
    getRequest: () => request,
  } as any);

  return ctx;
}

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  describe('success path', () => {
    it('should wrap result in standard success shape', () => {
      const ctx = makeContext({ statusCode: 200, method: 'GET', url: '/api/users' });
      const callHandler = { handle: () => of({ id: '1' }) } as any;

      return new Promise<void>((resolve) => {
        interceptor.intercept(ctx, callHandler).subscribe((result: any) => {
          expect(result.success).toBe(true);
          expect(result.message).toBe('Request successful');
          expect(result.statusCode).toBe(200);
          expect(result.result).toEqual({ id: '1' });
          expect(result.path).toBe('/api/users');
          resolve();
        });
      });
    });

    it('should include a non-negative duration', () => {
      const ctx = makeContext();
      const callHandler = { handle: () => of('data') } as any;

      return new Promise<void>((resolve) => {
        interceptor.intercept(ctx, callHandler).subscribe((result: any) => {
          expect(typeof result.duration).toBe('number');
          expect(result.duration).toBeGreaterThanOrEqual(0);
          resolve();
        });
      });
    });
  });

  describe('error path: plain HttpException', () => {
    it('should return 404 status, success false, message, and path', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      // Mock response.status().json()
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      const response = { statusCode: 200, status: statusMock } as any;
      const request = { method: 'GET', url: '/api/missing', path: '/api/missing' } as any;
      const mockCtx = mock<ExecutionContext>();
      mockCtx.switchToHttp.mockReturnValue({
        getResponse: () => response,
        getRequest: () => request,
      } as any);

      const callHandler = { handle: () => throwError(() => exception) } as any;

      return new Promise<void>((resolve) => {
        interceptor.intercept(mockCtx, callHandler).subscribe({
          error: () => {
            expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                statusCode: HttpStatus.NOT_FOUND,
                path: '/api/missing',
              }),
            );
            resolve();
          },
        });
      });
    });
  });

  describe('error path: BadRequestException with array message', () => {
    it('should extract field/errors from constraint objects', () => {
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      const response = { statusCode: 200, status: statusMock } as any;
      const request = { method: 'POST', url: '/api/users', path: '/api/users' } as any;

      const mockCtx = mock<ExecutionContext>();
      mockCtx.switchToHttp.mockReturnValue({
        getResponse: () => response,
        getRequest: () => request,
      } as any);

      const validationErrors = [
        {
          property: 'email',
          constraints: { isEmail: 'email must be an email' },
        },
        {
          property: 'password',
          constraints: {
            isStrongPassword: 'Password must be strong',
            minLength: 'min length is 8',
          },
        },
      ];

      const exception = new BadRequestException(validationErrors);
      const callHandler = { handle: () => throwError(() => exception) } as any;

      return new Promise<void>((resolve) => {
        interceptor.intercept(mockCtx, callHandler).subscribe({
          error: () => {
            expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'Bad Request',
                error: expect.arrayContaining([
                  expect.objectContaining({ field: 'email', errors: expect.any(Array) }),
                  expect.objectContaining({ field: 'password', errors: expect.any(Array) }),
                ]),
              }),
            );
            resolve();
          },
        });
      });
    });
  });

  describe('error path: BadRequestException with string message', () => {
    it('should treat string message as plain HttpException', () => {
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      const response = { statusCode: 200, status: statusMock } as any;
      const request = { method: 'POST', url: '/api/users', path: '/api/users' } as any;

      const mockCtx = mock<ExecutionContext>();
      mockCtx.switchToHttp.mockReturnValue({
        getResponse: () => response,
        getRequest: () => request,
      } as any);

      const exception = new BadRequestException('Invalid input');
      const callHandler = { handle: () => throwError(() => exception) } as any;

      return new Promise<void>((resolve) => {
        interceptor.intercept(mockCtx, callHandler).subscribe({
          error: () => {
            expect(statusMock).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                statusCode: HttpStatus.BAD_REQUEST,
              }),
            );
            resolve();
          },
        });
      });
    });
  });

  describe('error path: non-HttpException Error', () => {
    it('should return 500 status and use error.message', () => {
      const jsonMock = vi.fn();
      const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
      const response = { statusCode: 200, status: statusMock } as any;
      const request = { method: 'GET', url: '/api/crash', path: '/api/crash' } as any;

      const mockCtx = mock<ExecutionContext>();
      mockCtx.switchToHttp.mockReturnValue({
        getResponse: () => response,
        getRequest: () => request,
      } as any);

      const exception = new Error('Unexpected crash');
      const callHandler = { handle: () => throwError(() => exception) } as any;

      return new Promise<void>((resolve) => {
        interceptor.intercept(mockCtx, callHandler).subscribe({
          error: () => {
            expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Unexpected crash',
              }),
            );
            resolve();
          },
        });
      });
    });
  });
});
