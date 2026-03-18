import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueryEngineService } from './queryEngine.service';
import { QueryCache } from './cache/queryCache';
import { QueryAnalytics } from './analytics/queryAnalytics';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([])],
  providers: [QueryEngineService, QueryCache, QueryAnalytics],
  exports: [QueryEngineService],
})
export class QueryEngineModule {}
