-- ============================================================================
-- cab-schema.sql — Cartas de Conta (Orizon). Rodar UMA vez no SQL Editor de um projeto Supabase NOVO.
-- Idempotente (pode rodar de novo). RLS ligado em TODAS as tabelas. Nenhuma chave secreta no front.
-- ============================================================================
create extension if not exists pgcrypto;

-- ---------- Perfis e papéis (admin / operador / leitura) ----------
create table if not exists cab_perfis (
  user_id uuid primary key, email text, papel text not null default 'leitura' check (papel in ('admin','operador','leitura')), criado_em timestamptz default now());
create or replace function cab_novo_usuario() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into cab_perfis (user_id, email, papel)
  values (new.id, new.email, case when exists (select 1 from cab_perfis) then 'leitura' else 'admin' end) on conflict do nothing;
  return new;
end $$;
drop trigger if exists cab_trg_novo_usuario on auth.users;
create trigger cab_trg_novo_usuario after insert on auth.users for each row execute function cab_novo_usuario();
create or replace function cab_papel() returns text language sql stable security definer set search_path = public as $$ select papel from cab_perfis where user_id = auth.uid() $$;
create or replace function cab_pode_ler() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from cab_perfis where user_id = auth.uid()) $$;
create or replace function cab_pode_escrever() returns boolean language sql stable security definer set search_path = public as $$ select coalesce((select papel in ('admin','operador') from cab_perfis where user_id = auth.uid()), false) $$;
create or replace function cab_eh_admin() returns boolean language sql stable security definer set search_path = public as $$ select coalesce((select papel = 'admin' from cab_perfis where user_id = auth.uid()), false) $$;

-- ---------- Cadastros ----------
create table if not exists cab_empresas (id bigserial primary key, razao_social text not null, cnpj text, endereco text, responsavel text, cargo_responsavel text, email text, telefone text, criado_em timestamptz default now());
create table if not exists cab_bancos (id bigserial primary key, nome text not null, codigo text, agencia text, cidade text, contato text, criado_em timestamptz default now());
create table if not exists cab_titulares (id bigserial primary key, nome text not null, cpf text, rg text, vinculo text, email text, telefone text, criado_em timestamptz default now());
create table if not exists cab_modelos (id bigserial primary key, nome text not null, tipo text not null default 'empresa_banco' check (tipo in ('empresa_banco','pessoa_fisica','autorizacao')), texto text not null, ativo boolean not null default true, criado_em timestamptz default now());
create table if not exists cab_config (chave text primary key, valor text, atualizado_em timestamptz default now());

-- ---------- Cartas ----------
create table if not exists cab_cartas (
  id bigserial primary key, numero text not null unique, modo text not null check (modo in ('manual','automatico')),
  tipo_conta text not null check (tipo_conta in ('pj','pf','salario','pagamento')),
  status text not null default 'emitida' check (status in ('rascunho','emitida','aguardando','parcial','assinada','cancelada','expirada')),
  banco_nome text, empresa_nome text, titular_nome text, finalidade text,
  texto_final text not null, hash_conteudo text not null, codigo_verificacao text not null unique, dados_json jsonb,
  criado_por uuid default auth.uid(), criado_em timestamptz default now(), validade_ate date);
-- o texto, o número, o hash e o código não mudam depois de gravados (só o status)
create or replace function cab_carta_imutavel() returns trigger language plpgsql as $$
begin
  if new.numero is distinct from old.numero or new.texto_final is distinct from old.texto_final or new.hash_conteudo is distinct from old.hash_conteudo
     or new.codigo_verificacao is distinct from old.codigo_verificacao or new.modo is distinct from old.modo then
    raise exception 'campos da carta emitida não podem ser alterados'; end if;
  return new;
end $$;
drop trigger if exists cab_trg_carta_imutavel on cab_cartas;
create trigger cab_trg_carta_imutavel before update on cab_cartas for each row execute function cab_carta_imutavel();

create table if not exists cab_signatarios (
  id bigserial primary key, carta_id bigint not null references cab_cartas(id) on delete cascade, nome text not null, email text,
  papel text not null check (papel in ('empresa','titular','testemunha')), ordem int not null default 1,
  token text not null unique default encode(gen_random_bytes(24), 'hex'), status text not null default 'pendente' check (status in ('pendente','visualizado','assinado')),
  ip text, user_agent text, assinatura_img text, hash_assinatura text, visualizado_em timestamptz, assinado_em timestamptz, expira_em timestamptz default now() + interval '7 days');
create table if not exists cab_anexos (id bigserial primary key, carta_id bigint references cab_cartas(id) on delete cascade, nome text, caminho text, tamanho bigint, tipo text, criado_em timestamptz default now());
create table if not exists cab_auditoria (id bigserial primary key, carta_id bigint references cab_cartas(id) on delete cascade, evento text not null, detalhe text, ip text, criado_por uuid default auth.uid(), criado_em timestamptz default now());
create or replace function cab_auditoria_imutavel() returns trigger language plpgsql as $$ begin raise exception 'a trilha de auditoria é somente inserção'; end $$;
drop trigger if exists cab_trg_aud_imut on cab_auditoria;
create trigger cab_trg_aud_imut before update or delete on cab_auditoria for each row execute function cab_auditoria_imutavel();
create table if not exists cab_log (id bigserial primary key, user_id uuid, user_email text, acao text not null, detalhe text, criado_em timestamptz default now());
create table if not exists cab_contadores (ano int primary key, ultimo_numero int not null default 0);

-- ---------- Numeração CAB-AAAA-0001 (sem repetir, mesmo com 2 pessoas ao mesmo tempo) ----------
create or replace function cab_proximo_numero(p_ano int default null) returns text language plpgsql security definer set search_path = public as $$
declare a int := coalesce(p_ano, extract(year from now())::int); n int;
begin
  if not cab_pode_escrever() then raise exception 'sem permissão'; end if;
  insert into cab_contadores (ano, ultimo_numero) values (a, 1) on conflict (ano) do update set ultimo_numero = cab_contadores.ultimo_numero + 1 returning ultimo_numero into n;
  return 'CAB-' || a || '-' || lpad(n::text, 4, '0');
end $$;
create or replace function cab_log(p_acao text, p_detalhe text default null) returns void language plpgsql security definer set search_path = public as $$
begin insert into cab_log (user_id, user_email, acao, detalhe) values (auth.uid(), auth.jwt() ->> 'email', p_acao, p_detalhe); end $$;

-- ---------- Funções PÚBLICAS do link de assinatura (só enxergam UMA carta, pelo token) ----------
create or replace function cab_buscar_carta_por_token(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare s cab_signatarios; c cab_cartas; vez boolean;
begin
  select * into s from cab_signatarios where token = p_token; if not found then return null; end if;
  if s.expira_em < now() and s.status <> 'assinado' then return jsonb_build_object('erro','expirado'); end if;
  select * into c from cab_cartas where id = s.carta_id;
  select not exists (select 1 from cab_signatarios x where x.carta_id = s.carta_id and x.ordem < s.ordem and x.status <> 'assinado') into vez;
  return jsonb_build_object('signatario', jsonb_build_object('nome', s.nome, 'papel', s.papel, 'status', s.status, 'ordem', s.ordem, 'sua_vez', vez),
    'carta', jsonb_build_object('numero', c.numero, 'texto', c.texto_final, 'hash', c.hash_conteudo, 'status', c.status, 'banco', c.banco_nome, 'dados', c.dados_json));
end $$;
create or replace function cab_registrar_visualizacao(p_token text) returns void language plpgsql security definer set search_path = public as $$
declare s cab_signatarios;
begin
  select * into s from cab_signatarios where token = p_token and expira_em >= now(); if not found then return; end if;
  update cab_signatarios set visualizado_em = coalesce(visualizado_em, now()), status = case when status = 'pendente' then 'visualizado' else status end where id = s.id;
  insert into cab_auditoria (carta_id, evento, detalhe) values (s.carta_id, 'visualizada', s.nome);
end $$;
create or replace function cab_registrar_assinatura(p_token text, p_imagem text, p_hash text, p_ip text default null, p_ua text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare s cab_signatarios; c cab_cartas; faltam int;
begin
  select * into s from cab_signatarios where token = p_token for update; if not found then return jsonb_build_object('ok', false, 'erro', 'token_invalido'); end if;
  if s.status = 'assinado' then return jsonb_build_object('ok', false, 'erro', 'ja_assinado'); end if;
  if s.expira_em < now() then return jsonb_build_object('ok', false, 'erro', 'expirado'); end if;
  select * into c from cab_cartas where id = s.carta_id for update;
  if c.status = 'cancelada' then return jsonb_build_object('ok', false, 'erro', 'carta_cancelada'); end if;
  if exists (select 1 from cab_signatarios x where x.carta_id = s.carta_id and x.ordem < s.ordem and x.status <> 'assinado') then return jsonb_build_object('ok', false, 'erro', 'aguarde_anterior'); end if;
  if p_hash is distinct from c.hash_conteudo then return jsonb_build_object('ok', false, 'erro', 'hash_divergente'); end if;
  if p_imagem is null or length(p_imagem) < 100 then return jsonb_build_object('ok', false, 'erro', 'assinatura_vazia'); end if;
  update cab_signatarios set status = 'assinado', assinado_em = now(), assinatura_img = p_imagem, hash_assinatura = p_hash, ip = p_ip, user_agent = p_ua where id = s.id;
  select count(*) into faltam from cab_signatarios where carta_id = s.carta_id and status <> 'assinado';
  update cab_cartas set status = case when faltam = 0 then 'assinada' else 'parcial' end where id = c.id;
  insert into cab_auditoria (carta_id, evento, detalhe, ip) values (s.carta_id, 'assinada', s.nome || ' (' || s.papel || ')', p_ip);
  return jsonb_build_object('ok', true, 'completa', faltam = 0);
end $$;
create or replace function cab_verificar_autenticidade(p_codigo text) returns jsonb language sql security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('numero', c.numero, 'status', c.status, 'hash', c.hash_conteudo, 'emitida_em', c.criado_em, 'banco', c.banco_nome,
    'assinaturas', (select count(*) from cab_signatarios x where x.carta_id = c.id and x.status = 'assinado'), 'signatarios', (select count(*) from cab_signatarios x where x.carta_id = c.id))
    from cab_cartas c where c.codigo_verificacao = upper(trim(p_codigo))), jsonb_build_object('erro', 'nao_encontrado')) $$;

-- ---------- Segurança: RLS em TUDO; visitante (anon) não toca nas tabelas ----------
do $$ declare t text; begin
  foreach t in array array['cab_perfis','cab_empresas','cab_bancos','cab_titulares','cab_modelos','cab_config','cab_cartas','cab_signatarios','cab_anexos','cab_auditoria','cab_log','cab_contadores'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon', t);
  end loop;
end $$;
do $$ declare t text; begin
  foreach t in array array['cab_empresas','cab_bancos','cab_titulares','cab_modelos','cab_config'] loop
    execute format('drop policy if exists %I on %I', t||'_sel', t); execute format('drop policy if exists %I on %I', t||'_ins', t);
    execute format('drop policy if exists %I on %I', t||'_upd', t); execute format('drop policy if exists %I on %I', t||'_del', t);
    execute format('create policy %I on %I for select to authenticated using (cab_pode_ler())', t||'_sel', t);
    execute format('create policy %I on %I for insert to authenticated with check (cab_pode_escrever())', t||'_ins', t);
    execute format('create policy %I on %I for update to authenticated using (cab_pode_escrever()) with check (cab_pode_escrever())', t||'_upd', t);
    execute format('create policy %I on %I for delete to authenticated using (cab_pode_escrever())', t||'_del', t);
  end loop;
  foreach t in array array['cab_cartas','cab_signatarios','cab_anexos'] loop
    execute format('drop policy if exists %I on %I', t||'_sel', t); execute format('drop policy if exists %I on %I', t||'_ins', t); execute format('drop policy if exists %I on %I', t||'_upd', t);
    execute format('create policy %I on %I for select to authenticated using (cab_pode_ler())', t||'_sel', t);
    execute format('create policy %I on %I for insert to authenticated with check (cab_pode_escrever())', t||'_ins', t);
    execute format('create policy %I on %I for update to authenticated using (cab_pode_escrever()) with check (cab_pode_escrever())', t||'_upd', t);
  end loop;                                                       -- cartas: sem DELETE (só cancelar)
end $$;
drop policy if exists cab_aud_sel on cab_auditoria; drop policy if exists cab_aud_ins on cab_auditoria;
create policy cab_aud_sel on cab_auditoria for select to authenticated using (cab_pode_ler());
create policy cab_aud_ins on cab_auditoria for insert to authenticated with check (cab_pode_escrever());
drop policy if exists cab_perf_sel on cab_perfis; drop policy if exists cab_perf_upd on cab_perfis;
create policy cab_perf_sel on cab_perfis for select to authenticated using (user_id = auth.uid() or cab_eh_admin());
create policy cab_perf_upd on cab_perfis for update to authenticated using (cab_eh_admin()) with check (cab_eh_admin());
drop policy if exists cab_log_sel on cab_log; create policy cab_log_sel on cab_log for select to authenticated using (cab_eh_admin());
-- cab_contadores: sem policy = ninguém mexe direto (só a função cab_proximo_numero, que é security definer)

-- ---------- Quem pode chamar o quê ----------
revoke execute on function cab_proximo_numero(int), cab_log(text, text), cab_papel(), cab_pode_ler(), cab_pode_escrever(), cab_eh_admin() from public, anon;
grant execute on function cab_proximo_numero(int), cab_log(text, text), cab_papel(), cab_pode_ler(), cab_pode_escrever(), cab_eh_admin() to authenticated;
revoke execute on function cab_buscar_carta_por_token(text), cab_registrar_visualizacao(text), cab_registrar_assinatura(text, text, text, text, text), cab_verificar_autenticidade(text) from public;
grant execute on function cab_buscar_carta_por_token(text), cab_registrar_visualizacao(text), cab_registrar_assinatura(text, text, text, text, text), cab_verificar_autenticidade(text) to anon, authenticated;
