-- R19 (M2/M11): prazo do link — prorrogar, gerar link novo (revoga o antigo), expirado, cancelado, permissões.
\set ON_ERROR_STOP on
set client_min_messages = notice;
truncate cr_signatarios, cr_contratos, cr_auditoria, cr_contadores, cr_log restart identity cascade;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
do $$
declare cid bigint; cid2 bigint; sa bigint; sb bigint; sc bigint; r json; t_old text; t_new text; exp1 timestamptz; img text := repeat('A', 200);
begin
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status) values ('estagio', 'TCE-L-0001', 'TCE — Ana', 'Ana', 'enviado') returning id into cid;
  insert into cr_signatarios (contrato_id, nome, email, papel, token, expira_em) values (cid, 'Ana', 'a@x.com', 'candidato', 'tkA', now() - interval '1 day') returning id into sa;
  insert into cr_signatarios (contrato_id, nome, email, papel, token) values (cid, 'Chefe', 'c@x.com', 'supervisor', 'tkB') returning id into sb;

  -- L1 link vencido não abre nem assina
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_ler_por_token('tkA'); if r->>'erro' <> 'expirado' then raise exception 'L1 link vencido abriu: %', r; end if;
  r := cr_assinar('tkA', img); if r->>'erro' <> 'expirado' then raise exception 'L1b link vencido assinou: %', r; end if;
  -- L2 visitante não renova (função exige login)
  begin perform cr_renovar_link(sa, 15, false); raise exception 'L2 visitante renovou'; exception when others then if sqlerrm not like '%autenticado%' then raise; end if; end;

  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  -- L3 prazo inválido
  r := cr_renovar_link(sa, 0, false);   if r->>'erro' <> 'dias_invalido' then raise exception 'L3a %', r; end if;
  r := cr_renovar_link(sa, 61, false);  if r->>'erro' <> 'dias_invalido' then raise exception 'L3b %', r; end if;
  r := cr_renovar_link(sa, null, false); if r->>'erro' <> 'dias_invalido' then raise exception 'L3c %', r; end if;
  r := cr_renovar_link(999999, 15, false); if r->>'erro' <> 'signatario_inexistente' then raise exception 'L3d %', r; end if;
  -- L4 prorrogar: mesmo token, novo prazo ~15 dias, volta a abrir
  r := cr_renovar_link(sa, 15, false);
  if (r->>'ok')::boolean is not true or r->>'token' <> 'tkA' or (r->>'novo_link')::boolean then raise exception 'L4a %', r; end if;
  select expira_em into exp1 from cr_signatarios where id = sa;
  if exp1 < now() + interval '14 days 23 hours' or exp1 > now() + interval '15 days 1 hour' then raise exception 'L4b prazo %', exp1; end if;
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_ler_por_token('tkA'); if r->'signatario'->>'nome' <> 'Ana' then raise exception 'L4c prorrogado não abriu: %', r; end if;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  -- L5 link novo: token muda (64 hex), o antigo morre, o novo abre
  t_old := 'tkB';
  r := cr_renovar_link(sb, 7, true); t_new := r->>'token';
  if t_new = t_old or t_new !~ '^[0-9a-f]{64}$' or (r->>'novo_link')::boolean is not true then raise exception 'L5a %', r; end if;
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_ler_por_token(t_old); if r->>'erro' <> 'token_invalido' then raise exception 'L5b token antigo ainda vale: %', r; end if;
  r := cr_assinar(t_old, img);  if r->>'erro' <> 'token_invalido' then raise exception 'L5c token antigo assinou: %', r; end if;
  r := cr_ler_por_token(t_new); if r->'signatario'->>'nome' <> 'Chefe' then raise exception 'L5d token novo não abre: %', r; end if;
  -- L6 auditoria e histórico (sem token nem dado pessoal)
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  if (select count(*) from cr_auditoria where evento = 'prorrogou_link' and detalhe = 'Ana | 15 dias') <> 1 then raise exception 'L6a auditoria prorrogou'; end if;
  if (select count(*) from cr_auditoria where evento = 'novo_link' and detalhe = 'Chefe | 7 dias') <> 1 then raise exception 'L6b auditoria novo_link'; end if;
  if exists (select 1 from cr_auditoria where detalhe like '%' || t_new || '%') or exists (select 1 from cr_log where detalhe like '%' || t_new || '%') then raise exception 'L6c token vazou em auditoria/log'; end if;
  if (select count(*) from cr_log where acao in ('prorrogou_link', 'novo_link') and usuario_id is not null) <> 2 then raise exception 'L6d cr_log'; end if;
  -- L7 signatário que já assinou não renova; depois de assinar o link novo continua o fluxo normal
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_assinar(t_new, img); if r->>'contrato_status' <> 'parcial' then raise exception 'L7a assinatura pelo link novo: %', r; end if;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_renovar_link(sb, 15, true); if r->>'erro' <> 'ja_assinado' then raise exception 'L7b %', r; end if;
  -- L8 recusado não renova
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status) values ('clt', 'CLT-L-0001', 'CLT — Bia', 'Bia', 'enviado') returning id into cid2;
  insert into cr_signatarios (contrato_id, nome, papel, token, status) values (cid2, 'Bia', 'candidato', 'tkC', 'recusado') returning id into sc;
  r := cr_renovar_link(sc, 15, false); if r->>'erro' <> 'ja_recusado' then raise exception 'L8 %', r; end if;
  -- L9 contrato cancelado: nada de renovar
  update cr_contratos set status = 'cancelado' where id = cid2;
  update cr_signatarios set status = 'pendente' where id = sc;
  r := cr_renovar_link(sc, 15, true); if r->>'erro' <> 'cancelado' then raise exception 'L9 %', r; end if;
  if (select token from cr_signatarios where id = sc) <> 'tkC' then raise exception 'L9b token mudou em contrato cancelado'; end if;
  raise notice 'LINK PRAZO SQL: 23 verificações OK (vencido, prorrogar, link novo revoga o antigo, auditoria sem token, cancelado, assinado, recusado)';
end $$;
do $$ begin
  begin set local role anon; perform cr_renovar_link(1, 15, false); raise exception 'anon executou cr_renovar_link';
  exception when insufficient_privilege then null; end;
  raise notice 'LINK PRAZO SQL: anon bloqueado (sem permissão de execução) OK';
end $$;
