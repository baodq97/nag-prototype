import { expect, it } from 'vitest';
import { frameworkItems, integrations } from '../seed/base';
import { controls, tests } from '../seed/catalogue';
import { integrationUnlocks } from './integrations';

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
