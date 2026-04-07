import { Injectable, Logger } from '@nestjs/common';
import { IBankProvider, TBank } from './bank-provider.adapter';

type TPaystackBanksResponse = {
  status: boolean;
  message: string;
  data: TBank[];
};

@Injectable()
export class PaystackBankProvider implements IBankProvider {
  private readonly logger = new Logger(PaystackBankProvider.name);

  async getBanks(_country: string): Promise<TBank[]> {
    // Paystack only supports Nigerian banks; country param ignored
    try {
      const response = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100');
      const json = (await response.json()) as TPaystackBanksResponse;
      return json.data ?? [];
    } catch (err) {
      this.logger.error('Failed to fetch banks from Paystack', err);
      return [];
    }
  }
}
