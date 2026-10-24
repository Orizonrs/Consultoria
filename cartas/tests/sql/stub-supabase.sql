-- Stub mínimo do Supabase para testar o SQL num PostgreSQL comum (papéis, auth.uid/jwt e as 2 tabelas-base).
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),'')::jsonb,'{}'::jsonb) $$;
grant usage on schema public, auth to anon, authenticated;
-- R46: o Supabase real concede tudo ao anon/authenticated por padrão em tabelas/funções/sequências criadas no schema public (sem isto os testes eram mais "fechados" que o real)
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
create table if not exists cr_contratos (id bigserial primary key, tipo text, numero_contrato text, titulo text, nome_candidato text, cpf text, cargo text, email_candidato text, empresa text, cnpj_empresa text, endereco_emp text, periodo_inicio date, periodo_fim date, jornada_horas text, valor_bolsa numeric, valor_vt numeric, apolice_seguro text, supervisor_nome text, supervisor_cargo text, atividades_plano text, curso text, instituicao text, matricula text, semestre text, status text default 'enviado', criado_em timestamptz default now());
create table if not exists cr_signatarios (id bigserial primary key, contrato_id bigint references cr_contratos(id), nome text, email text, papel text, token text, status text default 'pendente');
create table if not exists auth.users (id uuid primary key, email text);
