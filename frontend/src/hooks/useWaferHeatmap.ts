'use client';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { mockHeatmap } from '@/lib/mockDashboardData';
import type { HeatmapResponse, DieCell, Cluster } from '@/types/dashboard.types';
import { QUERY_STALE_TIMES } from '@/lib/constants';

export function useWaferHeatmap(lotId?: string | null, waferId?: string, select?: (data: HeatmapResponse) => any) {
  return useQuery<HeatmapResponse>({
    queryKey: ['dashboard', 'heatmap', lotId, waferId],
    enabled:  !!lotId,
    queryFn:  async () => {
      // If lotId is mock (defaults to 'lot-001') or empty, use the stunning mock heatmap
      if (!lotId || lotId.startsWith('lot-')) {
        return mockHeatmap;
      }

      const response = await apiClient.get<any>(`/dashboard/wafer-heatmap`, {
        params: { lotId: lotId!, waferId: waferId || '01' },
      });
      const data = response.data;

      if (!data || !data.dieGrid) {
        throw new Error('Invalid heatmap data from server');
      }

      // Convert dieGrid to front-end DieCell format
      let maxCols = 0;
      let maxRows = 0;

      const dies: DieCell[] = data.dieGrid.map((d: any) => {
        if (d.x > maxCols) maxCols = d.x;
        if (d.y > maxRows) maxRows = d.y;

        // Map cost to range [100, 500] matching frontend color mode interpolation
        // const t = (die.cost - 100) / 400; returns exactly d.normalizedCost
        const cost = 100 + (d.normalizedCost ?? 0) * 400;

        return {
          x: d.x,
          y: d.y,
          dieId: `die-${d.x}-${d.y}`,
          bin: d.bin,
          cost: cost,
          testTime: 12000 + Math.random() * 8000, // ms representation
          failType: d.failType || undefined,
          yieldScore: d.bin === 1 ? 95 : 35,
          inWafer: true,
          clusterIds: [],
        };
      });

      // Construct clusters with coordinate centers and radii dynamically
      const clusters: Cluster[] = [];

      // Local cluster
      const localDies = dies.filter(d => d.failType === 'Local');
      if (localDies.length > 0) {
        const cx = localDies.reduce((acc, d) => acc + d.x, 0) / localDies.length;
        const cy = localDies.reduce((acc, d) => acc + d.y, 0) / localDies.length;
        const radius = Math.max(...localDies.map(d => Math.sqrt((d.x - cx) ** 2 + (d.y - cy) ** 2))) + 0.5;
        clusters.push({
          id: 'cl-local',
          cx,
          cy,
          radius,
          confidence: 0.94,
          cause: 'Wafer Defect Local Cluster',
          affectedCount: localDies.length,
        });
      }

      // Scratch cluster
      const scratchDies = dies.filter(d => d.failType === 'Scratch');
      if (scratchDies.length > 0) {
        const cx = scratchDies.reduce((acc, d) => acc + d.x, 0) / scratchDies.length;
        const cy = scratchDies.reduce((acc, d) => acc + d.y, 0) / scratchDies.length;
        const radius = Math.max(...scratchDies.map(d => Math.sqrt((d.x - cx) ** 2 + (d.y - cy) ** 2))) + 0.5;
        clusters.push({
          id: 'cl-scratch',
          cx,
          cy,
          radius: Math.min(radius, 6), // Clamp radius to prevent drawing massive circles for lines
          confidence: 0.88,
          cause: 'Wafer Defect Line Scratch',
          affectedCount: scratchDies.length,
        });
      }

      return {
        lotId: data.lotId,
        waferId: data.waferId,
        waferIndex: 1,
        rows: maxRows + 2,
        cols: maxCols + 2,
        dies,
        clusters,
        summary: {
          passCount: data.passingDies,
          failCount: data.failedDies,
          yieldPct: data.spatialYield,
          avgCost: (data.dieGrid.reduce((acc: number, d: any) => acc + d.costPerDie, 0) / (data.dieGrid.length || 1)),
        },
      };
    },
    staleTime: QUERY_STALE_TIMES.heatmap,
    refetchOnWindowFocus: false,
    select,
  });
}

