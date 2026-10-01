import { matchPath, useLocation } from 'react-router';
import { routes } from '../routes';

/** The route-table entry for the current URL, so every header reads its purpose from one place. */
export function useRouteDef() {
  const { pathname } = useLocation();
  return routes.find((r) => matchPath(r.path, pathname));
}
