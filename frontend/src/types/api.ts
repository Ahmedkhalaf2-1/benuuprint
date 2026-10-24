export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

/** Contract: AllExceptionsFilter (ARCHITECTURE.md §5). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path?: string;
  timestamp?: string;
  requestId?: string;
}

export type QueryParams = Record<string, string | number | boolean | null | undefined | readonly (string | number)[]>;
