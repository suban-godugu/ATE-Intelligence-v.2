'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/api/client';
import type { OptimizationJob, OptimizeRequest, OptimizationStatus } from '@/types/dashboard.types';

interface UseOptimizerReturn {
  job:      OptimizationJob | null;
  status:   OptimizationStatus;
  progress: number;
  submit:   (req: OptimizeRequest) => Promise<void>;
  reset:    () => void;
}

export function useOptimizer(): UseOptimizerReturn {
  const [jobId, setJobId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (req: OptimizeRequest) => {
      const { data } = await apiClient.post<any>('/optimizer/jobs', req);
      return data.data; // Expected response: { jobId: string, status: string, ... }
    },
    onSuccess: (data) => {
      setJobId(data.jobId);
    },
  });

  const query = useQuery<OptimizationJob>({
    queryKey: ['optimizer', 'job', jobId],
    queryFn: async () => {
      const { data } = await apiClient.get<any>(`/optimizer/jobs/${jobId}`);
      return data.data;
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      const status = data.status as string;
      // Stop polling when job reaches completion or failure state
      return (status === 'COMPLETE' || status === 'FAILED') ? false : 2000;
    },
  });

  const reset = useCallback(() => {
    setJobId(null);
    mutation.reset();
  }, [mutation]);

  const submit = useCallback(async (req: OptimizeRequest) => {
    reset();
    try {
      await mutation.mutateAsync(req);
    } catch (err) {
      console.error('Co-optimizer submission failed:', err);
    }
  }, [mutation, reset]);

  // Compute layout status and progress based on active TanStack stages
  let status: OptimizationStatus = 'idle';
  if (mutation.isPending) {
    status = 'pending';
  } else if (jobId) {
    if (query.isError) {
      status = 'failed';
    } else {
      const rawStatus = query.data?.status as string | undefined;
      if (rawStatus === 'QUEUED') {
        status = 'pending';
      } else if (rawStatus === 'RUNNING') {
        status = 'processing';
      } else if (rawStatus === 'COMPLETE') {
        status = 'complete';
      } else if (rawStatus === 'FAILED') {
        status = 'failed';
      } else if (query.isPending) {
        status = 'pending';
      }
    }
  }

  const job = query.data || null;
  const progress = job?.progress ?? 0;

  return { job, status, progress, submit, reset };
}
