import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface ApiFilters {
  page: number;
  limit: number;
  skip: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters: Record<string, any>;
}

export const GetApiFilters = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ApiFilters => {
    const request = ctx.switchToHttp().getRequest();
    const query = request.query;

    const page = parseInt(query.page as string, 10) || 1;
    const limit = parseInt(query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const sortBy = (query.sortBy as string) || undefined;
    const sortOrder = (query.sortOrder as string) === 'desc' ? 'desc' : 'asc';
    const search = (query.search as string) || undefined;

    const filters: Record<string, any> = {};
    for (const key in query) {
      if (!['page', 'limit', 'sortBy', 'sortOrder', 'search'].includes(key)) {
        filters[key] = query[key];
      }
    }

    return {
      page,
      limit,
      skip,
      sortBy,
      sortOrder,
      search,
      filters,
    };
  },
);
