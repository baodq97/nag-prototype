#!/usr/bin/env bash
# The single entry point CI runs (required check `ci` on main).
# Every unit that adds code wires its build, lint and tests in here.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "No checks yet: the repository holds no application code."
