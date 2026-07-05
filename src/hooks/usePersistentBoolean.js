import { useEffect, useState } from 'react';

export function usePersistentBoolean(storageKey, defaultValue = true) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (storedValue === null) {
        return defaultValue;
      }

      return storedValue === 'true';
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [storageKey, value]);

  return [value, setValue];
}
