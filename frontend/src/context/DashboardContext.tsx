'use client';

import {
  createContext, useContext, useReducer, useCallback,
  type ReactNode, type Dispatch,
} from 'react';
import type {
  DashboardState, DashboardFilters, AlertItem,
  DateRange, DateRangePreset,
} from '@/types/dashboard.types';
import { DATE_RANGE_PRESETS } from '@/lib/constants';
import { startOfDay, addDays } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateRange(preset: DateRangePreset): DateRange {
  const to   = new Date();
  const from = startOfDay(addDays(to, -DATE_RANGE_PRESETS[preset].days));
  return { preset, from, to };
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: DashboardState = {
  activeLotId:       'lot-001',
  activeFabId:       'fab-001',
  dateRange:         buildDateRange('7d'),
  autoRefresh:       true,
  lastUpdatedAt:     null,
  alerts:            [],
  sidebarCollapsed:  false,
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LOT';             lotId: string | null }
  | { type: 'SET_FAB';             fabId: string | null }
  | { type: 'SET_DATE_RANGE';      preset: DateRangePreset }
  | { type: 'TOGGLE_AUTO_REFRESH' }
  | { type: 'SET_LAST_UPDATED';    at: Date }
  | { type: 'ADD_ALERT';           alert: AlertItem }
  | { type: 'MARK_ALERT_READ';     id: string }
  | { type: 'TOGGLE_SIDEBAR' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function dashboardReducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case 'SET_LOT':
      return { ...state, activeLotId: action.lotId };
    case 'SET_FAB':
      return { ...state, activeFabId: action.fabId };
    case 'SET_DATE_RANGE':
      return { ...state, dateRange: buildDateRange(action.preset) };
    case 'TOGGLE_AUTO_REFRESH':
      return { ...state, autoRefresh: !state.autoRefresh };
    case 'SET_LAST_UPDATED':
      return { ...state, lastUpdatedAt: action.at };
    case 'ADD_ALERT':
      return { ...state, alerts: [action.alert, ...state.alerts].slice(0, 50) };
    case 'MARK_ALERT_READ':
      return {
        ...state,
        alerts: state.alerts.map(a => a.id === action.id ? { ...a, read: true } : a),
      };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DashboardContextValue {
  state:    DashboardState;
  dispatch: Dispatch<Action>;
  // Convenience helpers
  setLot:         (id: string | null) => void;
  setFab:         (id: string | null) => void;
  setDateRange:   (preset: DateRangePreset) => void;
  markUpdated:    () => void;
  toggleSidebar:  () => void;
  unreadAlertCount: number;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  const setLot        = useCallback((id: string | null) => dispatch({ type: 'SET_LOT', lotId: id }), []);
  const setFab        = useCallback((id: string | null) => dispatch({ type: 'SET_FAB', fabId: id }), []);
  const setDateRange  = useCallback((p: DateRangePreset) => dispatch({ type: 'SET_DATE_RANGE', preset: p }), []);
  const markUpdated   = useCallback(() => dispatch({ type: 'SET_LAST_UPDATED', at: new Date() }), []);
  const toggleSidebar = useCallback(() => dispatch({ type: 'TOGGLE_SIDEBAR' }), []);

  const unreadAlertCount = state.alerts.filter(a => !a.read).length;

  return (
    <DashboardContext.Provider value={{
      state, dispatch,
      setLot, setFab, setDateRange, markUpdated, toggleSidebar,
      unreadAlertCount,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside <DashboardProvider>');
  return ctx;
}
