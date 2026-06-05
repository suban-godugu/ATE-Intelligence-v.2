import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

// Prompt 1 — Fetch patterns for optimization
export const useOptimizePatterns = (lotId: string) => {
  return useQuery({
    queryKey: ['ai-patterns', lotId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/ai-optimize/patterns?lotId=${lotId}`);
      return data.data; // Assuming sendSuccess structure { success: true, data: ... }
    },
    enabled: !!lotId
  });
};

// Prompt 2 — Flow Optimizer Mutation
export const useOptimizeFlowMutation = () => {
  return useMutation({
    mutationFn: async (payload: { patterns: any[], currentOrder: any[], objective: string }) => {
      const { data } = await apiClient.post('/ai-optimize/flow', payload);
      return data.data;
    }
  });
};

// Prompt 3 — Yield Predictor
export const usePredictYieldMutation = () => {
  return useMutation({
    mutationFn: async (payload: { coverageByClass: any, lotId: string, fabId: string }) => {
      const { data } = await apiClient.post('/ai-optimize/yield', payload);
      return data.data;
    }
  });
};

// Prompt 4 — Schedule Optimizer
export const useOptimizeScheduleMutation = () => {
  return useMutation({
    mutationFn: async (payload: { domains: string[], currentSchedule: any }) => {
      const { data } = await apiClient.post('/ai-optimize/schedule', payload);
      return data.data;
    }
  });
};

// Prompt 5 — Compression Tuner
export const useOptimizeCompressionMutation = () => {
  return useMutation({
    mutationFn: async (payload: { currentRatio: number, targetRatio: number, chains: any[] }) => {
      const { data } = await apiClient.post('/ai-optimize/compression', payload);
      return data.data;
    }
  });
};

// Prompt 7 — Simulate Action (Shadow Mode)
export const useSimulateActionMutation = () => {
  return useMutation({
    mutationFn: async (payload: { actionType: string, payload: any }) => {
      const { data } = await apiClient.post('/ai-optimize/simulate', payload);
      return data.data;
    }
  });
};

// Prompt 8 — Savings Summary
export const useSavingsSummary = (lotId: string) => {
  return useQuery({
    queryKey: ['ai-savings-summary', lotId],
    queryFn: async () => {
      const { data } = await apiClient.get(`/ai-optimize/savings?lotId=${lotId}`);
      return data.data;
    },
    enabled: !!lotId
  });
};

// Prompt 9 — Apply/Rollback Optimization
export const useApplyOptimizationMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { rollbackToken: string, action: 'APPLY' | 'ROLLBACK' }) => {
      const { data } = await apiClient.post('/ai-optimize/apply', payload);
      return data.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh UI after an apply
      queryClient.invalidateQueries({ queryKey: ['ai-savings-summary'] });
    }
  });
};
