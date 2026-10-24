#!/bin/sh
# R46: prova que sql/diagnostico-supabase.sql não aponta FALTA/ATENÇÃO num banco com o schema completo (PostgreSQL local; NUNCA em produção).
# Uso: createdb orizon_diag && sh tests/sql/rodar-diagnostico.sh orizon_diag
DB=${1:-orizon_diag}; D=$(dirname "$0")
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/stub-supabase.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/../../sql/cr-schema.sql" 2>&1 | grep -v NOTICE
RUIM=$(psql -d "$DB" -tA -F' | ' -f "$D/../../sql/diagnostico-supabase.sql" | grep -c '| FALTA |\|| ATENÇÃO |')
if [ "$RUIM" -eq 0 ]; then echo "DIAGNOSTICO SQL: schema completo sem FALTA/ATENÇÃO OK"; else echo "DIAGNOSTICO SQL: $RUIM linha(s) FALTA/ATENÇÃO"; exit 1; fi
