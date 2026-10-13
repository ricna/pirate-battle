import { useCallback, useEffect, useState } from 'react';

/** How long a confirmation such as "Options saved." stays visible, in milliseconds. */
export const NoticeDurationMs = 4000;

/**
 * A confirmation message that hides itself after NoticeDurationMs.
 * Announcing the same text again restarts the timer, so repeated actions stay visible.
 */
export function useTransientNotice(): [string, (message: string) => void] {
  const [notice, setNotice] = useState<{ message: string; serial: number } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NoticeDurationMs);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const announce = useCallback((message: string) => {
    setNotice((current) => ({ message, serial: (current?.serial ?? 0) + 1 }));
  }, []);

  return [notice?.message ?? '', announce];
}
