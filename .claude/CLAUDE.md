# nag-prototype

Prototype of NAG, a runtime compliance sidecar for AI applications with a continuous
compliance console on top.

## Rules for every change

- This repository is public. Do not copy requirement documents, their text or their
  structure into code, comments, docs, commits or pull requests. Describe behaviour in
  your own words, only as much as the change needs.
- The console follows the layout and interaction patterns of modern continuous-compliance
  products (left navigation, tables with filters, detail drawers, status chips). Product
  name and branding are NAG's own: never use another vendor's name, logo, illustrations or
  marketing copy.
- Honest claims: "tamper-evident", not "tamper-proof"; "supports compliance readiness", not
  "compliant". Anything stubbed (external services, keys, timestamping, models) is labelled
  as a stub in the UI and in code.
- `scripts/ci.sh` is what CI runs. A change that adds code adds its tests and wires them in
  there; CI must stay green.
- UI text is English.
- Use the latest stable release of every language, runtime, framework, library, tool and
  CI action. Look the version up when adding or touching a dependency; do not rely on memory.
- Commits and pull requests carry no AI attribution lines.
