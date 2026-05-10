import { useEffect, useState } from 'react';

export function usePersistedState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return defaultValue;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  }, [key, value]);

  return [value, setValue];
}

/** Persist a Set<string> across navigations / refreshes. */
export function usePersistedStringSet(
  key: string,
  defaultValue: string[] = []
): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] {
  const [arr, setArr] = usePersistedState<string[]>(key, defaultValue);
  const setValue: React.Dispatch<React.SetStateAction<Set<string>>> = (update) => {
    setArr((prev) => {
      const prevSet = new Set(prev);
      const next =
        typeof update === 'function'
          ? (update as (s: Set<string>) => Set<string>)(prevSet)
          : update;
      return Array.from(next);
    });
  };
  return [new Set(arr), setValue];
}