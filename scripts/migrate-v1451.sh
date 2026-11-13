#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL para o PostgreSQL do ambiente escolhido.}"
task_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
case "${1:-}" in
 apply)
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$task_root/sql/STELLAR_V145_PREFLIGHT.sql"
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$task_root/sql/STELLAR_V145_1_COMPRA_CONTEXTO.sql"
  ;;
 rollback) psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$task_root/sql/STELLAR_V145_1_COMPRA_ROLLBACK.sql" ;;
 *) echo 'Uso: bash scripts/migrate-v1451.sh apply|rollback'; exit 2 ;;
esac
