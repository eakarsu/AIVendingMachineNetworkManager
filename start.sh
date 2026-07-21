#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$project_dir/.env" ]] || { echo 'Missing .env; copy .env.example and provide real secrets.' >&2; exit 1; }
[[ -d "$project_dir/backend/node_modules" && -d "$project_dir/frontend/node_modules" ]] || { echo 'Dependencies are missing; install them explicitly before starting.' >&2; exit 1; }
BACKEND_PORT="${BACKEND_PORT:?BACKEND_PORT is required}"; FRONTEND_PORT="${FRONTEND_PORT:?FRONTEND_PORT is required}"
[[ -n "${DATABASE_URL:-}" ]] || { echo 'DATABASE_URL is required.' >&2; exit 1; }
JWT_SECRET_VALUE="${JWT_SECRET:-}"; [[ "${#JWT_SECRET_VALUE}" -ge 32 ]] || { echo 'JWT_SECRET must contain at least 32 characters.' >&2; exit 1; }
if [[ -z "${CLIENT_URL:-}" ]]; then if [[ "${NODE_ENV:-}" == test ]]; then export CLIENT_URL="http://127.0.0.1:$FRONTEND_PORT"; else echo 'CLIENT_URL is required.' >&2; exit 1; fi; fi
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $port is occupied; no process was terminated." >&2; exit 1; fi; done
(cd "$project_dir/backend" && BACKEND_PORT="$BACKEND_PORT" npm start) & backend_pid=$!
(cd "$project_dir/frontend" && BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" npm run dev -- --host "${FRONTEND_HOST:-127.0.0.1}" --port "$FRONTEND_PORT" --strictPort) & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; wait "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup INT TERM EXIT
wait "$backend_pid" "$frontend_pid"
