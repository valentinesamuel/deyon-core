import { Injectable } from '@nestjs/common';
import { PaystackBankProvider } from './adapters/paystack.bank.provider';
import { TBank } from './adapters/bank-provider.adapter';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class BanksService {
  private readonly cache = new Map<string, { banks: TBank[]; expiresAt: number }>();

  constructor(private readonly paystackProvider: PaystackBankProvider) {}

  async getBanks(country: string): Promise<TBank[]> {
    const key = country.toUpperCase();
    const cached = this.cache.get(key);

    if (cached && Date.now() < cached.expiresAt) {
      return cached.banks;
    }

    const banks = await this.resolveProvider(key).getBanks(key);
    this.cache.set(key, { banks, expiresAt: Date.now() + CACHE_TTL_MS });
    return banks;
  }

  private resolveProvider(country: string) {
    // Country → provider registry; extend as new providers are added
    const registry: Record<string, PaystackBankProvider> = {
      NG: this.paystackProvider,
    };

    return registry[country] ?? this.paystackProvider;
  }
}
