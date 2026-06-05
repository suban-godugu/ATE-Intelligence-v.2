'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Minus,
  Check,
  Search,
  X,
  Cpu,
  Link2Off
} from 'lucide-react';
import { cn } from '@/lib/utils';

// === DESIGN TOKENS ===

export const RISK_COLORS = {
  Critical: { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
  High:     { bg: 'rgba(249, 115, 22, 0.15)', text: '#F97316', border: 'rgba(249, 115, 22, 0.3)' },
  Medium:   { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  Low:      { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
};

export const FAULT_COLORS = {
  'Stuck-at-0':       { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA' },
  'Stuck-at-1':       { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA' },
  'Transition Fault': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' },
  'Bridging Fault':   { bg: 'rgba(245, 158, 11, 0.15)', text: '#FCD34D' },
  'Open Fault':       { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF' },
};

export const SEVERITY_COLORS = {
  Critical: { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' },
  High:     { bg: 'rgba(249, 115, 22, 0.2)', text: '#F97316' },
  Medium:   { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' },
  Low:      { bg: 'rgba(16, 185, 129, 0.2)', text: '#10B981' },
};

export type RiskType = keyof typeof RISK_COLORS;
export type FaultType = keyof typeof FAULT_COLORS;
export type SeverityType = keyof typeof SEVERITY_COLORS;

// === BADGES ===

interface RiskBadgeProps {
  risk: RiskType;
}

export function RiskBadge({ risk }: RiskBadgeProps) {
  const colors = RISK_COLORS[risk] || RISK_COLORS.Low;

  const getIcon = () => {
    switch (risk) {
      case 'Critical': return <AlertCircle className="h-3 w-3 shrink-0" />;
      case 'High':     return <AlertTriangle className="h-3 w-3 shrink-0" />;
      case 'Medium':   return <Minus className="h-3 w-3 shrink-0" />;
      case 'Low':
      default:         return <Check className="h-3 w-3 shrink-0" />;
    }
  };

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider border uppercase select-none"
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
        borderColor: colors.border
      }}
    >
      {getIcon()}
      <span>{risk}</span>
    </span>
  );
}

interface FaultTypeBadgeProps {
  faultType: string;
}

export function FaultTypeBadge({ faultType }: FaultTypeBadgeProps) {
  const colors = FAULT_COLORS[faultType as FaultType] || { bg: 'rgba(107, 114, 128, 0.15)', text: '#9CA3AF' };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider border border-transparent select-none uppercase font-mono"
      style={{
        backgroundColor: colors.bg,
        color: colors.text
      }}
    >
      {faultType}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: SeverityType;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Low;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider select-none uppercase"
      style={{
        backgroundColor: colors.bg,
        color: colors.text
      }}
    >
      {severity}
    </span>
  );
}

// === GLASS CARD WRAPPER ===

interface GlassCardProps {
  children: React.ReactNode;
  borderColor?: string;
  glowColor?: string;
  padding?: string;
  className?: string;
}

export function GlassCard({
  children,
  borderColor = 'rgba(59, 130, 246, 0.4)',
  glowColor = 'rgba(59, 130, 246, 0.15)',
  padding = '20px 24px',
  className
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl backdrop-blur-xl',
        'transition-all duration-300',
        className
      )}
      style={{
        background: 'rgba(15, 20, 40, 0.85)',
        border: `1px solid ${borderColor}`,
        boxShadow: `0 0 24px ${glowColor}`,
        padding
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-5 bg-gradient-to-br from-white to-transparent" />
      {children}
    </div>
  );
}

// === SKELETON LOADERS ===

interface SkeletonRowProps {
  columns: number;
}

export function SkeletonRow({ columns }: SkeletonRowProps) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-4.5">
          <div
            className="h-3 rounded-full"
            style={{
              background: 'linear-gradient(90deg, rgba(30,40,70,0.6) 25%, rgba(50,60,90,0.6) 50%, rgba(30,40,70,0.6) 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite linear',
              width: i === 0 ? '55%' : i === columns - 1 ? '35%' : '80%'
            }}
          />
        </td>
      ))}
    </tr>
  );
}

// === DEBOUNCED SEARCH INPUT ===

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export function SearchInput({
  placeholder = 'Search...',
  value,
  onChange,
  className
}: SearchInputProps) {
  const [innerVal, setInnerVal] = useState(value);

  // Sync internal value with external changes (e.g. resets)
  useEffect(() => {
    setInnerVal(value);
  }, [value]);

  // Debounce external onChange by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(innerVal);
    }, 300);

    return () => clearTimeout(timer);
  }, [innerVal, onChange]);

  return (
    <div className={cn('relative w-full shrink-0', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
      <input
        type="text"
        placeholder={placeholder}
        value={innerVal}
        onChange={(e) => setInnerVal(e.target.value)}
        className={cn(
          'w-full h-8 pl-9 pr-8 text-xs bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 transition-all duration-200'
        )}
      />
      {innerVal && (
        <button
          onClick={() => setInnerVal('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 bg-transparent border-none outline-none text-slate-500 hover:text-slate-350 cursor-pointer"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// === EMPTY DATA STATE ===

interface EmptyStateProps {
  icon?: 'link-off' | 'cpu';
  message: string;
}

export function EmptyState({ icon = 'link-off', message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center select-none">
      <div className="h-10 w-10 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-500 mb-3.5 shadow-md">
        {icon === 'cpu' ? (
          <Cpu className="h-5 w-5" />
        ) : (
          <Link2Off className="h-5 w-5" />
        )}
      </div>
      <p className="text-xs font-semibold text-slate-400 tracking-wide">{message}</p>
    </div>
  );
}

// === DRILLDOWN BREADCRUMBS ===

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap text-xs select-none">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-slate-600 font-bold font-sans scale-[0.8] select-none">&gt;</span>}
            {isLast ? (
              <span className="font-extrabold text-white tracking-wide">{item.label}</span>
            ) : (
              <button
                onClick={item.onClick}
                className="font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer bg-transparent border-none outline-none p-0 tracking-wide transition-all"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
