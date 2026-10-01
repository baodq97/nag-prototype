// Integrations connected in this browser session. Module-level and in memory only: a reload
// starts again from the seed, and nothing is written to storage.

import { useMemo, useSyncExternalStore } from 'react';
import { NOW, getIntegration, integrations } from '../../data';
import type { Integration } from '../../domain/types';

let connected: readonly string[] = [];
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Marks a source as connected for this session; a second call for the same source does nothing. */
export function connectIntegration(id: string) {
  if (connected.includes(id) || !getIntegration(id)) return;
  connected = [...connected, id];
  for (const listener of listeners) listener();
}

/** The demo values a source shows right after its first heartbeat. */
function asConnected(source: Integration): Integration {
  return {
    ...source,
    status: 'connected',
    lastSyncAt: NOW,
    connection: {
      endpoint: 'collector.nag.example',
      authMethod: source.connection.authMethod,
      keyId: `${source.id}-key`,
      lastRotatedAt: NOW,
    },
    health: { eventsPerMinute: 24, errorRatePct: 0 },
    activity: [
      { at: NOW, text: 'First heartbeat received' },
      { at: NOW, text: 'Connection test passed' },
      { at: NOW, text: 'Configuration applied' },
    ],
  };
}

/** The seeded catalogue with this session's newly connected sources switched to connected. */
export function useIntegrations(): Integration[] {
  const ids = useSyncExternalStore(
    subscribe,
    () => connected,
    () => connected,
  );
  return useMemo(() => integrations.map((i) => (ids.includes(i.id) ? asConnected(i) : i)), [ids]);
}

export function useIntegration(id: string): Integration | undefined {
  return useIntegrations().find((i) => i.id === id);
}
