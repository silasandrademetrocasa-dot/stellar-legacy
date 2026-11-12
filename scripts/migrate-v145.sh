#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL com conexão PostgreSQL do ambiente de teste escolhido.}"
task_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
case "${1:-}" in
 apply) psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$task_root/sql/STELLAR_V145_PREFLIGHT.sql" ;;
 rollback) psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$task_root/sql/STELLAR_V145_ROLLBACK.sql" ;;
 *) echo 'Uso: bash scripts/migrate-v145.sh apply|rollback'; exit 2 ;;
esac
