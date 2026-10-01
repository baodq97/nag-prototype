import { Page } from './Page';

export function NotFound() {
  return (
    <Page title="Page not found">
      <p className="text-sm text-slate-600">This address is not part of the console.</p>
    </Page>
  );
}
