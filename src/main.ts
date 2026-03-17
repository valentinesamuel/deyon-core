import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from '@shared/interceptors/response.interceptor';
import { CustomFieldValidationPipe } from '@shared/validations/custom.validation';
import { AuthorizationGuard } from '@shared/guards/authorization.guard';
import { RequestContextService } from '@shared/context/requestContext.service';
import { RequestAbortInterceptor } from '@shared/interceptors/requestAbort.interceptor';
import { IncomingMessage, Server, ServerResponse } from 'node:http';

const PRODUCT_NAME = 'Deyon Core';
const PRODUCT_TAG = 'Deyon Core';
const PRODUCT_VERSION = '1.0.0';

type TNestApp = NestExpressApplication<Server<typeof IncomingMessage, typeof ServerResponse>>;

function setUpCORS(app: TNestApp, configService: ConfigService) {
  // Determine the allowed origins
  const whitelist = configService
    .get<string>('CORS_WHITELIST')!
    .split(',')
    .map((pattern) => new RegExp(pattern));

  // Enable localhost on dev/staging servers only
  if ([undefined, 'development', 'localhost'].includes(process.env.NODE_ENV)) {
    whitelist.push(/http(s)?:\/\/localhost:/);
  }

  Logger.log(`Approved domains: ${whitelist.join(',')}`);

  const options = {
    origin: whitelist,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-control',
      'X-Api-Token',
    ],
    credentials: true,
  };

  app.enableCors(options);
}

function buildAPIDocumentation(app: TNestApp, configService: ConfigService) {
  const swaggerOptions = new DocumentBuilder()
    .setTitle(`${PRODUCT_NAME} API Documentation`)
    .setDescription('List of all the APIs for Deyon Core Service.')
    .setVersion(PRODUCT_VERSION)
    .addTag(PRODUCT_TAG)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup(configService.get<string>('common.swaggerApiRoot')!, app, document);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Express 5.x defaults to 'simple' query parser (Node.js querystring module),
  // which does not support bracket notation like filter[isActive][eq]=false.
  // Switch to 'extended' (qs) so nested bracket params are parsed as objects.
  app.set('query parser', 'extended');
  app.setGlobalPrefix('/api/v1', { exclude: ['health'] });
  const configService = app.get(ConfigService);
  const requestContextService = app.get(RequestContextService);
  const reflector = app.get(Reflector);

  // Setup Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Set cors options
  setUpCORS(app, configService);

  // Enable cookie parser
  app.use(cookieParser());

  // Enable global validation pipe
  app.useGlobalPipes(
    CustomFieldValidationPipe,
    new ValidationPipe({
      transform: true,
      transformOptions: {
        excludeExtraneousValues: false, // Keep all non-excluded fields
      },
    }),
  );

  // Enable global guard
  app.useGlobalGuards(new AuthorizationGuard(configService));

  // Set global response interceptor
  app.useGlobalInterceptors(
    new RequestAbortInterceptor(requestContextService, reflector),
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(reflector),
  );

  // Build API documentation
  buildAPIDocumentation(app, configService);

  // Start HTTP Service
  await app.listen(configService.get<number>('common.port')!);

  Logger.log(
    `${PRODUCT_NAME} running on port ${configService.get('common.port')}: visit http://localhost:${configService.get('common.port')}/${configService.get('common.swaggerApiRoot')}`,
  );
}

bootstrap().catch((error: Error) => {
  Logger.error('Unhandled startup error', { error });
  process.exit(1);
});
