import { useUrlParam } from './useUrlParam';

/**
 * The object open in a screen's drawer, kept in `?open=<id>` so search results and the
 * assistant can link straight to it.
 */
export function useOpenParam(): [string | null, (id: string | null) => void] {
  return useUrlParam('open');
}
