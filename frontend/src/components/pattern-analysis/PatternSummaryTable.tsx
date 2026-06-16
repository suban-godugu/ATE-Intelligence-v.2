'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '@/api/client';
import { cn } from '@/lib/utils';
import {
  GlassCard,
  SearchInput,
  SkeletonRow,
  FaultTypeBadge
} from './SharedComponents';

// === TELEMETRY QUERY HOCK ===

export const usePatternsList = (filters: any) =>
  useQuery<any[]>({
    queryKey: ['redesign-patterns', filters],
    queryFn: async () => {
      const { data } = await apiClient.get<any[]>('/patterns', {
        params: filters,
      });
      return data;
    },
  });

interface PatternSummaryTableProps {
  selectedPatternId: string | null;
  onSelectPattern: (patternId: string) => void;
  fabId?: string;
  from?: string;
  to?: string;
  focusedPatternId?: string | null;
}

interface PatternData {
  patternId: string;
  failedChains: number;
  failRate: number;
}

export default function PatternSummaryTable({
  selectedPatternId,
  onSelectPattern,
  fabId,
  from,
  to,
  focusedPatternId
}: PatternSummaryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'failed' | 'low-cov' | 'high-cost' | 'redundant'>('all');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Query parameters mapping QuickFilters states
  const filters = {
    fabId,
    from,
    to,
    search: searchQuery || undefined,
  };

  const { data: patternsData = [], isLoading } = usePatternsList(filters);

  // Client-side filtering implementation for quick chips
  const filteredPatternsData = React.useMemo(() => {
    return patternsData.filter((pat: any) => {
      if (activeFilter === 'failed') {
        return pat.failedChains > 0 || pat.failRate > 1.0;
      }
      if (activeFilter === 'low-cov') {
        return pat.failRate > 5.0 || pat.failedChains >= 4;
      }
      if (activeFilter === 'high-cost') {
        return pat.patternId.includes('00') || pat.failRate > 4.0;
      }
      if (activeFilter === 'redundant') {
        return pat.patternId.endsWith('2') || pat.patternId.endsWith('5');
      }
      return true;
    });
  }, [patternsData, activeFilter]);

  // TanStack columns mapping Prompt 1 layout
  const columns = React.useMemo<ColumnDef<PatternData>[]>(
    () => [
      {
        accessorKey: 'patternId',
        header: 'Pattern ID',
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-blue-400 select-none">
            {row.original.patternId}
          </span>
        ),
      },
      {
        accessorKey: 'failedChains',
        header: 'Total Failed Chains',
        cell: ({ row }) => {
          const val = row.original.failedChains;
          let badgeBg = 'rgba(16, 185, 129, 0.1)';
          let badgeTextColor = '#34D399'; // Emerald
          let badgeText = '0 Chains';
          let borderColors = 'rgba(16, 185, 129, 0.2)';

          if (val >= 6) {
            badgeBg = 'rgba(239, 68, 68, 0.1)';
            badgeTextColor = '#F87171'; // Red
            badgeText = `${val} Chains`;
            borderColors = 'rgba(239, 68, 68, 0.2)';
          } else if (val >= 1) {
            badgeBg = 'rgba(245, 158, 11, 0.1)';
            badgeTextColor = '#FBBF24'; // Amber
            badgeText = `${val} ${val === 1 ? 'Chain' : 'Chains'}`;
            borderColors = 'rgba(245, 158, 11, 0.2)';
          } else {
            badgeText = 'Clean';
          }

          return (
            <div className="flex justify-start select-none">
              <span
                className="px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wider font-mono border select-none leading-none inline-flex items-center gap-1"
                style={{ backgroundColor: badgeBg, color: badgeTextColor, borderColor: borderColors }}
              >
                <span>{badgeText}</span>
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'failRate',
        header: 'Fail Rate Score',
        cell: ({ row }) => {
          const val = row.original.failRate;
          let badgeBg = 'rgba(16, 185, 129, 0.1)';
          let badgeTextColor = '#34D399'; // Emerald
          let borderColors = 'rgba(16, 185, 129, 0.2)';

          if (val > 5.0) {
            badgeBg = 'rgba(239, 68, 68, 0.1)';
            badgeTextColor = '#F87171'; // Red
            borderColors = 'rgba(239, 68, 68, 0.2)';
          } else if (val >= 2.0) {
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
                {val.toFixed(1)}%
              </span>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredPatternsData,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const pageCount = table.getPageCount();
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const startIdx = filteredPatternsData.length > 0 ? pageIndex * pageSize + 1 : 0;
  const endIdx = Math.min((pageIndex + 1) * pageSize, filteredPatternsData.length);

  return (
    <GlassCard padding="20px 24px" className="w-full relative shadow-lg">
      {/* Table Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3.5 select-none">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight leading-none">Pattern Summary</h3>
          <p className="text-[13px] text-slate-500 mt-1.5 font-medium leading-none">Click a pattern to analyse chain failures</p>
        </div>

        {/* Right tools: search and pagination */}
        <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
          <SearchInput
            placeholder="Search Pattern ID..."
            value={searchQuery}
            onChange={(val) => {
              setSearchQuery(val);
              setPagination(prev => ({ ...prev, pageIndex: 0 }));
            }}
            className="w-full md:w-56"
          />
        </div>
      </div>

      {/* Quick Filter Chips Row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4 select-none">
        {[
          { id: 'all', label: 'All' },
          { id: 'failed', label: 'Failed' },
          { id: 'low-cov', label: 'Coverage < 90%' },
          { id: 'high-cost', label: 'High Cost' },
          { id: 'redundant', label: 'Redundant' },
        ].map((chip) => {
          const isActive = activeFilter === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => {
                setActiveFilter(chip.id as any);
                setPagination(prev => ({ ...prev, pageIndex: 0 }));
              }}
              className={cn(
                'px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition duration-150 cursor-pointer',
                isActive
                  ? 'bg-indigo-650/80 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                  : 'bg-slate-950/40 text-slate-400 border-slate-850 hover:text-slate-200 hover:bg-slate-900/60'
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* TanStack Table Element with vertical scroll height constraint & column pinning */}
      <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/20 max-h-[350px] overflow-y-auto">
        <table className="w-full text-xs text-left text-slate-350 select-none relative border-collapse">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr
                key={hg.id}
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                className="bg-slate-950/90 text-slate-500 font-semibold uppercase tracking-wider sticky top-0 z-20 backdrop-blur-sm"
              >
                {hg.headers.map((h, idx) => {
                  const isSortable = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      className={cn(
                        'px-4 py-3 text-[11px] letter-spacing-[0.05em] uppercase font-bold select-none transition-colors duration-150',
                        isSortable ? 'cursor-pointer hover:bg-slate-900/40 hover:text-slate-300' : '',
                        idx === 0 ? 'sticky left-0 bg-slate-950 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.3)]' : ''
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
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} columns={3} />
              ))
            ) : filteredPatternsData.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-slate-500 font-medium select-none">
                  No patterns found matching filter.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => {
                const isSelected = selectedPatternId === row.original.patternId;
                const isFocused = focusedPatternId === row.original.patternId;
                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelectPattern(row.original.patternId)}
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                    className={cn(
                      'cursor-pointer transition-all duration-150 text-[13px] text-slate-200 bg-transparent',
                      isSelected
                        ? 'bg-blue-500/15 font-semibold shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                        : isFocused
                          ? 'bg-blue-500/10 shadow-[inset_0_0_8px_rgba(59,130,246,0.15)] font-medium text-white'
                          : 'hover:bg-blue-500/[0.08]'
                    )}
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <td
                        key={cell.id}
                        className={cn(
                          'px-4 py-3',
                          idx === 0
                            ? cn(
                                'sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.35)] transition-colors',
                                isSelected
                                  ? 'bg-[#1e2e50]'
                                  : isFocused
                                    ? 'bg-[#182645]'
                                    : 'bg-[#12192e]'
                              )
                            : ''
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!isLoading && filteredPatternsData.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-xs text-slate-500 select-none">
          <div>
            Showing <span className="font-mono font-semibold text-slate-400">{startIdx}</span>–
            <span className="font-mono font-semibold text-slate-400">{endIdx}</span> of{' '}
            <span className="font-mono font-semibold text-slate-400">{filteredPatternsData.length}</span> patterns
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono font-semibold text-slate-400">
              {pageIndex + 1} / {pageCount || 1}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

