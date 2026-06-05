'use client';

import { useState, useEffect } from 'react';
import { Cpu, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './SharedComponents';

interface ProgressBarProps {
  label: string;
  value: string;
  percent: number;
  gradientClass: string;
  valueColorClass?: string;
  pulse?: boolean;
}

function CustomProgressBar({ label, value, percent, gradientClass, valueColorClass = 'text-white', pulse }: ProgressBarProps) {
  return (
    <div className="space-y-2 py-1.5 select-none">
      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className={cn(
          "font-mono transition-all duration-300",
          pulse 
            ? "text-emerald-400 scale-[1.03] drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] font-extrabold"
            : valueColorClass
        )}>
          {value}
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-slate-950/60 border border-slate-850/35 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            pulse ? "bg-gradient-to-r from-emerald-400 to-teal-400" : gradientClass
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function OverviewTabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse select-none">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Card 1: Test Time Breakdown Skeleton */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 space-y-6">
          <div className="h-5 w-48 bg-slate-850 rounded-md" />
          <div className="space-y-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-24 bg-slate-850 rounded" />
                  <div className="h-3.5 w-16 bg-slate-850 rounded" />
                </div>
                <div className="h-2.5 w-full bg-slate-950/60 rounded-full border border-slate-850/35" />
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Coverage by Fault Class Skeleton */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 space-y-6">
          <div className="h-5 w-48 bg-slate-850 rounded-md" />
          <div className="space-y-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-3.5 w-24 bg-slate-850 rounded" />
                  <div className="h-3.5 w-16 bg-slate-850 rounded" />
                </div>
                <div className="h-2.5 w-full bg-slate-950/60 rounded-full border border-slate-850/35" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Banner Skeleton */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="h-5 w-48 bg-slate-850 rounded-md" />
          <div className="h-3 w-72 bg-slate-850 rounded" />
        </div>
        <div className="grid grid-cols-3 gap-6 md:gap-12 w-full md:w-auto">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 bg-slate-850 rounded" />
              <div className="h-6 w-20 bg-slate-800/50 rounded" />
            </div>
          ))}
        </div>
        <div className="h-10 w-full md:w-44 bg-indigo-600/30 rounded-xl" />
      </div>
    </div>
  );
}

export default function OverviewTab() {
  const [loading, setLoading] = useState(true);

  // Telemetry Sweep States
  const [testTime, setTestTime] = useState({
    scanChain: 2040,
    atpgTransition: 1180,
    atpgStuckAt: 920,
    mbist: 440,
    lbist: 320,
  });

  const [faultClass, setFaultClass] = useState({
    stuckAt: 94.2,
    transition: 89.1,
    cellAware: 91.4,
    iddq: 82.7,
    bridge: 77.3,
  });

  const [pulseField, setPulseField] = useState<string | null>(null);

  // Simulate initial loading sweep
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  // Interval telemetry oscillations
  useEffect(() => {
    if (loading) return;

    const keys = ['scanChain', 'atpgTransition', 'atpgStuckAt', 'mbist', 'lbist', 'stuckAt', 'transition', 'cellAware', 'iddq', 'bridge'];
    
    const interval = setInterval(() => {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      
      if (['scanChain', 'atpgTransition', 'atpgStuckAt', 'mbist', 'lbist'].includes(randomKey)) {
        setTestTime((prev: any) => {
          const currentVal = prev[randomKey];
          // Fluctuate test times by ±3ms
          const delta = Math.floor(Math.random() * 6 - 3);
          const newVal = Math.max(currentVal + delta, 100);
          return { ...prev, [randomKey]: newVal };
        });
      } else {
        setFaultClass((prev: any) => {
          const currentVal = prev[randomKey];
          // Fluctuate coverage values by ±0.1%
          const delta = parseFloat((Math.random() * 0.2 - 0.1).toFixed(1));
          const newVal = parseFloat(Math.min(Math.max(currentVal + delta, 50), 99.9).toFixed(1));
          return { ...prev, [randomKey]: newVal };
        });
      }

      // Briefly trigger update sweeps highlight
      setPulseField(randomKey);
      setTimeout(() => setPulseField(null), 850);
    }, 4000);

    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return <OverviewTabSkeleton />;
  }

  return (
    <div className="space-y-6 fade-in-up">
      {/* ── Side-by-Side Horizontal Charts Grid ────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 items-stretch">
        
        {/* Card 1: TEST TIME BREAKDOWN */}
        <GlassCard
          borderColor="rgba(99, 102, 241, 0.25)" // Subtle Indigo border
          glowColor="rgba(99, 102, 241, 0.08)"
          padding="24px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="mb-6 flex items-center justify-between select-none">
              <h3 className="text-[16px] font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>Test Time Breakdown</span>
              </h3>
            </div>

            <div className="space-y-5">
              <CustomProgressBar
                label="Scan Chain"
                value={`${testTime.scanChain}ms`}
                percent={100}
                gradientClass="bg-gradient-to-r from-red-500 to-orange-500"
                pulse={pulseField === 'scanChain'}
              />
              <CustomProgressBar
                label="ATPG Transition"
                value={`${testTime.atpgTransition}ms`}
                percent={(testTime.atpgTransition / testTime.scanChain) * 100}
                gradientClass="bg-gradient-to-r from-orange-500 to-yellow-500"
                pulse={pulseField === 'atpgTransition'}
              />
              <CustomProgressBar
                label="ATPG Stuck-At"
                value={`${testTime.atpgStuckAt}ms`}
                percent={(testTime.atpgStuckAt / testTime.scanChain) * 100}
                gradientClass="bg-gradient-to-r from-indigo-500 to-blue-500"
                pulse={pulseField === 'atpgStuckAt'}
              />
              <CustomProgressBar
                label="MBIST"
                value={`${testTime.mbist}ms`}
                percent={(testTime.mbist / testTime.scanChain) * 100}
                gradientClass="bg-gradient-to-r from-emerald-500 to-teal-400"
                pulse={pulseField === 'mbist'}
              />
              <CustomProgressBar
                label="LBIST"
                value={`${testTime.lbist}ms`}
                percent={(testTime.lbist / testTime.scanChain) * 100}
                gradientClass="bg-gradient-to-r from-blue-500 to-cyan-400"
                pulse={pulseField === 'lbist'}
              />
            </div>
          </div>
        </GlassCard>

        {/* Card 2: COVERAGE BY FAULT CLASS */}
        <GlassCard
          borderColor="rgba(16, 185, 129, 0.25)" // Subtle Green border
          glowColor="rgba(16, 185, 129, 0.08)"
          padding="24px"
          className="relative shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="mb-6 flex items-center justify-between select-none">
              <h3 className="text-[16px] font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Coverage by Fault Class</span>
              </h3>
            </div>

            <div className="space-y-5">
              <CustomProgressBar
                label="Stuck-at"
                value={`${faultClass.stuckAt}%`}
                percent={faultClass.stuckAt}
                gradientClass="bg-gradient-to-r from-emerald-500 to-teal-500"
                pulse={pulseField === 'stuckAt'}
              />
              <CustomProgressBar
                label="Transition"
                value={`${faultClass.transition}%`}
                percent={faultClass.transition}
                gradientClass="bg-gradient-to-r from-blue-500 to-indigo-500"
                pulse={pulseField === 'transition'}
              />
              <CustomProgressBar
                label="Cell-aware"
                value={`${faultClass.cellAware}%`}
                percent={faultClass.cellAware}
                gradientClass="bg-gradient-to-r from-purple-500 to-pink-500"
                pulse={pulseField === 'cellAware'}
              />
              <CustomProgressBar
                label="IDDQ"
                value={`${faultClass.iddq}%`}
                percent={faultClass.iddq}
                gradientClass="bg-gradient-to-r from-amber-500 to-orange-500"
                pulse={pulseField === 'iddq'}
              />
              <CustomProgressBar
                label="Bridge Faults (Below Target)"
                value={`${faultClass.bridge}%`}
                percent={faultClass.bridge}
                gradientClass="bg-gradient-to-r from-red-600 to-rose-500"
                valueColorClass="text-red-405"
                pulse={pulseField === 'bridge'}
              />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── AI Savings Estimate Banner ─────────────────── */}
      <GlassCard
        borderColor="rgba(139, 92, 246, 0.3)" // Purple glass border for AI feature
        glowColor="rgba(139, 92, 246, 0.1)"
        padding="24px"
        className="relative shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:scale-[1.002]"
      >
        {/* Header and badge */}
        <div className="flex flex-col gap-2 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <h4 className="text-base font-bold text-white tracking-tight">AI Compaction Estimate</h4>
            <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-purple-400 font-mono inline-flex items-center gap-1 select-none leading-none">
              <Sparkles className="h-2.5 w-2.5 shrink-0" />
              <span>AI POWERED</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">Projected metrics based on autonomous ATPG test compaction models</p>
        </div>

        {/* Core stats */}
        <div className="grid grid-cols-3 gap-6 md:gap-12 w-full md:w-auto select-none">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">Time Savings</p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-2 font-mono leading-none">48.2%</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">Cost Reduction</p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-2 font-mono leading-none">$0.043<span className="text-xs font-sans text-slate-500">/die</span></p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-none">Projected Yield</p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 mt-2 font-mono leading-none">+1.7%</p>
          </div>
        </div>

        {/* CTA Button */}
        <button className="flex h-10 px-4 items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/15 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shrink-0 w-full md:w-auto justify-center cursor-pointer">
          <span>View in Test Optimization</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>
      </GlassCard>
    </div>
  );
}
