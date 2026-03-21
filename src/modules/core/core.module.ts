import { CacheModule } from '@adapters/cache/cache.module';
import { Broker } from '@broker/broker';
import { Global, Module } from '@nestjs/common';
import { RequestContextService } from '@shared/context/requestContext.service';
import { ApplicationUtility } from '@shared/utility/applicationUtility.service';

@Global()
@Module({
  imports: [CacheModule],
  providers: [Broker, RequestContextService, ApplicationUtility],
  exports: [Broker, RequestContextService, ApplicationUtility, CacheModule],
})
export class CoreModule {}
