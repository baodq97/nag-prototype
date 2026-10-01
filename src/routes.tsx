// The route table: the router, the left navigation and the end-to-end test all read this
// one list, so they cannot drift apart. It holds no JSX and loads screens lazily, so the
// end-to-end test can import it in Node.

import {
  Activity,
  BookOpenCheck,
  Bot,
  FileText,
  Fingerprint,
  Gauge,
  GitFork,
  Globe,
  Inbox,
  Landmark,
  Layers,
  type LucideIcon,
  Package,
  Plug,
  Power,
  ScrollText,
  ShieldCheck,
  ShieldHalf,
  TriangleAlert,
  UserCheck,
} from 'lucide-react';
import { type ComponentType, type LazyExoticComponent, lazy } from 'react';
import { getAudit, getIntegration, getTest } from './data';

export type NavGroup = 'Overview' | 'Catalogue' | 'Runtime oversight' | 'Governance' | 'External';

export const NAV_GROUPS: NavGroup[] = [
  'Overview',
  'Catalogue',
  'Runtime oversight',
  'Governance',
  'External',
];

export interface RouteDef {
  id: string;
  path: string;
  /** The page's h1, as the end-to-end test expects it on `sample`. */
  heading: string;
  /** A concrete URL for the route, with seeded IDs filled in. */
  sample: string;
  /** Shows runtime behaviour, so it carries the "Demo data" label. */
  demo: boolean;
  layout: 'console' | 'auditor' | 'trust';
  nav?: { group: NavGroup; label: string; icon: LucideIcon };
  component: LazyExoticComponent<ComponentType>;
}

const SAMPLE_TEST = 'TST-019';
const SAMPLE_INTEGRATION = 'int-mcp';
const SAMPLE_AUDIT = 'AUD-2026-01';

export const routes: RouteDef[] = [
  {
    id: 'posture',
    path: '/',
    heading: 'Posture overview',
    sample: '/',
    demo: true,
    layout: 'console',
    nav: { group: 'Overview', label: 'Posture', icon: Gauge },
    component: lazy(() => import('./screens/posture')),
  },
  {
    id: 'coverage',
    path: '/coverage',
    heading: 'Article coverage',
    sample: '/coverage',
    demo: false,
    layout: 'console',
    nav: { group: 'Overview', label: 'Article coverage', icon: Landmark },
    component: lazy(() => import('./screens/coverage')),
  },
  {
    id: 'tests',
    path: '/tests',
    heading: 'Tests',
    sample: '/tests',
    demo: true,
    layout: 'console',
    nav: { group: 'Catalogue', label: 'Tests', icon: Activity },
    component: lazy(() => import('./screens/tests')),
  },
  {
    id: 'test-detail',
    path: '/tests/:id',
    heading: getTest(SAMPLE_TEST)!.name,
    sample: `/tests/${SAMPLE_TEST}`,
    demo: true,
    layout: 'console',
    component: lazy(() => import('./screens/tests/detail')),
  },
  {
    id: 'controls',
    path: '/controls',
    heading: 'Controls',
    sample: '/controls',
    demo: false,
    layout: 'console',
    nav: { group: 'Catalogue', label: 'Controls', icon: ShieldCheck },
    component: lazy(() => import('./screens/controls')),
  },
  {
    id: 'integrations',
    path: '/integrations',
    heading: 'Integrations',
    sample: '/integrations',
    demo: true,
    layout: 'console',
    nav: { group: 'Catalogue', label: 'Integrations', icon: Plug },
    component: lazy(() => import('./screens/integrations')),
  },
  {
    id: 'integration-detail',
    path: '/integrations/:id',
    heading: getIntegration(SAMPLE_INTEGRATION)!.name,
    sample: `/integrations/${SAMPLE_INTEGRATION}`,
    demo: true,
    layout: 'console',
    component: lazy(() => import('./screens/integrations/detail')),
  },
  {
    id: 'evidence',
    path: '/evidence',
    heading: 'Evidence',
    sample: '/evidence',
    demo: true,
    layout: 'console',
    nav: { group: 'Runtime oversight', label: 'Evidence', icon: Fingerprint },
    component: lazy(() => import('./screens/evidence')),
  },
  {
    id: 'quarantine',
    path: '/quarantine',
    heading: 'Quarantine queue',
    sample: '/quarantine',
    demo: true,
    layout: 'console',
    nav: { group: 'Runtime oversight', label: 'Quarantine', icon: Inbox },
    component: lazy(() => import('./screens/quarantine')),
  },
  {
    id: 'kill-switch',
    path: '/kill-switch',
    heading: 'Kill switch',
    sample: '/kill-switch',
    demo: true,
    layout: 'console',
    nav: { group: 'Runtime oversight', label: 'Kill switch', icon: Power },
    component: lazy(() => import('./screens/kill-switch')),
  },
  {
    id: 'lineage',
    path: '/lineage',
    heading: 'Lineage',
    sample: '/lineage',
    demo: true,
    layout: 'console',
    nav: { group: 'Runtime oversight', label: 'Lineage', icon: GitFork },
    component: lazy(() => import('./screens/lineage')),
  },
  {
    id: 'policy-bundles',
    path: '/policy-bundles',
    heading: 'Policy bundles',
    sample: '/policy-bundles',
    demo: true,
    layout: 'console',
    nav: { group: 'Runtime oversight', label: 'Policy bundles', icon: Layers },
    component: lazy(() => import('./screens/policy-bundles')),
  },
  {
    id: 'privacy',
    path: '/privacy',
    heading: 'Privacy and erasure',
    sample: '/privacy',
    demo: true,
    layout: 'console',
    nav: { group: 'Runtime oversight', label: 'Privacy and erasure', icon: ShieldHalf },
    component: lazy(() => import('./screens/privacy')),
  },
  {
    id: 'packages',
    path: '/packages',
    heading: 'Conformity packages',
    sample: '/packages',
    demo: true,
    layout: 'console',
    nav: { group: 'Governance', label: 'Conformity packages', icon: Package },
    component: lazy(() => import('./screens/packages')),
  },
  {
    id: 'qms',
    path: '/qms',
    heading: 'QMS library',
    sample: '/qms',
    demo: false,
    layout: 'console',
    nav: { group: 'Governance', label: 'QMS library', icon: BookOpenCheck },
    component: lazy(() => import('./screens/qms')),
  },
  {
    id: 'documents',
    path: '/documents',
    heading: 'Documents',
    sample: '/documents',
    demo: false,
    layout: 'console',
    nav: { group: 'Governance', label: 'Documents', icon: FileText },
    component: lazy(() => import('./screens/documents')),
  },
  {
    id: 'policies',
    path: '/policies',
    heading: 'Policies',
    sample: '/policies',
    demo: false,
    layout: 'console',
    nav: { group: 'Governance', label: 'Policies', icon: ScrollText },
    component: lazy(() => import('./screens/policies')),
  },
  {
    id: 'risks',
    path: '/risks',
    heading: 'Risk register',
    sample: '/risks',
    demo: false,
    layout: 'console',
    nav: { group: 'Governance', label: 'Risk register', icon: TriangleAlert },
    component: lazy(() => import('./screens/risks')),
  },
  {
    id: 'assistant',
    path: '/assistant',
    heading: 'Assistant',
    sample: '/assistant',
    demo: true,
    layout: 'console',
    nav: { group: 'Governance', label: 'Assistant', icon: Bot },
    component: lazy(() => import('./screens/assistant')),
  },
  {
    id: 'auditor',
    path: '/auditor/:auditId',
    heading: getAudit(SAMPLE_AUDIT)!.name,
    sample: `/auditor/${SAMPLE_AUDIT}`,
    demo: false,
    layout: 'auditor',
    nav: { group: 'External', label: 'Auditor view', icon: UserCheck },
    component: lazy(() => import('./screens/auditor')),
  },
  {
    id: 'trust',
    path: '/trust',
    heading: 'Trust page',
    sample: '/trust',
    demo: false,
    layout: 'trust',
    nav: { group: 'External', label: 'Public trust page', icon: Globe },
    component: lazy(() => import('./screens/trust')),
  },
];
