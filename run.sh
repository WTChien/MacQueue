#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is not installed. Please install Node.js 18+ first."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed. Please install npm first."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting MacQueue with Netlify Dev..."
exec npx netlify dev