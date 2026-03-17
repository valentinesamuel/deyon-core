import { Broker } from '@broker/broker';
import { Module } from '@nestjs/common';
import { RequestContextService } from '@shared/context/requestContext.service';

@Module({
  imports: [],
  providers: [Broker, RequestContextService],
  exports: [Broker, RequestContextService],
})
export class CoreModule {}
