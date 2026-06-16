'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import apiClient from '@/api/client';
import { cn } from '@/lib/utils';
import {
  GlassCard,
  SkeletonRow,
  EmptyState,
  RiskBadge,
  FaultTypeBadge,
  RiskType
} from './SharedComponents';

// === TELEMETRY QUERY HOOK ===

export const useChainsList = (patternId: string | null, filters: any) =>
  useQuery<any[]>({
    queryKey: ['redesign-chains', patternId, filters],
    queryFn: async () => {
      if (!patternId) return [];
      const { data } = await apiClient.get<any[]>(`/patterns/${patternId}/chains`, {
        params: filters,
      });
      return data;
    },
    enabled: !!patternId,
  });

interface ChainAnalysisPanelProps {
  patternId: string;
  onClose: () => void;
  onSelectChain: (chainId: string, chainData: any) => void;
  fabId?: string;
  from?: string;
  to?: string;
  focusedChainId?: string | null;
}

interface ChainData {
  chainId: string;
  flipFlopFailures: number;
  faultType: string;
  chainLength: number;
  ipDomain: string;
  risk: RiskType;
  shiftCycles: number;
  captureWindows: number;
  passRate: number;
  cellsFailed: number;
  cellsPassed: number;
}

export default function ChainAnalysisPanel({
  patternId,
  onClose,
  onSelectChain,
  fabId,
  from,
  to,
  focusedChainId
}: ChainAnalysisPanelProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const filters = { fabId, from, to };
  const { data: chainsData = [], isLoading } = useChainsList(patternId, filters);

  // Smooth scroll into view when panel mounts / updates
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [patternId]);

  // Aggregate severity count badges for the top right
  const criticalCount = chainsData.filter((c) => c.risk === 'Critical').length;
  const highCount     = chainsData.filter((c) => c.risk === 'High').length;
  const mediumCount   = chainsData.filter((c) => c.risk === 'Medium').length;
  const lowCount      = chainsData.filter((c) => c.risk === 'Low').length;

  const columns = React.useMemo<ColumnDef<ChainData>[]>(
    () => [
      {
        accessorKey: 'chainId',
        header: 'Chain ID',
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-blue-400 select-none">
            {row.original.chainId}
          </span>
        ),
      },
      {
        accessorKey: 'flipFlopFailures',
        header: 'Flip-Flop Failures',
        cell: ({ row }) => {
          const val = row.original.flipFlopFailures;
          let badgeBg = 'rgba(16, 185, 129, 0.1)';
          let badgeTextColor = '#34D399'; // Emerald
          let borderColors = 'rgba(16, 185, 129, 0.2)';

          if (val > 10) {
            badgeBg = 'rgba(239, 68, 68, 0.1)';
            badgeTextColor = '#F87171'; // Red
            borderColors = 'rgba(239, 68, 68, 0.2)';
          } else if (val >= 1) {
            badgeBg = 'rgba(245, 158, 11, 0.1)';
            badgeTextColor = '#FBBF24'; // Amber
            borderColors = 'rgba(245, 158, 11, 0.2)';
          }

          return (
            <div className="flex justify-start select-none">
              <span
                className="px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wider font-mono border select-none leading-none"
                style={{ backgroundColor: badgeBg, color: badgeTextColor, borderColor: borderColors }}
              >
                {val} Failures
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'faultType',
        header: 'Fault Class Type',
        cell: ({ row }) => (
          <FaultTypeBadge faultType={row.original.faultType} />
        ),
      },
      {
        accessorKey: 'chainLength',
        header: 'Chain Length',
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-slate-350 select-none">
            {row.original.chainLength.toLocaleString()} FF
          </span>
        ),
      },
      {
        accessorKey: 'ipDomain',
        header: 'IP Domain',
        cell: ({ row }) => (
          <span className="font-bold text-slate-350 select-none text-[12px] tracking-wide">
            {row.original.ipDomain}
          </span>
        ),
      },
      {
        id: 'impactScore',
        header: 'Impact Score',
        accessorFn: (row) => {
          const failures = row.flipFlopFailures;
          const risk = row.risk;
          if (risk === 'Critical') return 85 + failures * 2;
          if (risk === 'High') return 70 + failures * 1.5;
          if (risk === 'Medium') return 45 + failures;
          return 15 + failures * 0.5;
        },
        cell: ({ row }) => {
          const failures = row.original.flipFlopFailures;
          const risk = row.original.risk;
          let score = 15;
          let color = '#10B981';
          if (risk === 'Critical') {
            score = Math.min(99, 85 + failures * 2);
            color = '#EF4444';
          } else if (risk === 'High') {
            score = Math.min(84, 70 + Math.floor(failures * 1.5));
            color = '#F97316';
          } else if (risk === 'Medium') {
            score = Math.min(69, 45 + failures);
            color = '#F59E0B';
          } else {
            score = Math.min(44, 15 + Math.floor(failures * 0.5));
            color = '#10B981';
          }
          return (
            <div className="flex items-center gap-1.5 select-none font-mono">
              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="font-extrabold text-[13px] tracking-wide" style={{ color }}>
                {score}
              </span>
            </div>
          );
        }
      },
      {
        accessorKey: 'risk',
        header: 'Risk',
        cell: ({ row }) => (
          <RiskBadge risk={row.original.risk} />
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: chainsData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <motion.div
      ref={panelRef}
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 30, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-full select-none"
    >
      <GlassCard
        borderColor="rgba(239, 68, 68, 0.3)" // RED tint boundary line for distinction
        glowColor="rgba(239, 68, 68, 0.08)"
        padding="20px 24px"
        className="w-full relative shadow-2xl"
      >
        {/* Card Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 pb-3 border-b border-slate-850/40">
          <div>
            <h3 className="text-[18px] font-bold text-white tracking-tight leading-none">Failed Chain Analysis</h3>
            <p className="text-[13px] text-slate-500 mt-2 font-medium leading-none">
              Pattern: <span className="font-mono text-indigo-400 font-semibold">{patternId}</span> —{' '}
              <span className="font-mono text-slate-400 font-semibold">{isLoading ? '...' : chainsData.length}</span> chains found
            </p>
          </div>

          {/* Severity Counters Badges */}
          <div className="flex items-center gap-2 flex-wrap sm:mr-8">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/10 text-red-400 border border-red-500/20">
              Critical: {isLoading ? '..' : criticalCount}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              High: {isLoading ? '..' : highCount}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Medium: {isLoading ? '..' : mediumCount}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              Low: {isLoading ? '..' : lowCount}
            </span>
          </div>

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg bg-transparent border-none outline-none text-slate-500 hover:text-slate-200 cursor-pointer transition"
            aria-label="Close chain panel"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Wafer Spatial Correlation Panel */}
        {!isLoading && chainsData.length > 0 && (
          <MiniWaferCorrelationMap patternId={patternId} />
        )}

        {/* TanStack Chain Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/20">
          <table className="w-full text-xs text-left text-slate-350 select-none">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr
                  key={hg.id}
                  style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                  className="bg-slate-950/40 text-slate-500 font-semibold uppercase tracking-wider"
                >
                  {hg.headers.map(h => {
                    const isSortable = h.column.getCanSort();
                    const sorted = h.column.getIsSorted();
                    return (
                      <th
                        key={h.id}
                        onClick={h.column.getToggleSortingHandler()}
                        className={cn(
                          'px-4 py-3 text-[11px] letter-spacing-[0.05em] uppercase font-bold select-none transition-colors duration-150',
                          isSortable ? 'cursor-pointer hover:bg-slate-900/40 hover:text-slate-300' : ''
                        )}
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {isSortable && sorted === 'asc' && <ChevronUp className="h-3 w-3 shrink-0" />}
                          {isSortable && sorted === 'desc' && <ChevronDown className="h-3 w-3 shrink-0" />}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} columns={6} />
                ))
              ) : chainsData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <EmptyState icon="link-off" message="No chain failures found for this pattern" />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map(row => {
                  const isFocused = focusedChainId === row.original.chainId;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onSelectChain(row.original.chainId, row.original)}
                      style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                      className={cn(
                        'cursor-pointer transition-all duration-150 text-[13px] text-slate-200',
                        isFocused
                          ? 'bg-red-500/10 border-l-[3px] border-l-red-500/60 shadow-[inset_0_0_8px_rgba(239,68,68,0.15)] font-medium text-white'
                          : 'bg-transparent hover:bg-red-500/[0.04] hover:border-l-[3px] hover:border-l-red-500/80'
                      )}
                    >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ); })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function MiniWaferCorrelationMap({ patternId }: { patternId: string }) {
  // Generate a deterministic list of dots for the wafer map based on the pattern name
  const isEdgeRing = patternId.endsWith('2') || patternId.endsWith('4') || patternId.endsWith('6') || patternId.endsWith('8');
  
  // Create a 7x7 grid representing the wafer
  const size = 80;
  const radius = 36;
  const center = 40;
  const dots: { cx: number; cy: number; isFailed: boolean }[] = [];

  for (let x = -3; x <= 3; x++) {
    for (let y = -3; y <= 3; y++) {
      // Calculate pixel coordinate
      const cx = center + x * 9;
      const cy = center + y * 9;
      // Check if within circular wafer boundary
      const dx = cx - center;
      const dy = cy - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < radius - 2) {
        // Determine failure representation
        let isFailed = false;
        if (isEdgeRing) {
          // Edge ring: dies close to the boundary are failed
          isFailed = dist > radius - 12 && Math.sin(x * y) > -0.2;
        } else {
          // Center cluster: dies near the center are failed
          isFailed = dist < 16 && Math.cos(x + y) > -0.1;
        }
        dots.push({ cx, cy, isFailed });
      }
    }
  }

  const affectedDies = isEdgeRing ? 45 : 28;
  const affectedRegion = isEdgeRing ? 'Edge Ring' : 'Center Cluster';
  const yieldLoss = isEdgeRing ? '1.8%' : '0.9%';

  return (
    <div className="bg-slate-950/50 border border-slate-900/60 rounded-xl p-3 mb-5 flex items-center justify-between gap-4 select-none">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
          <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Wafer Spatial Correlation</h4>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1 font-sans">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none">Affected Dies</span>
            <span className="text-xs font-mono font-extrabold text-red-400 block mt-1">{affectedDies} Dies</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none">Wafer Region</span>
            <span className="text-xs font-extrabold text-slate-300 block mt-1 leading-none">{affectedRegion}</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase block leading-none">Yield Loss</span>
            <span className="text-xs font-mono font-extrabold text-amber-400 block mt-1">{yieldLoss}</span>
          </div>
        </div>
      </div>

      {/* Wafer SVG Visualizer */}
      <div className="relative shrink-0 flex items-center justify-center bg-slate-950 border border-slate-900 rounded-lg p-1">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Wafer Circular Boundary */}
          <circle cx={center} cy={center} r={radius} fill="none" stroke="#475569" strokeWidth="1" />
          {/* Notch at bottom */}
          <path d="M 37 76 Q 40 73 43 76" fill="none" stroke="#475569" strokeWidth="1" />
          {/* Silicon Dies Grid */}
          {dots.map((d, idx) => (
            <circle
              key={idx}
              cx={d.cx}
              cy={d.cy}
              r="2.5"
              fill={d.isFailed ? '#EF4444' : '#10B981'}
              opacity={d.isFailed ? 0.95 : 0.45}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
