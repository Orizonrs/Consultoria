-- R20 (M12): reabrir assinatura de quem recusou.
\set ON_ERROR_STOP on
set client_min_messages = notice;
truncate cr_signatarios, cr_contratos, cr_auditoria, cr_contadores, cr_log restart identity cascade;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
do $$
declare cid bigint; sa bigint; sb bigint; sc bigint; r json; t_new text; img text := repeat('A', 200); exp timestamptz; cid2 bigint;
begin
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status) values ('estagio', 'TCE-R-0001', 'TCE — Ana', 'Ana', 'enviado') returning id into cid;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Orizon', 'empresa_nexus', 'tkO') returning id into sa;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cid, 'Ana', 'candidato', 'tkA') returning id into sb;
  -- Ana recusa pelo link (visitante)
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_recusar('tkA', 'Valor errado'); if (r->>'ok')::boolean is not true then raise exception 'R0 %', r; end if;
  r := cr_assinar('tkA', img); if r->>'erro' is distinct from 'recusado' then raise exception 'R1 recusado assinou: %', r; end if;
  begin perform cr_reabrir_signatario(sb, 15); raise exception 'R2 visitante reabriu'; exception when others then if sqlerrm not like '%autenticado%' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_reabrir_signatario(sb, 0);   if r->>'erro' is distinct from 'dias_invalido' then raise exception 'R3a %', r; end if;
  r := cr_reabrir_signatario(sb, 61);  if r->>'erro' is distinct from 'dias_invalido' then raise exception 'R3b %', r; end if;
  r := cr_reabrir_signatario(99999, 15); if r->>'erro' is distinct from 'signatario_inexistente' then raise exception 'R3c %', r; end if;
  r := cr_reabrir_signatario(sa, 15);  if r->>'erro' is distinct from 'nao_recusado' then raise exception 'R4 pendente reaberto: %', r; end if;
  -- reabrir de verdade
  r := cr_reabrir_signatario(sb, 10); t_new := r->>'token';
  if (r->>'ok')::boolean is not true or t_new = 'tkA' or t_new !~ '^[0-9a-f]{64}$' then raise exception 'R5a %', r; end if;
  select expira_em into exp from cr_signatarios where id = sb;
  if exp < now() + interval '9 days 23 hours' or exp > now() + interval '10 days 1 hour' then raise exception 'R5b prazo %', exp; end if;
  if (select status from cr_signatarios where id = sb) <> 'pendente' or (select motivo_recusa from cr_signatarios where id = sb) is not null or (select recusado_em from cr_signatarios where id = sb) is not null then raise exception 'R5c estado'; end if;
  if (select status from cr_contratos where id = cid) <> 'enviado' then raise exception 'R5d status do contrato mudou'; end if;
  -- link antigo morreu; novo assina; contrato fecha
  perform set_config('request.jwt.claim.sub', '', false);
  r := cr_ler_por_token('tkA'); if r->>'erro' is distinct from 'token_invalido' then raise exception 'R6a antigo vale: %', r; end if;
  r := cr_assinar(t_new, img); if r->>'contrato_status' is distinct from 'parcial' then raise exception 'R6b %', r; end if;
  r := cr_assinar('tkO', img); if r->>'contrato_status' is distinct from 'assinado' then raise exception 'R6c %', r; end if;
  -- trilha: recusa antiga continua, reabertura registrada com o motivo, sem token
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  if (select count(*) from cr_auditoria where evento = 'recusou') <> 1 then raise exception 'R7a recusa sumiu da trilha'; end if;
  if (select count(*) from cr_auditoria where evento = 'reabriu_assinatura' and detalhe like 'Ana | 10 dias | recusa anterior: Valor errado') <> 1 then raise exception 'R7b'; end if;
  if exists (select 1 from cr_auditoria where detalhe like '%' || t_new || '%') or exists (select 1 from cr_log where detalhe like '%' || t_new || '%') then raise exception 'R7c token vazou'; end if;
  if (select count(*) from cr_log where acao = 'reabriu_assinatura') <> 1 then raise exception 'R7d cr_log'; end if;
  -- contrato assinado e contrato cancelado não reabrem
  r := cr_reabrir_signatario(sb, 15); if r->>'erro' is distinct from 'contrato_assinado' then raise exception 'R8a %', r; end if;
  insert into cr_contratos (tipo, numero_contrato, titulo, status) values ('clt', 'CLT-R-0001', 'CLT', 'enviado') returning id into cid2;
  insert into cr_signatarios (contrato_id, nome, papel, token, status, motivo_recusa) values (cid2, 'Bia', 'candidato', 'tkB', 'recusado', 'x') returning id into sc;
  update cr_contratos set status = 'cancelado' where id = cid2;
  r := cr_reabrir_signatario(sc, 15); if r->>'erro' is distinct from 'cancelado' then raise exception 'R8b %', r; end if;
  if (select status from cr_signatarios where id = sc) <> 'recusado' then raise exception 'R8c mudou em contrato cancelado'; end if;
  update cr_contratos set status = 'assinado' where id = cid2;
  r := cr_reabrir_signatario(sc, 15); if r->>'erro' is distinct from 'contrato_assinado' then raise exception 'R8d %', r; end if;
  raise notice 'REABRIR SQL: 22 verificações OK (recusa, reabrir, link antigo morre, trilha preservada, sem token, cancelado/assinado)';
end $$;
do $$ begin
  begin set local role anon; perform cr_reabrir_signatario(1, 15); raise exception 'anon executou';
  exception when insufficient_privilege then null; end;
  raise notice 'REABRIR SQL: anon bloqueado OK';
end $$;
