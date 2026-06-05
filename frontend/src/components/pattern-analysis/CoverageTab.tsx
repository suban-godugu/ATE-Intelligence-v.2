'use client';

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from './SharedComponents';

interface CoverageItemProps {
  label: string;
  value: number;
  target: number;
  pulse?: boolean;
}

function DomainCoverageBar({ label, value, target, pulse }: CoverageItemProps) {
  const isBelowTarget = value < target;
  
  return (
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold">
        <span className="text-slate-300 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold border select-none leading-none',
            isBelowTarget 
              ? 'bg-red-500/10 text-red-400 border-red-500/25 animate-pulse' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
          )}>
            Target: {target.toFixed(1)}%
          </span>
          <span
            className={cn(
              'font-mono font-bold transition-all duration-300',
              pulse
                ? 'text-emerald-400 scale-[1.03] drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] font-extrabold'
                : isBelowTarget ? 'text-red-405' : 'text-emerald-400'
            )}
          >
            {value.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="relative h-2 w-full rounded-full bg-slate-950/60 border border-slate-850/30 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-out',
            pulse ? 'bg-gradient-to-r from-emerald-400 to-teal-400' :
            isBelowTarget
              ? 'bg-gradient-to-r from-red-500 to-rose-500'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function CoverageTab() {
  // Live coverage data states
  const [domainCoverage, setDomainCoverage] = useState({
    processorCore: 96.1,
    ioBoundary: 88.3,
    systemLogic: 91.7,
    sramBlocks: 98.4,
    analog: 74.2,
    rfInterface: 81.6,
  });

  const [pulseDomain, setPulseDomain] = useState<string | null>(null);

  // Interval sweeping loop (Sweeps every 3.5 seconds)
  useEffect(() => {
    const keys = ['processorCore', 'ioBoundary', 'systemLogic', 'sramBlocks', 'analog', 'rfInterface'];
    
    const interval = setInterval(() => {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      
      setDomainCoverage((prev: any) => {
        const currentVal = prev[randomKey];
        // subtle real-time fluctuation (between -0.2% and +0.2%)
        const delta = parseFloat((Math.random() * 0.4 - 0.2).toFixed(1));
        const newVal = parseFloat(Math.min(Math.max(currentVal + delta, 60), 99.9).toFixed(1));
        
        return {
          ...prev,
          [randomKey]: newVal
        };
      });

      // Highlight the updated domain progress row
      setPulseDomain(randomKey);
      setTimeout(() => setPulseDomain(null), 850);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 fade-in-up">
      {/* ── Main Two-Column Grid ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Coverage by IP Domain */}
        <GlassCard
          borderColor="rgba(16, 185, 129, 0.25)" // Subtle Green border to match coverage theme
          glowColor="rgba(16, 185, 129, 0.08)"
          padding="24px"
          className="relative shadow-lg flex flex-col justify-between space-y-6"
        >
          <div>
            {/* Header info */}
            <div className="mb-6 flex flex-row items-center justify-between select-none">
              <div>
                <h3 className="text-[16px] font-bold text-white uppercase tracking-wider">Coverage by IP Domain</h3>
                <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-none">Physical and logical chip partitions</p>
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-950/50 px-2.5 py-1 rounded border border-slate-850 font-mono">
                TARGET: 90.0%
              </span>
            </div>

            {/* List of custom progress bars connected to live states */}
            <div className="space-y-5">
              <DomainCoverageBar
                label="Processor Core"
                value={domainCoverage.processorCore}
                target={90.0}
                pulse={pulseDomain === 'processorCore'}
              />
              <DomainCoverageBar
                label="High-Speed IO Boundary"
                value={domainCoverage.ioBoundary}
                target={90.0}
                pulse={pulseDomain === 'ioBoundary'}
              />
              <DomainCoverageBar
                label="System Logic"
                value={domainCoverage.systemLogic}
                target={90.0}
                pulse={pulseDomain === 'systemLogic'}
              />
              <DomainCoverageBar
                label="Embedded SRAM Blocks"
                value={domainCoverage.sramBlocks}
                target={90.0}
                pulse={pulseDomain === 'sramBlocks'}
              />
              <DomainCoverageBar
                label="Mixed-Signal Analog"
                value={domainCoverage.analog}
                target={90.0}
                pulse={pulseDomain === 'analog'}
              />
              <DomainCoverageBar
                label="RF Interface Module"
                value={domainCoverage.rfInterface}
                target={90.0}
                pulse={pulseDomain === 'rfInterface'}
              />
            </div>
          </div>

          {/* WARNING Box at the bottom */}
          <div className="border border-red-500/20 bg-red-500/5 p-4 rounded-xl flex gap-3 items-start relative overflow-hidden select-none">
            <div className="pointer-events-none absolute inset-0 opacity-[0.02] bg-red-500" />
            <AlertCircle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">Warning: Coverage Drops</h4>
              <p className="text-[11px] text-slate-405 leading-normal font-medium">
                Both the Mixed-Signal Analog and RF Interface domains are currently failing to meet the strict 90% customer sign-off criteria.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Right Column: Recommended Coverage Upgrades */}
        <GlassCard
          borderColor="rgba(16, 185, 129, 0.25)" // Subtle Green border to match coverage theme
          glowColor="rgba(16, 185, 129, 0.08)"
          padding="24px"
          className="relative shadow-lg flex flex-col justify-between space-y-6"
        >
          <div>
            {/* Header info */}
            <div className="mb-6 flex flex-row items-center justify-between select-none">
              <div>
                <h3 className="text-[16px] font-bold text-white uppercase tracking-wider">Recommended Upgrades</h3>
                <p className="text-[12px] text-slate-500 mt-1.5 font-medium leading-none">ATPG incremental vector insertion paths</p>
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-950/50 px-2.5 py-1 rounded border border-slate-850 font-mono select-none">
                3 ACTIONS AVAILABLE
              </span>
            </div>

            {/* Structured action table with pulsing states linked to live values */}
            <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/20 select-none">
              <table className="w-full text-xs text-left text-slate-350 border-collapse">
                <thead>
                  <tr 
                    className="bg-slate-950/40 text-slate-500 font-semibold uppercase tracking-wider"
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                  >
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider">Domain</th>
                    <th className="px-4 py-3 text-[11px] font-bold tracking-wider">Upgrade Path</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold tracking-wider">Progress / Target</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold tracking-wider text-red-400">Shortfall Gap</th>
                    <th className="px-4 py-3 text-right text-[11px] font-bold tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      id: 'analog',
                      domain: 'Mixed-Signal Analog',
                      priority: 'HIGH',
                      title: 'Bridge Faults Defect Leakage',
                      description: 'ATPG capture & clock balancing',
                      current: domainCoverage.analog,
                      target: 85.0,
                      gap: domainCoverage.analog - 85.0,
                    },
                    {
                      id: 'ioBoundary',
                      domain: 'High-Speed IO Boundary',
                      priority: 'MEDIUM',
                      title: 'Transition Delay Defect',
                      description: 'Add scan vectors & timing skew',
                      current: domainCoverage.ioBoundary,
                      target: 90.0,
                      gap: domainCoverage.ioBoundary - 90.0,
                    },
                    {
                      id: 'rfInterface',
                      domain: 'RF Interface Module',
                      priority: 'MEDIUM',
                      title: 'IDDQ Defect Leakage Path',
                      description: 'Quiet current thresholds',
                      current: domainCoverage.rfInterface,
                      target: 88.0,
                      gap: domainCoverage.rfInterface - 88.0,
                    },
                  ].map((row, index) => {
                    const isPulsing = pulseDomain === row.id;
                    const absoluteGap = Math.abs(row.gap);
                    return (
                      <tr
                        key={row.id}
                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                        className={cn(
                          'cursor-pointer transition-all duration-150 text-[13px] text-slate-200',
                          index % 2 === 0 ? 'bg-slate-950/5' : 'bg-transparent',
                          'hover:bg-emerald-500/[0.06] hover:border-l-[3px] hover:border-l-emerald-500/80',
                          isPulsing && 'bg-emerald-500/[0.08] shadow-[inset_0_0_8px_rgba(16,185,129,0.1)] font-semibold'
                        )}
                      >
                        {/* Domain Column with priority badge */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-blue-400 tracking-tight leading-none">{row.domain}</span>
                            <div className="flex">
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-[9px] font-extrabold tracking-widest border uppercase leading-none select-none font-mono',
                                  row.priority === 'HIGH'
                                    ? 'border-red-500/30 text-red-405 bg-red-500/5'
                                    : 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                                )}
                              >
                                {row.priority}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Upgrade Path details */}
                        <td className="px-4 py-3">
                          <p className="font-bold text-white tracking-tight text-[12px]">{row.title}</p>
                          <p className="text-[10px] text-slate-500 leading-normal mt-1">{row.description}</p>
                        </td>

                        {/* Progress / Target */}
                        <td className="px-4 py-3 text-right">
                          <span className={cn(
                            'font-mono font-bold text-[13px] transition-all duration-300 block',
                            isPulsing ? 'text-emerald-400 scale-[1.03]' : 'text-slate-200'
                          )}>
                            {row.current.toFixed(1)}%
                          </span>
                          <span className="text-[10px] font-mono text-slate-500 block mt-0.5 select-none">
                            Target: {row.target.toFixed(1)}%
                          </span>
                        </td>

                        {/* Gap */}
                        <td className={cn(
                          'px-4 py-3 text-right font-mono font-bold text-[13px]',
                          isPulsing ? 'text-emerald-400 font-extrabold text-[14px]' : 'text-red-400'
                        )}>
                          -{absoluteGap.toFixed(1)}%
                        </td>

                        {/* Configure Action Button */}
                        <td className="px-4 py-3 text-right">
                          <button className="inline-flex items-center gap-1 bg-transparent border-0 outline-none text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition hover:underline cursor-pointer">
                            <span>Configure</span>
                            <ArrowRight className="h-3 w-3 shrink-0" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </GlassCard>

      </div>

      {/* ── Bottom full-width Success Sign-Off Banner ── */}
      <div className="card border border-emerald-500/20 bg-emerald-500/5 p-4.5 rounded-2xl shadow-lg relative overflow-hidden flex items-center justify-between gap-4">
        <div className="pointer-events-none absolute inset-0 opacity-[0.02] bg-emerald-500" />
        
        {/* Left check description */}
        <div className="flex items-center gap-3.5 select-none">
          <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Coverage Reached Sign-Off threshold (+0.5% in Lot 002)</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 font-medium leading-normal">
              The stuck-at, transition, and logic domains are fully qualified and checked off for deep high-volume manufacturing.
            </p>
          </div>
        </div>

        {/* Right check bubble indicator */}
        <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center text-black shrink-0 shadow-lg shadow-emerald-500/10 select-none">
          <Check className="h-4.5 w-4.5 stroke-[3px]" />
        </div>
      </div>
    </div>
  );
}
