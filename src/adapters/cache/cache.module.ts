import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisProvider } from './providers/redis.provider';
import { CacheAdapter } from './cache.adapter';
import { RequestContextService } from '@shared/context/requestContext.service';

@Module({
  imports: [],
  providers: [RedisProvider, CacheAdapter, ConfigService, RequestContextService],
  exports: [CacheAdapter, RedisProvider, RequestContextService],
})
export class CacheModule {}
