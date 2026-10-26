#!/bin/sh
# Testa o schema num PostgreSQL local descartável (NUNCA em produção). Uso: sh tests/rodar-sql.sh
D=$(cd "$(dirname "$0")/.." && pwd)
su postgres -c "dropdb --if-exists cab_test; createdb cab_test"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d cab_test -f $D/tests/stub-supabase.sql"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d cab_test -f $D/sql/cab-schema.sql" 2>&1 | grep -v NOTICE
echo "-- 2ª execução do schema (idempotência)"
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d cab_test -f $D/sql/cab-schema.sql" 2>&1 | grep -v NOTICE
su postgres -c "psql -q -t -d cab_test -f $D/tests/cab-teste.sql" 2>&1 | grep -E "^ (OK|FALHA)|RESUMO|ERROR"
