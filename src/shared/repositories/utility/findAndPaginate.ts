import {
  FindOptionsOrder,
  FindOptionsRelationByString,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ILike,
  In,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { IQuery } from '../interface/query.interface';
import { IPaged } from '../interface/paged.interface';

export interface IPaginationFilterParam<T extends ObjectLiteral> {
  repository: Repository<T>;
  query: IQuery;
  qWhere?: FindOptionsWhere<T>;
  relations?: FindOptionsRelations<T> | FindOptionsRelationByString;
  select?: (keyof T)[] | FindOptionsSelect<T>;
  options?: { withDeleted?: boolean };
}

export function combineAndWithOr(
  filterAnd: Record<string, unknown>,
  filterOr: Record<string, unknown>,
): FindOptionsWhere<object>[] | FindOptionsWhere<object> {
  filterAnd = filterAnd ?? {};
  filterOr = filterOr ?? {};
  // Remove empty values from filterAnd
  const cleanedFilterAnd = Object.fromEntries(
    Object.entries(filterAnd).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );

  const where: Record<string, unknown> = { ...cleanedFilterAnd };
  const combined: FindOptionsWhere<object>[] = [];
  if (filterOr && Object.keys(filterOr).length > 0) {
    Object.keys(filterOr).forEach((key) => {
      combined.push({ ...where, [key]: filterOr[key] } as FindOptionsWhere<object>);
    });
  }
  return combined.length > 0 ? combined : (where as FindOptionsWhere<object>);
}

function formatQuery(
  filter: Record<string, unknown> | FindOptionsWhere<object>[] | undefined,
): Record<string, unknown> | FindOptionsWhere<object>[] {
  const obj: Record<string, unknown> = {};
  if (filter && isArray(filter)) {
    return filter as FindOptionsWhere<object>[];
  }
  if (filter && isObject(filter)) {
    Object.keys(filter).forEach((key) => {
      const val = (filter as Record<string, unknown>)[key];
      if (isArray(val) && isArrayOfStringOrNumber(val)) {
        obj[key] = In(val as (string | number)[]);
      } else if (isObject(val)) {
        obj[key] = val;
      } else {
        obj[key] = val;
      }
    });
  }
  return obj;
}

function isArrayOfStringOrNumber(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((item: unknown) => typeof item === 'string' || typeof item === 'number')
  );
}

function isArray(value: unknown): boolean {
  return Array.isArray(value);
}

function isObject(value: unknown): boolean {
  return typeof value === 'object' && !Array.isArray(value);
}

export function convertQueryParamsToObject(
  query: Record<string, string | Record<string, unknown>>,
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  Object.keys(query).forEach((key) => {
    const qVal = query[key];
    if (qVal === 'true') {
      obj[key] = true;
    } else if (qVal === 'false') {
      obj[key] = false;
    } else if (qVal === 'null') {
      obj[key] = null;
    } else if (typeof qVal === 'string' && /^[0-9\.]+$/.test(qVal)) {
      obj[key] = Number(qVal);
    } else if (
      (typeof qVal == 'string' &&
        qVal &&
        qVal.trim().charAt(0) === '{' &&
        qVal.trim().charAt(qVal.trim().length - 1) === '}') ||
      (typeof qVal == 'string' &&
        qVal &&
        qVal.trim().charAt(0) === '[' &&
        qVal.trim().charAt(qVal.trim().length - 1) === ']')
    ) {
      if (typeof qVal === 'string' && qVal.trim().charAt(1) === '"') {
        obj[key] = JSON.parse(qVal);
      } else if (typeof qVal === 'string' && qVal.trim().charAt(1) !== '"') {
        obj[key] = qVal
          .trim()
          .replace(/[\[\]']+/g, '')
          .split(',')
          .map((e: string) => e.trim());
      }
    } else if (typeof qVal == 'object') {
      obj[key] = qVal;
    } else {
      obj[key] = qVal;
    }
  });
  return obj;
}

export function sanitizeOrder(order: Record<string, unknown>): Record<string, unknown> {
  if (typeof order === 'object' && !Array.isArray(order)) {
    // Recursively sanitize each key in the order object
    return Object.fromEntries(
      Object.entries(order)
        .map(([key, value]) => {
          if (typeof value === 'string' && value.trim() === '') {
            return [key, undefined]; // Remove empty strings
          }
          if (
            typeof value === 'object' &&
            value !== null &&
            Object.keys(value as object).length === 0
          ) {
            return [key, undefined]; // Remove empty objects
          }
          if (typeof value === 'object' && value !== null) {
            return [key, sanitizeOrder(value as Record<string, unknown>)]; // Recursively clean nested objects
          }
          return [key, value]; // Leave other values intact
        })
        .filter(([, value]) => value !== undefined), // Remove undefined entries
    );
  }
  return order; // Return as-is if not an object
}

/**
 * Paginates and filters repository results based on query parameters.
 * @param repository - The repository to query.
 * @param query - The query parameters including pagination and filters.
 * @param qWhere - Additional query conditions.
 * @param relations - Additional relations to include.
 * @param select - fields to select.
 * @param options - sort and order option.
 * @returns A promise that resolves to a paginated result object.
 *
 * // To use a AND filter
 * @example
 * ?filter[businessId]=75352a3e-74f2-4e7f-ac90-db419004bc16 => (where businessId = '75352a3e-74f2-4e7f-ac90-db419004bc16')
 *
 * // To use a OR filter
 * @example
 * ?filterOr[name]=john&filterOr[name]=sarah => (where name = 'john' or name = 'sarah')
 *
 * // To use a OR filter with AND filter
 * @example
 * ?filter[businessId]=75352a3e-74f2-4e7f-ac90-db419004bc16&filterOr[name]=john&filterOr[description]=john => (where businessId = '75352a3e-74f2-4e7f-ac90-db419004bc16' and (name = 'john' or description = 'john')
 *
 * // To use a OR filter with IN filter
 * @example
 * ?filterAnd[name] = [john, sarah] => where name in ('%john%', '%sarah%')
 * ?filterOr[name] = [john, sarah] => where name in ('%john%', '%sarah%')
 */
export async function findAndPaginate<T extends ObjectLiteral>(
  filterParams: IPaginationFilterParam<T>,
): Promise<IPaged<T[]>> {
  const { repository, query, qWhere, relations, select, options } = filterParams;
  query.page = Number(query.page) > 1 ? Number(query.page) - 1 : 0;

  // Apply default and maximum limits to prevent performance issues
  const DEFAULT_LIMIT = 10;
  const MAX_LIMIT = 50;
  let requestedLimit = Number(query.limit) || DEFAULT_LIMIT;

  // Enforce maximum limit
  if (requestedLimit > MAX_LIMIT) {
    console.warn(`Requested limit ${requestedLimit} exceeds maximum ${MAX_LIMIT}. Using maximum.`);
    requestedLimit = MAX_LIMIT;
  }

  const take = requestedLimit;
  const skip = query.page * take || 0;
  // const whereAnd = { ...qWhere, ...formatQuery(query.filterAnd) };
  const whereAnd = {
    ...qWhere,
    ...Object.fromEntries(
      Object.entries(formatQuery(query.filterAnd)).filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      ),
    ),
  };

  const whereOr = formatQuery(query.filterOr);

  let order: FindOptionsOrder<T> = { createdAt: 'DESC' } as unknown as FindOptionsOrder<T>;

  if (query.order && typeof query.order === 'object') {
    order = sanitizeOrder(query.order as Record<string, unknown>) as FindOptionsOrder<T>;
  }

  const where = combineAndWithOr(
    whereAnd as Record<string, unknown>,
    whereOr as Record<string, unknown>,
  );

  if (query.search && typeof query.search === 'object' && Object.keys(query.search).length > 0) {
    Object.keys(query.search).forEach((key) => {
      const searchEntry = query.search as Record<string, unknown>;
      if (typeof searchEntry[key] === 'object' && searchEntry[key] !== null) {
        const nested = searchEntry[key] as Record<string, string>;
        (where as Record<string, unknown>)[key] = {};
        for (const nestedKey of Object.keys(nested)) {
          const searchValue = nested[nestedKey];
          // Replace spaces with `+` for cases where `+` is intended
          const sanitizedValue = searchValue?.replace(/\s/g, '+');
          ((where as Record<string, unknown>)[key] as Record<string, unknown>)[nestedKey] = ILike(
            `%${sanitizedValue}%`,
          );
        }
      } else {
        const searchValue = searchEntry[key] as string;
        const sanitizedValue = searchValue?.replace(/\s/g, '+');
        (where as Record<string, unknown>)[key] = ILike(`%${sanitizedValue}%`);
      }
    });
  }

  const [result, total] = await repository.findAndCount({
    where: where as FindOptionsWhere<T> | FindOptionsWhere<T>[],
    order,
    take: take,
    skip: skip,
    relations,
    select,
    withDeleted: options?.withDeleted,
  });

  const mainPage = query.page + 1;
  const numberOfPages = Math.ceil(total / take);
  const nextPage = mainPage + 1;

  return {
    data: result,
    meta: {
      page: mainPage,
      limit: take,
      totalRecords: total,
      previousPage: mainPage > 1 ? mainPage - 1 : false,
      nextPage: numberOfPages >= nextPage ? nextPage : false,
      pageCount: numberOfPages,
    },
  };
}
