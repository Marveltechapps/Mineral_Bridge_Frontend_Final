import { useEffect, useRef } from 'react';
import { saveFormDraft } from './services';

/**
 * Auto-save form data so it survives app reload/refresh. Saves after a short delay when deps change.
 * @param {string} flow - Draft flow key (e.g. 'buyQuantity', 'sellDetails', 'buyDelivery').
 * @param {object} data - Current form state to save (plain object).
 * @param {{ debounceMs?: number, deps: any[] }} options - debounceMs (default 1500); deps: dependency array so we re-run when form state changes.
 */
export function useDebouncedFormDraft(flow, data, options = {}) {
  const { debounceMs = 1500, deps = [] } = options;
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!flow || data == null) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const payload = typeof data === 'object' && !Array.isArray(data) ? { ...data } : data;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      saveFormDraft(flow, payload).catch(() => {});
    }, debounceMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [flow, debounceMs, ...deps]);
}
