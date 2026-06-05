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

      // Construct flat metrics array for the frontend component
      const metrics: KpiMetric[] = [
        {
          id: 'cost-per-wafer',
          label: 'Average Wafer Cost',
          value: data.costPerWafer.value,
          formatted: `$${data.costPerWafer.value.toFixed(2)}`,
          delta: data.costPerWafer.deltaPercent,
          deltaFormatted: `${data.costPerWafer.deltaPercent >= 0 ? '+' : ''}${data.costPerWafer.deltaPercent}%`,
          trend: data.costPerWafer.deltaDirection,
          format: 'currency',
          colorAccent: 'accent-cyan',
        },
        {
          id: 'yield',
          label: 'Silicon Yield (Wafer Level)',
          value: data.yieldOverall.value,
          formatted: `${data.yieldOverall.value.toFixed(1)}%`,
          delta: data.yieldOverall.deltaPercent,
          deltaFormatted: `${data.yieldOverall.deltaPercent >= 0 ? '+' : ''}${data.yieldOverall.deltaPercent}%`,
          trend: data.yieldOverall.deltaDirection,
          format: 'percent',
          colorAccent: 'accent-green',
        },
        {
          id: 'test-time',
          label: 'ATE Sweep Duration',
          value: data.testTimeAvg.value,
          formatted: `${(data.testTimeAvg.value / 1000).toFixed(2)} s`,
          delta: data.testTimeAvg.deltaPercent,
          deltaFormatted: `${data.testTimeAvg.deltaPercent >= 0 ? '+' : ''}${data.testTimeAvg.deltaPercent}%`,
          trend: data.testTimeAvg.deltaDirection,
          format: 'ms',
          colorAccent: 'accent-blue',
        },
        {
          id: 'roi-potential',
          label: 'Redundant Cost Optimization',
          value: data.roiImprovement.value,
          formatted: `$${data.roiImprovement.value.toFixed(2)}`,
          delta: data.roiImprovement.deltaPercent,
          deltaFormatted: `${data.roiImprovement.deltaPercent >= 0 ? '+' : ''}${data.roiImprovement.deltaPercent}%`,
          trend: data.roiImprovement.deltaDirection,
          format: 'currency',
          colorAccent: 'accent-purple',
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

