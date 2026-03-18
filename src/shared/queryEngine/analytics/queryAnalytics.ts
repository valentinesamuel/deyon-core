import { Injectable, Logger } from '@nestjs/common';

export interface QueryAnalyticsPayload {
  entity: string;
  execTimeMs: number;
  joinsUsed: number;
  filtersUsed: number;
  searchUsed: boolean;
  aggregationsUsed: boolean;
  rowsReturned: number;
  cacheHit: boolean;
  queryCost: number;
}

@Injectable()
export class QueryAnalytics {
  private readonly logger = new Logger('QueryEngine');

  log(payload: QueryAnalyticsPayload): void {
    this.logger.verbose(payload);
  }
}
