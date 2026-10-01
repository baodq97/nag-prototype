#!/usr/bin/env bash
# The single entry point CI runs (required check `ci` on main).
# Every unit that adds code wires its build, lint and tests in here.
# Steps run one at a time; the first non-zero exit fails the script.
set -euo pipefail
cd "$(dirname "$0")/.."

step() {
  echo
  echo "==> $1"
}

step "Install dependencies from the lockfile"
npm ci

step "Lint and format check"
npm run lint

step "Type check (strict)"
npm run typecheck

step "Unit tests with domain coverage threshold"
npm test

step "Production build"
npm run build

step "End-to-end browser tests against the production build"
npm run e2e
