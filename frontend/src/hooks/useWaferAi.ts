'use client';
import { useState, useCallback, useEffect } from 'react';
import {
  predictWaferImage,
  DEFAULT_LOT_DB,
  type WaferEntry,
  type LotDatabase,
  fetchLotsFromDb,
  deleteWaferInDb,
  clearLotInDb,
  clearAllInDb,
} from '@/api/waferAi';

export function useWaferAi() {
  const [lotDatabase, setLotDatabase] = useState<LotDatabase>(DEFAULT_LOT_DB);
  const [loaded, setLoaded]           = useState(false);
  const [predicting, setPredicting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Load from database on client-side mount
  const fetchLots = useCallback(async () => {
    try {
      const data = await fetchLotsFromDb();
      setLotDatabase(data);
    } catch (e) {
      console.error('Failed to fetch lot database from server:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch database');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  // Synchronize state across tabs and page focus
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      fetchLots();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchLots]);

  const predict = useCallback(async (file: File): Promise<WaferEntry | null> => {
    setPredicting(true);
    setError(null);
    try {
      const result = await predictWaferImage(file);
      // Refetch lots from DB to ensure local state has all mapped attributes
      await fetchLots();
      return result as WaferEntry;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Prediction failed');
      return null;
    } finally {
      setPredicting(false);
    }
  }, [fetchLots]);

  const clearLot = useCallback(async (lotId: string) => {
    setError(null);
    try {
      await clearLotInDb(lotId);
      await fetchLots();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clear lot');
    }
  }, [fetchLots]);

  const clearAll = useCallback(async () => {
    setError(null);
    try {
      await clearAllInDb();
      await fetchLots();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clear database');
    }
  }, [fetchLots]);

  const deleteWafer = useCallback(async (lotId: string, waferName: string) => {
    setError(null);
    try {
      await deleteWaferInDb(lotId, waferName);
      await fetchLots();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete wafer');
    }
  }, [fetchLots]);

  return { lotDatabase, predicting, error, predict, clearLot, clearAll, deleteWafer };
}
