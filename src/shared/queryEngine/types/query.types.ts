import { ASTNode } from './ast.types';

export type SortDir = 'ASC' | 'DESC';

export interface SortField {
  field: string;
  dir: SortDir;
}

export interface SearchInput {
  field: string;
  type: 'fts' | 'tri';
  value: string;
}

export interface QueryInput {
  where?: string;
  filter?: Record<string, Record<string, string>>;
  sort?: string;
  limit?: number;
  cursor?: string;
  search?: Record<string, Record<string, string>>;
  groupBy?: string;
  aggregate?: Record<string, string>;
  having?: string;
  include?: string;
  fields?: Record<string, string>;
  withDeleted?: boolean;
  withTotal?: boolean;
}

export interface ParsedQuery {
  whereAst: ASTNode | null;
  havingAst: ASTNode | null;
  sort: SortField[];
  limit: number;
  cursor: string | null;
  search: SearchInput[];
  groupBy: string[];
  aggregates: { fn: string; field: string }[];
  include: string[];
  fields: Record<string, string[]>;
  withDeleted: boolean;
  withTotal: boolean;
}
