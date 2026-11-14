#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL para o ambiente escolhido.}"
task_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
case "${1:-}" in
 preflight) psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$task_root/sql/STELLAR_V146_PREFLIGHT.sql" ;;
 apply)
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$task_root/sql/STELLAR_V146_PREFLIGHT.sql"
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$task_root/sql/STELLAR_V146_OUTBOX.sql"
  ;;
 rollback) psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$task_root/sql/STELLAR_V146_ROLLBACK.sql" ;;
 *) echo 'Uso: bash scripts/migrate-v146.sh preflight|apply|rollback'; exit 2 ;;
esac
