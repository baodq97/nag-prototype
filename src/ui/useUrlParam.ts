import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * One filter, tab or drawer kept in a URL query parameter, so a reload or a shared link restores
 * it. Setting null or the empty string removes the parameter. History is replaced, not pushed.
 */
export function useUrlParam(name: string): [string | null, (value: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const set = useCallback(
    (value: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(name, value);
          else next.delete(name);
          return next;
        },
        { replace: true },
      ),
    [setParams, name],
  );
  return [params.get(name), set];
}
