# Demo paths

Three short walk-throughs of the console, one per persona. Every screen is named by its route
path. All numbers come from the deterministic seed; no runtime is connected, and screens that
show runtime behaviour carry the "Demo data" label. Start each path from a fresh page load:
choices made during a path (an erasure, a fallback change) last for the session only.

## Compliance Officer

Goal: see where the organisation stands, find what is stale, and prepare for an audit without
overstating anything.

1. `/` shows the posture overview. Point at the passing share of tests, the failing tests grouped
   by how close their due date is (four are already overdue) and the trend line over 30 days.
   The chip at the top reads "Integration level: App context · Scenario S1".
2. `/onboarding` explains that chip. Show the before/after base URL where only the host changes,
   the three integration levels with the tenant at App context (the MCP inspector is being
   trialled), and the two scenarios: in both, the provider signs the declaration and NAG never
   does.
3. `/coverage` lists the EU AI Act articles NAG covers. Open Art. 14 and show what NAG covers
   against what the customer must still do, with the linked tests and controls.
4. `/documents` shows review state next to each document. Point at "Review overdue" on the Kill
   switch runbook, the Serious incident playbook and the Model card for the credit scoring
   model.
5. `/policies` shows the renewal state. Point at "Expired" on the AI policy: its renewal date has
   passed even though it is approved.
6. `/trust` is the public page. Seven claims read "Under remediation": human review of uncertain
   output, the emergency stop (its control links the overdue Kill switch runbook from step 4),
   prompt-injection screening, the MCP server allow-list, tamper-evident records with three
   integrity layers, independent timestamp anchoring, and the AI policy approved by
   leadership. Explain that each status is derived from tests, document and policy state and
   evidence verification, not typed in by hand, and that a failing check outranks "In
   progress" for work that is still planned.
7. `/evidence` is where the evidence claim breaks. The Operations card shows that this morning's
   weekly full verification (Wednesday 08:00) failed on 1 range, seq 101–150. Run Verify and
   point at the same range, where the hash chain reports a gap detected at seq 137, while the
   other ranges verify.
8. `/auditor/AUD-2026-01` is the audit tracker for the ISO/IEC 42001 surveillance audit. Point at
   the five evidence states, the flagged request about reviewer training records, and the list
   of items whose document or policy is past its date.
9. `/packages` shows the conformity package. The checklist cards count what is complete in the
   declaration, the deployer agreement and the supplier inputs; the assessment route starts at
   self-assessment because the tenant is in scenario S1. Close by saying what the console
   supports: readiness work, not a certificate.

## AI/ML Engineer

Goal: follow a failing check from the test down to the runtime that produced it, and see what
the safeguards do to a request.

1. `/tests` lists every test with status and due date. Filter to failing tests and point at the
   overdue ones.
2. `/tests/TST-019` is "Quarantined items decided within 8 business hours". Show the failing
   entities, the remediation steps, the history and the open task on it.
3. `/controls` shows the controls behind a test. Find "Human review of quarantined output" and
   point at its tests-passing ratio: one of its two tests, TST-019, fails, which is why the
   matching trust claim is under remediation.
4. `/integrations/int-mcp` is the MCP inspector, in an error state with no heartbeat since 07:12.
   Show the capabilities that stop working and the scope list, then open session MCP-S-302 in
   the Sessions card: its last tool call, a refund, was blocked fail-closed and the session was
   terminated.
5. `/lineage` shows traces of agent calls. Open the trace that stops at depth 11 and point at the
   rejected delegation, then the support agent trace with its tool calls that were cancelled,
   failed or abandoned.
6. `/policy-bundles` lists the bundles by class. Point at the Art. 5 bundles that fail closed, the
   quarantine behaviour of the redaction bundle, and the legacy keyword list that was imported
   without a class or a budget.
7. `/quarantine` is the human review queue. The Classifier card shows how a score maps to a
   band. Open the first item, show its score next to the bound of its band, the 20-character
   justification rule on approve and reject, and the expired items rejected by tenant policy.

## Platform and SRE owner

Goal: judge whether the sidecar is safe to run in the request path, and what happens when it
fails.

1. `/runtime-health` starts with the stage table. Point at the over-budget p99 on the Class B and
   Class C stages, and that the other stages stay within budget. The numbers are seeded, not
   measured.
2. `/runtime-health` continues with the breach counters and the blast radius table. Show how many
   breaches each stage had in 24 hours and 7 days, and what a failed check does to a request for
   each class.
3. `/runtime-health` also shows the customer-side circuit breaker. It is a stub, currently closed
   after a short trip this morning.
4. `/runtime-health` ends with the choice for when NAG is unreachable. Select Bypass and read the
   confirmation dialog: requests in bypass mode create no evidence records, so the time shows up
   later as a gap. Cancel once to show the old value is kept, then confirm to show Bypass as the
   current choice for this session.
5. `/evidence` shows what such a gap looks like. Run Verify and open the range 101–150, where the
   hash chain reports a gap detected at seq 137, and open a record to see its code, the three
   integrity layers and the timestamp authority that anchored it. The Operations card shows the
   failover from authority A to B in the night; the Codes card lists every decision and error
   code.
6. `/privacy` shows erasure by key destruction. The Erasure requests table shows each request's
   deadline: one is overdue by 2 working days. Start the erasure for subj-0007, confirm, count
   the remaining records, and point at the summary: the hash-chain failure in 101–150 was
   already there before the erasure. Record the attestation and show its request row turn
   Completed with the clock stopped. Then repeat for subj-0011, where every layer verifies.
7. `/kill-switch` shows the emergency stop. Activate it with any six-digit code, then show that
   resuming needs two different roles and that the timeline records the refused second approval
   by the same role.
8. `/integrations` lists the connections behind the runtime. Point at the MCP inspector in an
   error state, and say which tests depend on it.
