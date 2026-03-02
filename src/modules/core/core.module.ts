import { Broker } from '@broker/broker';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [Broker],
  exports: [Broker],
})
export class CoreModule {}
