import { useParams } from 'react-router';
import { getTest } from '../../data';
import { Page } from '../../ui/Page';

// Placeholder until the screen is built.
export default function Screen() {
  const { id = '' } = useParams();
  return (
    <Page title={getTest(id)?.name ?? 'Not found'} demo>
      <p className="text-sm text-slate-600">This screen is being built.</p>
    </Page>
  );
}
