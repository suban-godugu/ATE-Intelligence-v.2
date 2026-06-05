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
    data: patternsData,
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
  const startIdx = pageIndex * pageSize + 1;
  const endIdx = Math.min((pageIndex + 1) * pageSize, patternsData.length);

  return (
    <GlassCard padding="20px 24px" className="w-full relative shadow-lg">
      {/* Table Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 select-none">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight leading-none">Pattern Summary</h3>
          <p className="text-[13px] text-slate-500 mt-1.5 font-medium leading-none">Click a pattern to analyse chain failures</p>
        </div>

        {/* Right tools: debounced search and pagination */}
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

      {/* TanStack Table Element */}
      <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950/20">
        <table className="w-full text-xs text-left text-slate-350 select-none">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr
                key={hg.id}
                style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
                className="bg-slate-950/40 text-slate-500 font-semibold uppercase tracking-wider sticky top-0"
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
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} columns={3} />
              ))
            ) : patternsData.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center text-slate-500 font-medium select-none">
                  No patterns found matching query.
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
                      'cursor-pointer transition-all duration-150 text-[13px] text-slate-200',
                      isSelected
                        ? 'bg-blue-500/15 border-l-[3px] border-l-blue-400 font-semibold shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                        : isFocused
                          ? 'bg-blue-500/10 border-l-[3px] border-l-blue-500/60 shadow-[inset_0_0_8px_rgba(59,130,246,0.15)] font-medium text-white'
                          : 'bg-transparent hover:bg-blue-500/[0.08] hover:border-l-[3px] hover:border-l-blue-500'
                    )}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
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
      {!isLoading && patternsData.length > 0 && (
        <div className="flex items-center justify-between mt-4 text-xs text-slate-500 select-none">
          <div>
            Showing <span className="font-mono font-semibold text-slate-400">{startIdx}</span>–
            <span className="font-mono font-semibold text-slate-400">{endIdx}</span> of{' '}
            <span className="font-mono font-semibold text-slate-400">{patternsData.length}</span> patterns
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
