import { useState } from 'react';
import { scopeGroups } from '../../domain/summaries';
import type { Integration } from '../../domain/types';
import { updateSession, useSession } from '../../session/store';
import { Button } from '../../ui/Button';
import { Toggle } from '../../ui/Field';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/useToast';
import { plural } from './text';

/**
 * Chooses which resources of a source are in scope, grouped by kind. Saving asks for
 * confirmation first; the choice lives in the session store, so it lasts for this session only.
 * Mount it only while open: each opening starts from the saved choice. `onClose` must be stable.
 */
export function ScopeDialog({
  integration,
  onClose,
}: {
  integration: Integration;
  onClose: () => void;
}) {
  const toast = useToast();
  const stored = useSession((s) => s.scope);
  const saved = (id: string, fallback: boolean) => stored[`${integration.id}:${id}`] ?? fallback;
  const [draft, setDraft] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(integration.scope.map((e) => [e.id, saved(e.id, e.included)])),
  );
  const [confirming, setConfirming] = useState(false);

  const entries = integration.scope.map((e) => ({ ...e, included: draft[e.id] ?? e.included }));
  const groups = scopeGroups(entries);
  const changes = integration.scope.filter((e) => draft[e.id] !== saved(e.id, e.included)).length;

  const setMany = (ids: string[], included: boolean) =>
    setDraft((d) => ({ ...d, ...Object.fromEntries(ids.map((id) => [id, included])) }));

  const apply = () => {
    updateSession((s) => ({
      ...s,
      scope: {
        ...s.scope,
        ...Object.fromEntries(
          integration.scope.map((e) => [`${integration.id}:${e.id}`, draft[e.id]!]),
        ),
      },
    }));
    toast(`Scope of ${integration.name} saved for this session`);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      title={confirming ? 'Confirm scope change' : `Configure scope: ${integration.name}`}
      footer={
        confirming ? (
          <>
            <Button onClick={() => setConfirming(false)}>Back</Button>
            <Button variant="primary" onClick={apply}>
              Apply changes
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={changes === 0} onClick={() => setConfirming(true)}>
              Save scope
            </Button>
          </>
        )
      }
    >
      {confirming ? (
        <p className="text-sm text-slate-800">
          Change {plural(changes, 'resource', 'resources')} in the scope of {integration.name}? NAG
          will read from the resources you included and stop reading from the others. The change
          lasts for this browser session only.
        </p>
      ) : (
        <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto">
          {groups.map((g) => (
            <section key={g.kind} aria-label={g.label}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{g.label}</h3>
                <span className="text-xs text-slate-700">
                  {g.included} of {g.total} in scope
                </span>
                <span className="ml-auto flex gap-1">
                  <Button
                    size="sm"
                    aria-label={`Include all ${g.label.toLowerCase()}`}
                    onClick={() =>
                      setMany(
                        g.entries.map((e) => e.id),
                        true,
                      )
                    }
                  >
                    Include all
                  </Button>
                  <Button
                    size="sm"
                    aria-label={`Exclude all ${g.label.toLowerCase()}`}
                    onClick={() =>
                      setMany(
                        g.entries.map((e) => e.id),
                        false,
                      )
                    }
                  >
                    Exclude all
                  </Button>
                </span>
              </div>
              <ul className="mt-1 divide-y divide-slate-100">
                {g.entries.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                    <Toggle
                      label={e.label}
                      checked={e.included}
                      onChange={(next) => setMany([e.id], next)}
                    />
                    <span className="text-xs text-slate-600">
                      {e.included ? 'Included' : 'Excluded'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}
