import { useEffect, useState } from 'react';

const KEY = 'factFindEnabled';
const EVENT = 'factFindEnabledChange';

export function getFactFindEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const v = localStorage.getItem(KEY);
  return v === null ? true : v === 'true';
}

export function setFactFindEnabled(enabled: boolean) {
  localStorage.setItem(KEY, String(enabled));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: enabled }));
}

export function useFactFindEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => getFactFindEnabled());
  useEffect(() => {
    const onChange = () => setEnabled(getFactFindEnabled());
    window.addEventListener(EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);
  return enabled;
}
