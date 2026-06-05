'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { DashboardProvider } from '@/context/DashboardContext';
import { ToastContainer } from '@/components/ui/ToastContainer';
import '@/api/mockAdapter'; // Initialize mock API interceptor for instant loading


function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardProvider>
        {children}
        <ToastContainer />
      </DashboardProvider>
    </QueryClientProvider>
  );
}

export default Providers;
