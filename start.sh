#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$project_dir/.env" ]] || { echo 'Missing .env; copy .env.example and provide real secrets.' >&2; exit 1; }
set -a
# shellcheck disable=SC1091
source "$project_dir/.env"
set +a

[[ -d "$project_dir/backend/node_modules" && -d "$project_dir/frontend/node_modules" ]] || { echo 'Dependencies are missing; install them explicitly before starting.' >&2; exit 1; }
BACKEND_PORT="${BACKEND_PORT:?BACKEND_PORT is required}"
FRONTEND_PORT="${FRONTEND_PORT:?FRONTEND_PORT is required}"
[[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]] || { echo 'Backend and frontend ports must be different; no process was changed.' >&2; exit 1; }
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}"
: "${OPENROUTER_MODEL:?OPENROUTER_MODEL is required}"
: "${OPENROUTER_BASE_URL:?OPENROUTER_BASE_URL is required}"
JWT_SECRET_VALUE="${JWT_SECRET:-}"
[[ "${#JWT_SECRET_VALUE}" -ge 32 ]] || { echo 'JWT_SECRET must contain at least 32 characters.' >&2; exit 1; }
CLIENT_URL="${CLIENT_URL:-http://127.0.0.1:$FRONTEND_PORT}"
export BACKEND_PORT FRONTEND_PORT CLIENT_URL
[[ "${ALLOW_SCHEMA_MIGRATION:-}" == "true" || "${ALLOW_SCHEMA_MIGRATION:-}" == "1" ]] || { echo 'ALLOW_SCHEMA_MIGRATION=true is required.' >&2; exit 1; }

for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is occupied; no process was changed." >&2
    exit 1
  fi
done

(cd "$project_dir/backend" && node scripts/prepareRuntime.js)

(cd "$project_dir/backend" && BACKEND_PORT="$BACKEND_PORT" npm start) &
backend_pid=$!
(cd "$project_dir/frontend" && BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" npm run dev -- --host "${FRONTEND_HOST:-127.0.0.1}" --port "$FRONTEND_PORT" --strictPort) &
frontend_pid=$!
cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT
wait "$backend_pid" "$frontend_pid"
