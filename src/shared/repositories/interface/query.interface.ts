export type IOrder<T = unknown> = {
  [K in keyof T]?: 'asc' | 'desc' | 'ASC' | 'DESC';
};

export interface IQuery {
  limit?: number;
  page?: number;
  filterAnd?: Record<string, unknown>;
  filterOr?: Record<string, unknown>;
  search?: Record<string, unknown>;
  order?: IOrder;
}
