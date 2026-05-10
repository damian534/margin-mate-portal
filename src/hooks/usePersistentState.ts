import { useEffect, useState } from "react";

/**
 * Like useState, but persisted to localStorage under the given key.
 * Survives navigation, tab switches and page refreshes.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  options?: {
    serialize?: (v: T) => string;
    deserialize?: (raw: string) => T;
  }
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? (JSON.parse as (raw: string) => T);

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      return deserialize(raw);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, serialize(value));
    } catch {
      // ignore quota / serialization errors
    }
  }, [key, value, serialize]);

  return [value, setValue];
}

/** Helper for persisting a Set<string> as a JSON array. */
export function usePersistentStringSet(
  key: string,
  initial: Set<string> = new Set()
): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] {
  return usePersistentState<Set<string>>(key, initial, {
    serialize: (s) => JSON.stringify(Array.from(s)),
    deserialize: (raw) => new Set(JSON.parse(raw) as string[]),
  });
}