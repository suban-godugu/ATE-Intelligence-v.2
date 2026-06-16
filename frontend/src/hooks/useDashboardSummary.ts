'use client';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { mockSummary } from '@/lib/mockDashboardData';
import type { SummaryResponse, KpiMetric } from '@/types/dashboard.types';
import { QUERY_STALE_TIMES } from '@/lib/constants';

// Swap the mock import for apiClient.get<SummaryResponse>('/dashboard/summary', {...})
// when the NestJS backend is running.
export function useDashboardSummary(fabId?: string | null, lotId?: string | null) {
  return useQuery<SummaryResponse>({
    queryKey: ['dashboard', 'summary', fabId, lotId],
    queryFn:  async () => {
      // If lotId is mock (defaults to 'lot-001') or empty, use the stunning mock summary
      if (!lotId || lotId.startsWith('lot-')) {
        return mockSummary;
      }

      const { data } = await apiClient.get<any>('/dashboard/summary', {
        params: { 
          fabId: fabId ?? undefined, 
          lotId: lotId ?? undefined,
          from: new Date(Date.now() - 30 * 86400000).toISOString(),
          to: new Date().toISOString()
        },
      });

      // Construct flat metrics array for the frontend component matching Image 2
      const metrics: KpiMetric[] = [
        {
          id: 'total-test-cost',
          label: 'Total Test Cost',
          value: data.totalTestCost.value,
          formatted: `$${(data.totalTestCost.value / 1000000).toFixed(2)}M`,
          delta: data.totalTestCost.deltaPercent,
          deltaFormatted: `${data.totalTestCost.deltaPercent >= 0 ? '+' : ''}${data.totalTestCost.deltaPercent}%`,
          trend: data.totalTestCost.deltaDirection,
          format: 'currency',
          colorAccent: 'accent-purple',
        },
        {
          id: 'cost-per-wafer',
          label: 'Cost per Wafer',
          value: data.costPerWafer.value,
          formatted: `$${data.costPerWafer.value.toFixed(2)}`,
          delta: data.costPerWafer.deltaPercent,
          deltaFormatted: `${data.costPerWafer.deltaPercent >= 0 ? '+' : ''}${data.costPerWafer.deltaPercent}%`,
          trend: data.costPerWafer.deltaDirection,
          format: 'currency',
          colorAccent: 'accent-blue',
        },
        {
          id: 'cost-per-die',
          label: 'Cost per Die',
          value: data.costPerDie.value,
          formatted: `$${data.costPerDie.value.toFixed(4)}`,
          delta: data.costPerDie.deltaPercent,
          deltaFormatted: `${data.costPerDie.deltaPercent >= 0 ? '+' : ''}${data.costPerDie.deltaPercent}%`,
          trend: data.costPerDie.deltaDirection,
          format: 'currency',
          colorAccent: 'accent-green',
        },
        {
          id: 'test-time-avg',
          label: 'Test Time (Avg)',
          value: data.testTimeAvg.value,
          formatted: `${data.testTimeAvg.value.toFixed(1)} ms`,
          delta: data.testTimeAvg.deltaPercent,
          deltaFormatted: `${data.testTimeAvg.deltaPercent >= 0 ? '+' : ''}${data.testTimeAvg.deltaPercent}%`,
          trend: data.testTimeAvg.deltaDirection,
          format: 'ms',
          colorAccent: 'accent-amber',
        },
        {
          id: 'yield-overall',
          label: 'Yield (Overall)',
          value: data.yieldOverall.value,
          formatted: `${data.yieldOverall.value.toFixed(2)}%`,
          delta: data.yieldOverall.deltaPercent,
          deltaFormatted: `${data.yieldOverall.deltaPercent >= 0 ? '+' : ''}${data.yieldOverall.deltaPercent}%`,
          trend: data.yieldOverall.deltaDirection,
          format: 'percent',
          colorAccent: 'accent-green',
        },
        {
          id: 'roi-improvement',
          label: 'ROI Improvement',
          value: data.roiImprovement.value,
          formatted: `$${(data.roiImprovement.value / 1000).toFixed(0)}K`,
          delta: data.roiImprovement.deltaPercent,
          deltaFormatted: `${data.roiImprovement.deltaPercent >= 0 ? '+' : ''}${data.roiImprovement.deltaPercent}%`,
          trend: data.roiImprovement.deltaDirection,
          format: 'currency',
          colorAccent: 'accent-pink',
        },
      ];

      return {
        fabId: fabId || 'fab-001',
        fabName: 'Oregon D1D Fab',
        periodStart: new Date(Date.now() - 7 * 86400000).toISOString(),
        periodEnd: new Date().toISOString(),
        metrics,
        alertCount: 0,
        lastUpdatedAt: new Date().toISOString(),
      };
    },
    staleTime:      QUERY_STALE_TIMES.summary,
    refetchInterval: QUERY_STALE_TIMES.summary,
  });
}

