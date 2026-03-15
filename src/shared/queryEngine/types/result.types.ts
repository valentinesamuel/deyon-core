export interface CursorMeta {
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  limit: number;
  totalRecords?: number;
}

export interface CursorPage<T> {
  data: T[];
  meta: CursorMeta;
}

export interface QueryResult<T> {
  data: T[];
  total: number;
  limit: number;
  cursor?: string | null;
}
