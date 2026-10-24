#!/bin/sh
# Uso (precisa de um PostgreSQL local; NÃO rode no banco de produção):
#   createdb orizon_teste && sh tests/sql/rodar-m15.sh orizon_teste
DB=${1:-orizon_teste}; D=$(dirname "$0")
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/stub-supabase.sql" 
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/../../sql/cr-schema.sql" 2>&1 | grep -v NOTICE
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/m15-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/e2e-contrato.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/verificar-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/link-prazo-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/reabrir-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/ordem-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/empresas-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/instituicoes-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/candidatos-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/perfis-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/retencao-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/modelos-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/anexos-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/otp-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/modelos-carta-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/anexos-carta-teste.sql"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$D/retencao-anexos-teste.sql"
# R46: o diagnóstico não pode achar FALTA/ATENÇÃO num banco com o schema completo e permissões padrão do Supabase (o stub as imita)
RUIM=$(psql -d "$DB" -tA -F' | ' -f "$D/../../sql/diagnostico-supabase.sql" | grep -c '| FALTA |\|| ATENÇÃO |')
if [ "$RUIM" -eq 0 ]; then echo "DIAGNOSTICO SQL: schema completo sem FALTA/ATENÇÃO OK"; else echo "DIAGNOSTICO SQL: $RUIM linha(s) FALTA/ATENÇÃO"; exit 1; fi
