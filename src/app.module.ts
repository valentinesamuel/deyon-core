import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configSchema from '@config/schema.config';
import common from '@config/common.config';
import typeorm from '@config/typeorm.config';
import cacheConfig from '@config/cache.config';
import { Broker } from '@broker/broker';
import { AppController } from './app.controller';
import { ClsModule } from 'nestjs-cls';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ClsContextGuard } from '@shared/guards/clsContext.guard';
import { PermissionGuard } from '@shared/guards/permission.guard';
import { JwtAuthGuard } from '@shared/guards/jwtAuth.guard';
import { RequestContextService } from '@shared/context/requestContext.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@modules/auth/auth.module';
import { RoleModule } from '@modules/role/role.module';
import { SetupModule } from '@modules/setup/setup.module';
import { StaffModule } from '@modules/staff/staff.module';
import { PatModule } from '@modules/pat/pat.module';
import { CacheModule } from '@adapters/cache/cache.module';
import { QueryEngineModule } from '@shared/queryEngine';
import { HmoModule } from '@modules/hmo/hmo.module';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import { TerminusModule } from '@nestjs/terminus';
import { RedisHealthIndicator } from '@shared/observability/redis.health';
import { RedisProvider } from '@adapters/cache/providers/redis.provider';
import { IdempotencyInterceptor } from '@shared/interceptors/idempotency.interceptor';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      load: [common, typeorm, cacheConfig],
      ...configSchema,
    }),
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isDevelopment = configService.get<boolean>('common.isDevelopment');
        return {
          transports: [
            new winston.transports.Console({
              format: isDevelopment
                ? winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.ms(),
                    nestWinstonModuleUtilities.format.nestLike(
                      configService.get('common.appName'),
                      { prettyPrint: true, colors: true },
                    ),
                  )
                : winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.ms(),
                    winston.format.json(),
                  ),
            }),
          ],
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => configService.get('typeormConfig')!,
    }),
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    ThrottlerModule.forRoot([{ ttl: 30000, limit: 10 }]),
    TerminusModule,
    CacheModule,
    QueryEngineModule,
    AuthModule,
    RoleModule,
    SetupModule,
    PatModule,
    StaffModule,
    HmoModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    Broker,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClsContextGuard,
    },
    RequestContextService,
    RedisHealthIndicator,
    RedisProvider,
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
  exports: [Broker],
})
export class AppModule {}
