import { Broker } from '@broker/broker';
import { Module } from '@nestjs/common';
import { RequestContextService } from '@shared/context/requestContext.service';
import { ApplicationUtility } from '@shared/utility/applicationUtility.service';

@Module({
  imports: [],
  providers: [Broker, RequestContextService, ApplicationUtility],
  exports: [Broker, RequestContextService, ApplicationUtility],
})
export class CoreModule {}
