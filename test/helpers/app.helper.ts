import { ClassSerializerInterceptor, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../../src/app.module';
import { AuthorizationGuard } from '../../src/shared/guards/authorization.guard';
import { ResponseInterceptor } from '../../src/shared/interceptors/response.interceptor';
import { RequestAbortInterceptor } from '../../src/shared/interceptors/requestAbort.interceptor';
import { CustomFieldValidationPipe } from '../../src/shared/validations/custom.validation';
import { RequestContextService } from '../../src/shared/context/requestContext.service';

/**
 * Creates a compiled NestJS TestingModule from the full AppModule.
 * ThrottlerGuard is overridden to allow unlimited requests in tests.
 */
export async function createTestingModule(): Promise<TestingModule> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  return module;
}

/**
 * Creates a fully initialized NestJS HTTP application that mirrors main.ts setup:
 * - Global prefix /api/v1 (excluding /health)
 * - Cookie parser
 * - CustomFieldValidationPipe + ValidationPipe
 * - AuthorizationGuard (reads APP_AUTH_NAME / APP_KEY env vars)
 * - RequestAbortInterceptor, ResponseInterceptor, ClassSerializerInterceptor
 *
 * All E2E requests must include `.set('x-api-key', 'test-api-key')` to pass AuthorizationGuard.
 */
export async function createTestApp(module: TestingModule): Promise<INestApplication> {
  const app = module.createNestApplication();

  app.setGlobalPrefix('/api/v1', { exclude: ['health'] });
  app.use(cookieParser());

  app.useGlobalPipes(
    CustomFieldValidationPipe,
    new ValidationPipe({
      transform: true,
      transformOptions: {
        excludeExtraneousValues: false,
      },
    }),
  );

  const configService = app.get(ConfigService);
  const requestContextService = app.get(RequestContextService);
  const reflector = app.get(Reflector);

  app.useGlobalGuards(new AuthorizationGuard(configService));

  app.useGlobalInterceptors(
    new RequestAbortInterceptor(requestContextService, reflector),
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(reflector),
  );

  await app.init();
  return app;
}
