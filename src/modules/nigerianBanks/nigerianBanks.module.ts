import { Module } from '@nestjs/common';
import { NigerianBanksController } from './nigerianBanks.controller';
import { NigerianBanksService } from './nigerianBanks.service';

@Module({
  controllers: [NigerianBanksController],
  providers: [NigerianBanksService],
})
export class NigerianBanksModule {}
