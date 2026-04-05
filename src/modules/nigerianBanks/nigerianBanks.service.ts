import { Injectable, Logger } from '@nestjs/common';

type TPaystackBank = {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string;
  pay_with_bank: boolean;
  active: boolean;
  is_deleted: boolean;
  country: string;
  currency: string;
  type: string;
  createdAt: string;
  updatedAt: string;
};

type TPaystackBanksResponse = {
  status: boolean;
  message: string;
  data: TPaystackBank[];
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class NigerianBanksService {
  private readonly logger = new Logger(NigerianBanksService.name);
  private cachedBanks: TPaystackBank[] | null = null;
  private cacheExpiresAt: number = 0;

  async getBanks(): Promise<TPaystackBank[]> {
    if (this.cachedBanks && Date.now() < this.cacheExpiresAt) {
      return this.cachedBanks;
    }

    try {
      const response = await fetch('https://api.paystack.co/bank?country=nigeria&perPage=100');
      const json = (await response.json()) as TPaystackBanksResponse;
      this.cachedBanks = json.data ?? [];
      this.cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return this.cachedBanks;
    } catch (err) {
      this.logger.error('Failed to fetch banks from Paystack', err);
      return this.cachedBanks ?? [];
    }
  }

  async getBankById(id: number): Promise<TPaystackBank | undefined> {
    const banks = await this.getBanks();
    return banks.find((b) => b.id === id);
  }
}
