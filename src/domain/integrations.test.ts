import { expect, it } from 'vitest';
import { frameworkItems, integrations } from '../seed/base';
import { controls, tests } from '../seed/catalogue';
import { INTEGRATION_KIND_LABEL, integrationUnlocks } from './integrations';
import type { IntegrationKind } from './types';

// Every member of the union, enumerated so the type checker rejects a missing or unknown one.
const ALL_KINDS: Record<IntegrationKind, true> = {
  'ai-gateway': true,
  'agent-hooks': true,
  'mcp-inspector': true,
  'model-endpoint': true,
  identity: true,
  ticketing: true,
  chat: true,
  'key-management': true,
  'evidence-archive': true,
  'security-export': true,
  'timestamp-authority': true,
  'source-repository': true,
  cloud: true,
};

it('counts the tests, controls and frameworks a source unlocks', () => {
  // The MCP inspector feeds TST-024, TST-025 and TST-029.
  expect(integrationUnlocks('int-mcp', tests, controls, frameworkItems)).toEqual({
    tests: 3,
    controls: 3,
    frameworks: 2,
  });
  expect(integrationUnlocks('none', tests, controls, frameworkItems)).toEqual({
    tests: 0,
    controls: 0,
    frameworks: 0,
  });
});

it('gives every seeded source at least one test', () => {
  for (const i of integrations) {
    expect(integrationUnlocks(i.id, tests, controls, frameworkItems).tests).toBeGreaterThan(0);
  }
});

it('labels every integration type', () => {
  for (const kind of Object.keys(ALL_KINDS) as IntegrationKind[]) {
    expect(INTEGRATION_KIND_LABEL[kind]?.trim()).toBeTruthy();
  }
  expect(Object.keys(INTEGRATION_KIND_LABEL).sort()).toEqual(Object.keys(ALL_KINDS).sort());
  for (const i of integrations) expect(INTEGRATION_KIND_LABEL[i.kind]).toBeTruthy();
});

it('spells the MCP inspector type with its acronym', () => {
  expect(INTEGRATION_KIND_LABEL['mcp-inspector']).toBe('MCP inspector');
});
