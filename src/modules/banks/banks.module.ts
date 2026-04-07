import { Module } from '@nestjs/common';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';
import { PaystackBankProvider } from './adapters/paystack.bank.provider';

@Module({
  controllers: [BanksController],
  providers: [BanksService, PaystackBankProvider],
})
export class BanksModule {}
