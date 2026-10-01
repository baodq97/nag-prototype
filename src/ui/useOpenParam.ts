import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * The object open in a screen's drawer, kept in `?open=<id>` so search results and the
 * assistant can link straight to it.
 */
export function useOpenParam(): [string | null, (id: string | null) => void] {
  const [params, setParams] = useSearchParams();
  const set = useCallback(
    (id: string | null) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set('open', id);
          else next.delete('open');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );
  return [params.get('open'), set];
}
