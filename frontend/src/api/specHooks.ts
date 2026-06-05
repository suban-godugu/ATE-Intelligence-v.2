import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';

// ─── 5.1 Pattern Analysis — Hooks ───────────────────────────────────────────

export const useSpecPatterns = (filters?: any) => {
  return useQuery({
    queryKey: ['spec-patterns', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/patterns', { params: filters });
      return data;
    }
  });
};

export const useSpecPatternsKpis = (filters?: any) => {
  return useQuery({
    queryKey: ['spec-patterns-kpis', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/patterns/kpis', { params: filters });
      return data;
    }
  });
};

export const useSpecPatternAnalysis = (id: string | null) => {
  return useQuery({
    queryKey: ['spec-pattern-analysis', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/patterns/${id}/analysis`);
      return data;
    },
    enabled: !!id
  });
};

export const useSpecCoverage = (filters?: any) => {
  return useQuery({
    queryKey: ['spec-coverage', filters],
    queryFn: async () => {
      const { data } = await apiClient.get('/coverage', { params: filters });
      return data;
    }
  });
};

export const useSpecMbist = () => {
  return useQuery({
    queryKey: ['spec-mbist'],
    queryFn: async () => {
      const { data } = await apiClient.get('/mbist');
      return data;
    }
  });
};

export const useSpecLbist = () => {
  return useQuery({
    queryKey: ['spec-lbist'],
    queryFn: async () => {
      const { data } = await apiClient.get('/lbist');
      return data;
    }
  });
};

export const useSpecScanChains = () => {
  return useQuery({
    queryKey: ['spec-scan-chains'],
    queryFn: async () => {
      const { data } = await apiClient.get('/scan-chains');
      return data;
    }
  });
};

export const useSpecRedundancy = () => {
  return useQuery({
    queryKey: ['spec-redundancy'],
    queryFn: async () => {
      const { data } = await apiClient.get('/redundancy');
      return data;
    }
  });
};

export const useRemoveRedundancyMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { pattern_ids: string[] }) => {
      const { data } = await apiClient.post('/redundancy/remove', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spec-patterns'] });
      qc.invalidateQueries({ queryKey: ['spec-patterns-kpis'] });
      qc.invalidateQueries({ queryKey: ['spec-redundancy'] });
      qc.invalidateQueries({ queryKey: ['spec-savings-dashboard'] });
    }
  });
};

export const useUploadStilMutation = () => {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await apiClient.post('/patterns/upload-stil', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    }
  });
};

export const useSpecAiSavingsEstimate = () => {
  return useQuery({
    queryKey: ['spec-ai-savings-estimate'],
    queryFn: async () => {
      const { data } = await apiClient.get('/ai/savings-estimate');
      return data;
    }
  });
};

// ─── 5.2 Test Optimization — Hooks ──────────────────────────────────────────

export const useSpecOptimizationKpis = () => {
  return useQuery({
    queryKey: ['spec-optimization-kpis'],
    queryFn: async () => {
      const { data } = await apiClient.get('/optimization/kpis');
      return data;
    }
  });
};

export const useSpecPipelineStatus = () => {
  return useQuery({
    queryKey: ['spec-pipeline-status'],
    queryFn: async () => {
      const { data } = await apiClient.get('/optimization/pipeline-status');
      return data;
    }
  });
};

export const useSpecRecentActions = () => {
  return useQuery({
    queryKey: ['spec-recent-actions'],
    queryFn: async () => {
      const { data } = await apiClient.get('/optimization/recent-actions');
      return data;
    }
  });
};

export const useSpecAiRecommendations = () => {
  return useQuery({
    queryKey: ['spec-ai-recommendations'],
    queryFn: async () => {
      const { data } = await apiClient.get('/optimization/ai-recommendations');
      return data;
    }
  });
};

export const useSpecFlowOptimizer = () => {
  return useQuery({
    queryKey: ['spec-flow-optimizer'],
    queryFn: async () => {
      const { data } = await apiClient.get('/flow-optimizer');
      return data;
    }
  });
};

export const useApplyFlowOptimizerMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { objective: string, order: string[] }) => {
      const { data } = await apiClient.post('/flow-optimizer/apply', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spec-flow-optimizer'] });
      qc.invalidateQueries({ queryKey: ['spec-optimization-kpis'] });
      qc.invalidateQueries({ queryKey: ['spec-savings-dashboard'] });
    }
  });
};

export const useSimulateFlowOptimizerMutation = () => {
  return useMutation({
    mutationFn: async (payload: { objective: string, order: string[] }) => {
      const { data } = await apiClient.post('/flow-optimizer/simulate', payload);
      return data;
    }
  });
};

export const useSpecPatternPruning = () => {
  return useQuery({
    queryKey: ['spec-pattern-pruning'],
    queryFn: async () => {
      const { data } = await apiClient.get('/pattern-pruning');
      return data;
    }
  });
};

export const useSimulatePatternPruningMutation = () => {
  return useMutation({
    mutationFn: async (payload: { pattern_ids: string[] }) => {
      const { data } = await apiClient.post('/pattern-pruning/simulate', payload);
      return data;
    }
  });
};

export const useRemovePatternPruningMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { pattern_ids: string[] }) => {
      const { data } = await apiClient.post('/pattern-pruning/remove', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spec-patterns'] });
      qc.invalidateQueries({ queryKey: ['spec-patterns-kpis'] });
      qc.invalidateQueries({ queryKey: ['spec-pattern-pruning'] });
      qc.invalidateQueries({ queryKey: ['spec-savings-dashboard'] });
    }
  });
};

export const useSpecCompressionTuner = () => {
  return useQuery({
    queryKey: ['spec-compression-tuner'],
    queryFn: async () => {
      const { data } = await apiClient.get('/compression-tuner');
      return data;
    }
  });
};

export const useCompressionPreview = (ratio: number) => {
  return useQuery({
    queryKey: ['spec-compression-preview', ratio],
    queryFn: async () => {
      const { data } = await apiClient.get(`/compression-tuner/preview/${ratio}`);
      return data;
    },
    enabled: !!ratio
  });
};

export const useApplyCompressionMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ratio: number }) => {
      const { data } = await apiClient.post('/compression-tuner/apply', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spec-compression-tuner'] });
      qc.invalidateQueries({ queryKey: ['spec-scan-chains'] });
      qc.invalidateQueries({ queryKey: ['spec-optimization-kpis'] });
      qc.invalidateQueries({ queryKey: ['spec-savings-dashboard'] });
    }
  });
};

export const useSimulateCompressionMutation = () => {
  return useMutation({
    mutationFn: async (payload: { ratio: number }) => {
      const { data } = await apiClient.post('/compression-tuner/simulate', payload);
      return data;
    }
  });
};

export const useSpecYieldPredictor = () => {
  return useQuery({
    queryKey: ['spec-yield-predictor'],
    queryFn: async () => {
      const { data } = await apiClient.get('/yield-predictor');
      return data;
    }
  });
};

export const usePredictYieldMutation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { stuck_at_threshold_pct: number, transition_threshold_pct: number, iddq_threshold_pct: number }) => {
      const { data } = await apiClient.post('/yield-predictor/predict', payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spec-yield-predictor'] });
      qc.invalidateQueries({ queryKey: ['spec-savings-dashboard'] });
    }
  });
};

export const useSpecSavingsDashboard = () => {
  return useQuery({
    queryKey: ['spec-savings-dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get('/savings-dashboard');
      return data;
    }
  });
};

export const useExportSavingsDashboardMutation = () => {
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/savings-dashboard/export', {}, { responseType: 'blob' });
      return data;
    }
  });
};

// ─── 5.3 Shared / Auth Hooks ────────────────────────────────────────────────

export const useSpecFabs = () => {
  return useQuery({
    queryKey: ['spec-fabs'],
    queryFn: async () => {
      const { data } = await apiClient.get('/fabs');
      return data;
    }
  });
};

export const useSpecLots = () => {
  return useQuery({
    queryKey: ['spec-lots'],
    queryFn: async () => {
      const { data } = await apiClient.get('/lots');
      return data;
    }
  });
};
