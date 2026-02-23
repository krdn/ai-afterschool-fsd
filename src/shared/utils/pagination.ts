import type { PaginationParams, PaginatedResult } from "../types/common";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * 페이지네이션 파라미터를 정규화합니다.
 */
export function normalizePaginationParams(
  params?: PaginationParams
): Required<PaginationParams> {
  const page = Math.max(1, Math.floor(params?.page ?? DEFAULT_PAGE));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(params?.pageSize ?? DEFAULT_PAGE_SIZE))
  );

  return { page, pageSize };
}

/**
 * Prisma findMany에 전달할 skip/take 값을 계산합니다.
 */
export function getPrismaSkipTake(params: Required<PaginationParams>): {
  skip: number;
  take: number;
} {
  return {
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
  };
}

/**
 * 조회 결과와 total count로 PaginatedResult를 생성합니다.
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: Required<PaginationParams>
): PaginatedResult<T> {
  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}
