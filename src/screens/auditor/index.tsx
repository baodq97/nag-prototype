import { useParams } from 'react-router';
import { getAudit } from '../../data';

// Placeholder until the screen is built.
export default function Screen() {
  const { auditId = '' } = useParams();
  return (
    <main className="mx-auto max-w-5xl px-6 py-6">
      <h1 className="text-xl font-semibold">{getAudit(auditId)?.name ?? 'Audit not found'}</h1>
    </main>
  );
}
