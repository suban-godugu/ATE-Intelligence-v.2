'use client';
import { useInfiniteQuery } from '@tanstack/react-query';
import { mockPatterns } from '@/lib/mockDashboardData';
import type { PatternCostResponse } from '@/types/dashboard.types';
import { PATTERN_PAGE_SIZE } from '@/lib/constants';

export function usePatternCost(lotId?: string | null) {
  return useInfiniteQuery<PatternCostResponse>({
    queryKey:       ['dashboard', 'patterns', lotId],
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasMore ? last.page + 1 : undefined,
    queryFn: async ({ pageParam = 1 }) => {
      // --- real API ---
      // return apiClient.get<PatternCostResponse>('/dashboard/pattern-cost', {
      //   params: { lotId: lotId ?? undefined, page: pageParam, pageSize: PATTERN_PAGE_SIZE },
      // });

      const page     = pageParam as number;
      const start    = (page - 1) * PATTERN_PAGE_SIZE;
      const slice    = mockPatterns.slice(start, start + PATTERN_PAGE_SIZE);
      return {
        data:     slice,
        total:    mockPatterns.length,
        page,
        pageSize: PATTERN_PAGE_SIZE,
        hasMore:  start + PATTERN_PAGE_SIZE < mockPatterns.length,
      };
    },
    staleTime: 0,
  });
}
