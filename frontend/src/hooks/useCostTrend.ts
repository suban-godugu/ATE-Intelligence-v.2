'use client';
import { useQuery } from '@tanstack/react-query';
import { mockCostTrend } from '@/lib/mockDashboardData';
import type { CostTrendResponse, TrendGranularity } from '@/types/dashboard.types';
import { QUERY_STALE_TIMES } from '@/lib/constants';

export function useCostTrend(
  granularity: TrendGranularity = 'daily',
  fabId?: string | null,
  lotId?: string | null,
) {
  return useQuery<CostTrendResponse>({
    queryKey: ['dashboard', 'trend', granularity, fabId, lotId],
    queryFn:  async () => {
      // --- real API ---
      // return apiClient.get<CostTrendResponse>('/dashboard/cost-trend', {
      //   params: { granularity, fabId: fabId ?? undefined, lotId: lotId ?? undefined },
      // });

      return { ...mockCostTrend, granularity };
    },
    staleTime: QUERY_STALE_TIMES.trend,
    refetchInterval: QUERY_STALE_TIMES.trend,
  });
}
