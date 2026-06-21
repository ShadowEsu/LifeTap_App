/**
 * Standardized API response builders.
 * Every endpoint uses these helpers to ensure a consistent response envelope.
 */

import { Response } from 'express';
import { ApiSuccessResponse, ApiErrorResponse, PaginationMeta, ResponseMeta } from '../types';

function buildMeta(requestId: string, pagination?: PaginationMeta, total?: number): ResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    request_id: requestId,
    ...(pagination ? { pagination } : {}),
    ...(total !== undefined ? { total } : {}),
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  options: {
    statusCode?: number;
    pagination?: PaginationMeta;
    total?: number;
  } = {},
): void {
  const requestId = (res.req as Express.Request).requestId ?? 'unknown';
  const { statusCode = 200, pagination, total } = options;

  const response: ApiSuccessResponse<T> = {
    status: 'success',
    data,
    meta: buildMeta(requestId, pagination, total),
  };

  res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): void {
  const requestId = (res.req as Express.Request).requestId ?? 'unknown';

  const response: ApiErrorResponse = {
    status: 'error',
    data: null,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    meta: buildMeta(requestId),
  };

  res.status(statusCode).json(response);
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
  baseUrl: string,
): PaginationMeta {
  const pages = Math.ceil(total / limit);
  const hasNext = page < pages;
  const hasPrevious = page > 1;

  return {
    page,
    limit,
    total,
    pages,
    has_next: hasNext,
    has_previous: hasPrevious,
    next_page_url: hasNext ? `${baseUrl}?page=${page + 1}&limit=${limit}` : null,
    previous_page_url: hasPrevious ? `${baseUrl}?page=${page - 1}&limit=${limit}` : null,
  };
}
