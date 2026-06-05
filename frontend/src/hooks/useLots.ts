'use client';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { mockLots, mockLotContext } from '@/lib/mockDashboardData';
import type { Lot, LotContext, LotStatus } from '@/types/dashboard.types';
import { QUERY_STALE_TIMES } from '@/lib/constants';

export function useLots(fabId?: string | null, status?: LotStatus) {
  return useQuery<Lot[]>({
    queryKey: ['dashboard', 'lots', fabId, status],
    queryFn:  async () => {
      let dbLotsMapped: Lot[] = [];
      try {
        const { data } = await apiClient.get<{ lots: any[] }>('/dashboard/lots', {
          params: { fabId: fabId ?? undefined, status },
        });
        
        dbLotsMapped = (data.lots || []).map((l: any) => ({
          id: l.lotId,
          lotNumber: l.lotId,
          product: 'CHIP-5NM-AI',
          fabId: l.fabId,
          status: l.status === 'COMPLETED' ? 'COMPLETE' : 'IN_PROCESS',
          waferCount: l.waferCount,
          startedAt: new Date().toISOString(),
          completedAt: l.completedAt || undefined,
          yieldPct: l.yieldPct || undefined,
        }));
      } catch (err) {
        console.warn('Failed to fetch real lots, falling back to mock only', err);
      }

      // Merge mockLots with real DB lots, ensuring mockLots are always visible
      const merged = [...dbLotsMapped];
      mockLots.forEach(m => {
        if (!merged.some(l => l.id === m.id)) {
          merged.push(m);
        }
      });

      return status
        ? merged.filter(l => l.status === status)
        : merged;
    },
    staleTime: QUERY_STALE_TIMES.lots,
  });
}

export function useLotContext(lotId?: string | null) {
  return useQuery<LotContext>({
    queryKey: ['dashboard', 'lot-context', lotId],
    enabled:  !!lotId,
    queryFn:  async () => {
      // If lotId is mock (starts with 'lot-') or empty, use the stunning mock context
      if (!lotId || lotId.startsWith('lot-')) {
        const found = mockLots.find(l => l.id === lotId) || mockLots[0];
        return {
          lot: found,
          totalDies: 7245,
          failDies: 456,
          avgTestTimeMs: 18340,
          dominantFaultClass: 'STUCK_AT',
        };
      }

      const { data } = await apiClient.get<any>(`/dashboard/lots/${lotId}/context`);
      
      return {
        lot: {
          id: data.lotId,
          lotNumber: data.lotId,
          product: 'CHIP-5NM-AI',
          fabId: data.fabId,
          status: data.completedAt ? 'COMPLETE' : 'IN_PROCESS',
          waferCount: data.waferCount,
          startedAt: data.startedAt,
          completedAt: data.completedAt || undefined,
        },
        totalDies: data.totalDies,
        failDies: Math.round(data.totalDies * 0.08), // mock fail dies or pull actual from db
        avgTestTimeMs: 18000,
        dominantFaultClass: 'STUCK_AT',
      };
    },
    staleTime: QUERY_STALE_TIMES.lots,
  });
}

