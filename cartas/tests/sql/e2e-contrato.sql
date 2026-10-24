-- M19: ponta a ponta no banco (PostgreSQL real, stub do Supabase): criar contrato -> assinar por token -> status -> auditoria.
\set ON_ERROR_STOP on
set client_min_messages = notice;
truncate cr_signatarios, cr_contratos, cr_auditoria, cr_contadores, cr_log restart identity cascade;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
do $$
declare num text; cid bigint; t1 text; t2 text; t3 text; r json; st text; img text := repeat('A', 200); n int;
begin
  num := cr_proximo_numero('TCE');                       -- numeração sequencial (RN-03)
  if num <> 'TCE-' || extract(year from now())::int || '-0001' then raise exception 'E1 numeração: %', num; end if;
  if cr_proximo_numero('TCE') not like '%-0002' then raise exception 'E2 sequência não avança'; end if;
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status) values ('estagio', num, 'TCE — Ana', 'Ana', 'enviado') returning id into cid;
  insert into cr_signatarios (contrato_id, nome, email, papel, token) values
    (cid, 'Orizon', 'o@x.com', 'empresa_nexus', 'tk1'), (cid, 'Ana', 'a@x.com', 'candidato', 'tk2'), (cid, 'Chefe', 'c@x.com', 'supervisor', 'tk3');

  begin
    perform set_config('request.jwt.claim.sub', '', false);   -- a partir daqui é VISITANTE (sem login)
    r := cr_ler_por_token('xxx');            if r->>'erro' <> 'token_invalido' then raise exception 'E3 token falso aceito'; end if;
    r := cr_ler_por_token('tk2');            if r->'signatario'->>'nome' <> 'Ana' then raise exception 'E4 leitura por token'; end if;
    if (select count(*) from cr_auditoria where evento = 'visualizou') <> 1 then raise exception 'E5 visualização não auditada'; end if;
    r := cr_assinar('tk2', 'curta');         if r->>'erro' <> 'assinatura_invalida' then raise exception 'E6 assinatura curta aceita'; end if;
    r := cr_assinar('tk1', img);             if r->>'contrato_status' <> 'parcial' then raise exception 'E7 1º assinou => parcial, veio %', r; end if;
    r := cr_assinar('tk1', img);             if r->>'erro' <> 'ja_assinado' then raise exception 'E8 assinatura dupla aceita'; end if;
    r := cr_assinar('tk2', img);             if r->>'contrato_status' <> 'parcial' then raise exception 'E9 2 de 3 => parcial'; end if;
    r := cr_assinar('tk3', img);             if r->>'contrato_status' <> 'assinado' or length(r->>'hash') <> 64 then raise exception 'E10 todos => assinado + hash SHA-256, veio %', r; end if;
    select status into st from cr_contratos where id = cid;  if st <> 'assinado' then raise exception 'E11 status final %', st; end if;
    if (select hash_documento from cr_contratos where id = cid) is null then raise exception 'E12 hash do documento vazio'; end if;
    if (select count(*) from cr_auditoria where contrato_id = cid and evento = 'assinou') <> 3 then raise exception 'E13 auditoria das 3 assinaturas'; end if;
    if (select count(distinct hash_assinatura) from cr_signatarios where contrato_id = cid) <> 3 then raise exception 'E14 hashes por signatário'; end if;
  end;

  -- recusa e contrato cancelado
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status) values ('clt', 'CLT-X-1', 'CLT — Bia', 'Bia', 'enviado') returning id into cid;
  insert into cr_signatarios (contrato_id, nome, email, papel, token) values (cid, 'Bia', 'b@x.com', 'candidato', 'tk4'), (cid, 'Orizon', 'o@x.com', 'empresa_nexus', 'tk5');
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_recusar('tk4', 'Valor errado');  if (r->>'ok') <> 'true' then raise exception 'E15 recusa: %', r; end if;
  r := cr_assinar('tk4', img);             if r->>'erro' <> 'recusado' then raise exception 'E16 assinar depois de recusar'; end if;
  update cr_contratos set status = 'cancelado' where id = cid;
  r := cr_assinar('tk5', img);             if r->>'erro' <> 'cancelado' then raise exception 'E17 assinou contrato cancelado: %', r; end if;
  r := cr_ler_por_token('tk5');            if r->>'erro' <> 'cancelado' then raise exception 'E18 leu contrato cancelado'; end if;

  -- link expirado
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status) values ('clt', 'CLT-X-2', 'CLT — Caio', 'Caio', 'enviado') returning id into cid;
  insert into cr_signatarios (contrato_id, nome, email, papel, token, expira_em) values (cid, 'Caio', 'c@x.com', 'candidato', 'tk6', now() - interval '1 day');
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_assinar('tk6', img);             if r->>'erro' <> 'expirado' then raise exception 'E19 link expirado aceito'; end if;
  raise notice 'E2E SQL: 19 verificações OK (criar -> assinar -> status -> auditoria; recusa, cancelado, expirado)';
end $$;

-- visitante não lê as tabelas direto (RLS/permissão)
set role anon;
do $$ declare n int; begin
  begin select count(*) into n from cr_contratos; exception when insufficient_privilege then n := 0; end;
  if n <> 0 then raise exception 'E20 visitante leu cr_contratos (% linhas)', n; end if;
  begin select count(*) into n from cr_signatarios; exception when insufficient_privilege then n := 0; end;
  if n <> 0 then raise exception 'E21 visitante leu cr_signatarios'; end if;
  raise notice 'E2E SQL: visitante não lê tabelas direto OK';
end $$;
reset role;
