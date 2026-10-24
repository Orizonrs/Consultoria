-- R33 (M5): perfis admin/operador no PostgreSQL real (com o stub do Supabase). Faz parte de tests/sql/rodar-m15.sh
-- Usuários de teste: A (11111111-...-aaaa) e B (22222222-...-bbbb)
grant select, insert, update, delete on cr_candidatos, cr_empresas, cr_instituicoes, cr_config to authenticated;
grant usage on all sequences in schema public to authenticated;
delete from cr_perfis; delete from cr_candidatos where lower(nome) like 'perfil teste%'; delete from cr_config where chave = 'perfil_teste';
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@x.com'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@x.com') on conflict (id) do update set email = excluded.email;

do $$
declare n int := 0; ok boolean; c int; p text;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  set local role authenticated;
  if not cr_e_admin() or cr_meu_perfil() <> 'admin' then raise exception 'FALHOU [P01 partida: sem nenhum admin, todo logado vale como admin]'; end if; n := n + 1;
  perform set_config('request.jwt.claim.sub', '', false);
  if cr_e_admin() or cr_meu_perfil() is not null then raise exception 'FALHOU [P02 sem login nunca é admin]'; end if; n := n + 1;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  begin perform cr_definir_perfil('a@x.com', 'chefe'); ok := false; exception when sqlstate '22023' then ok := true; end;
  if not ok then raise exception 'FALHOU [P03 perfil inválido recusado]'; end if; n := n + 1;
  begin perform cr_definir_perfil('naoexiste@x.com', 'admin'); ok := false; exception when sqlstate '22023' then ok := true; end;
  if not ok then raise exception 'FALHOU [P04 e-mail desconhecido recusado]'; end if; n := n + 1;
  perform cr_definir_perfil('  A@X.com ', 'admin');
  if (select count(*) from cr_perfis where perfil = 'admin' and email = 'a@x.com') <> 1 then raise exception 'FALHOU [P05 A virou admin (e-mail normalizado)]'; end if; n := n + 1;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
  if cr_e_admin() or cr_meu_perfil() <> 'operador' then raise exception 'FALHOU [P06 com um admin definido, B (sem linha) é operador]'; end if; n := n + 1;
  begin perform cr_definir_perfil('b@x.com', 'admin'); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [P07 operador não define perfis (nem o próprio)]'; end if; n := n + 1;
  select count(*) into c from cr_perfis;
  if c <> 0 then raise exception 'FALHOU [P08 operador não lê a lista de perfis: %]', c; end if; n := n + 1;
  begin insert into cr_perfis (user_id, perfil) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [P09 escrita direta em cr_perfis recusada]'; end if; n := n + 1;

  insert into cr_candidatos (nome) values ('Perfil Teste Um');
  update cr_candidatos set curso = 'Direito' where lower(nome) = 'perfil teste um';
  if (select curso from cr_candidatos where lower(nome) = 'perfil teste um') <> 'Direito' then raise exception 'FALHOU [P10 operador cria e edita cadastro]'; end if; n := n + 1;
  delete from cr_candidatos where lower(nome) = 'perfil teste um';
  if not exists (select 1 from cr_candidatos where lower(nome) = 'perfil teste um') then raise exception 'FALHOU [P11 operador NÃO exclui cadastro (RLS apaga 0 linhas)]'; end if; n := n + 1;
  begin insert into cr_config (chave, valor) values ('perfil_teste', '{}'::jsonb); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [P12 operador não grava configuração]'; end if; n := n + 1;
  perform 1 from cr_config limit 1;  n := n + 1;  -- P13 operador lê configuração (não pode dar erro)
  select count(*) into c from cr_log;
  if c <> 0 then raise exception 'FALHOU [P14 operador não lê o histórico de acessos: %]', c; end if; n := n + 1;

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  delete from cr_candidatos where lower(nome) = 'perfil teste um';
  if exists (select 1 from cr_candidatos where lower(nome) = 'perfil teste um') then raise exception 'FALHOU [P15 admin exclui cadastro]'; end if; n := n + 1;
  insert into cr_config (chave, valor) values ('perfil_teste', '{}'::jsonb);
  update cr_config set valor = '{"a":1}'::jsonb where chave = 'perfil_teste'; delete from cr_config where chave = 'perfil_teste'; n := n + 1;  -- P16 admin grava configuração
  if (select count(*) from cr_perfis) <> 1 then raise exception 'FALHOU [P17 admin lê a lista de perfis]'; end if; n := n + 1;
  begin perform cr_definir_perfil('a@x.com', 'operador'); ok := false; exception when sqlstate '23514' then ok := true; end;
  if not ok then raise exception 'FALHOU [P18 não remove o ÚLTIMO admin]'; end if; n := n + 1;
  if not exists (select 1 from cr_log where acao = 'definiu_perfil') then raise exception 'FALHOU [P19 definir perfil entra no histórico]'; end if; n := n + 1;
  if exists (select 1 from cr_log where acao = 'definiu_perfil' and (coalesce(referencia,'') || coalesce(detalhe,'')) ~* 'x\.com') then raise exception 'FALHOU [P20 o histórico não leva e-mail]'; end if; n := n + 1;
  perform cr_definir_perfil('b@x.com', 'admin');
  perform cr_definir_perfil('a@x.com', 'operador');   -- agora há 2 admins: pode rebaixar um
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  if cr_e_admin() then raise exception 'FALHOU [P21 A rebaixado deixa de ser admin]'; end if; n := n + 1;
  reset role;
  raise notice 'PERFIS SQL: % verificações OK (partida, 2 perfis, exclusão/configuração/histórico só admin, último admin protegido)', n;
end $$;

do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '', false);
  set local role anon;
  begin perform cr_e_admin(); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [P22 anon não executa cr_e_admin]'; end if;
  begin perform cr_definir_perfil('a@x.com', 'admin'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [P23 anon não define perfil]'; end if;
  begin perform 1 from cr_perfis limit 1; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [P24 anon não lê perfis]'; end if;
  reset role;
  raise notice 'PERFIS SQL: anon bloqueado OK';
end $$;
delete from cr_perfis; delete from auth.users where id in ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
