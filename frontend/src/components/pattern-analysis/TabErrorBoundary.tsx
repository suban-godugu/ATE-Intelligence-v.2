'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { GlassCard } from './SharedComponents';

interface Props {
  children: ReactNode;
  tabName: string;
}

interface State {
  hasError: boolean;
}

export class TabErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`ErrorBoundary caught an error in ${this.props.tabName} tab:`, error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <GlassCard
          borderColor="rgba(239, 68, 68, 0.3)"
          glowColor="rgba(239, 68, 68, 0.08)"
          padding="32px"
          className="text-center space-y-4 my-6 flex flex-col items-center justify-center min-h-[300px]"
        >
          <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center animate-bounce">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              {this.props.tabName} Module Offline
            </h3>
            <p className="text-xs text-slate-400">
              An unexpected failure occurred while streaming telemetry data from the ATE sensor array.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="flex h-9 px-4 items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-white border border-slate-700/80 transition-all active:scale-[0.98] cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>RECONNECT SENSORS</span>
          </button>
        </GlassCard>
      );
    }

    return this.props.children;
  }
}
