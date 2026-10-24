-- R26 (M11): ordem de assinatura sequencial e registro de lembrete.
\set ON_ERROR_STOP on
set client_min_messages = notice;
truncate cr_signatarios, cr_contratos, cr_auditoria, cr_contadores, cr_log restart identity cascade;
do $$ begin perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); end $$;
do $$
declare cid bigint; cl bigint; s1 bigint; s2 bigint; s3 bigint; s4 bigint; sl bigint; r json; img text := repeat('A', 200);
begin
  -- contrato sequencial: 1 Orizon, 2 Ana, 3 Chefe e 3 Escola (mesma ordem = juntos)
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status, ordem_assinatura) values ('estagio', 'TCE-O-0001', 'TCE — Ana', 'Ana', 'enviado', 'sequencial') returning id into cid;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cid, 'Orizon', 'empresa_nexus', 'o1', 1) returning id into s1;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cid, 'Ana', 'candidato', 'o2', 2) returning id into s2;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cid, 'Chefe', 'supervisor', 'o3', 3) returning id into s3;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cid, 'Escola', 'instituicao', 'o4', 3) returning id into s4;
  -- contrato livre (padrão): ordem é ignorada
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status) values ('clt', 'CLT-O-0001', 'CLT — Bia', 'Bia', 'enviado') returning id into cl;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cl, 'Orizon', 'empresa_nexus', 'l1', 1);
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cl, 'Bia', 'candidato', 'l2', 2) returning id into sl;

  perform set_config('request.jwt.claim.sub', '', false);
  -- O1 default do contrato é 'livre'
  if (select ordem_assinatura from cr_contratos where id = cl) <> 'livre' then raise exception 'O1 padrão não é livre'; end if;
  -- O2 fora da vez: não assina e informa quem falta; nada muda
  r := cr_assinar('o2', img); if r->>'erro' <> 'aguardando_vez' or r->>'aguardando' <> 'Orizon' then raise exception 'O2a %', r; end if;
  r := cr_assinar('o3', img); if r->>'erro' <> 'aguardando_vez' or r->>'aguardando' <> 'Orizon' then raise exception 'O2b (3º espera o 1º) %', r; end if;
  if exists (select 1 from cr_signatarios where contrato_id = cid and status <> 'pendente') or (select status from cr_contratos where id = cid) <> 'enviado' then raise exception 'O2c algo mudou'; end if;
  -- O3 fora da vez também não recusa
  r := cr_recusar('o2', 'x'); if r->>'erro' <> 'aguardando_vez' then raise exception 'O3 recusou fora da vez: %', r; end if;
  -- O4 leitura: mostra ordem e quem falta; ainda abre o documento
  r := cr_ler_por_token('o2');
  if (r->'signatario'->>'ordem')::int <> 2 or r->'signatario'->>'aguardando' <> 'Orizon' or r->'contrato'->>'ordem_assinatura' <> 'sequencial' then raise exception 'O4a %', r; end if;
  if (r->'signatarios'->0->>'nome') <> 'Orizon' or json_array_length(r->'signatarios') <> 4 then raise exception 'O4b lista fora de ordem: %', r->'signatarios'; end if;
  r := cr_ler_por_token('o1'); if r->'signatario'->>'aguardando' is not null then raise exception 'O4c 1º não deveria aguardar: %', r; end if;
  -- O5 1º assina -> 2º libera; 3º e 4º ainda esperam o 2º
  r := cr_assinar('o1', img); if (r->>'ok')::boolean is not true then raise exception 'O5a %', r; end if;
  r := cr_assinar('o3', img); if r->>'erro' <> 'aguardando_vez' or r->>'aguardando' <> 'Ana' then raise exception 'O5b %', r; end if;
  r := cr_assinar('o2', img); if (r->>'ok')::boolean is not true or r->>'contrato_status' <> 'parcial' then raise exception 'O5c %', r; end if;
  -- O6 mesma ordem assina junto, em qualquer ordem entre si
  r := cr_assinar('o4', img); if (r->>'ok')::boolean is not true then raise exception 'O6a %', r; end if;
  r := cr_assinar('o3', img); if r->>'contrato_status' <> 'assinado' then raise exception 'O6b %', r; end if;
  -- O7 contrato livre: qualquer um assina, mesmo com ordem preenchida
  r := cr_assinar('l2', img); if (r->>'ok')::boolean is not true then raise exception 'O7 livre bloqueou: %', r; end if;
  -- O8 recusado de ordem menor bloqueia os seguintes até ser reaberto
  update cr_contratos set status = 'enviado' where id = cid;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem, status) values (cid, 'Antes', 'supervisor', 'o0', 0, 'recusado');
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status, ordem_assinatura) values ('clt', 'CLT-O-0002', 'CLT — Caio', 'Caio', 'enviado', 'sequencial') returning id into cl;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem, status) values (cl, 'Orizon', 'empresa_nexus', 'q1', 1, 'recusado');
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cl, 'Caio', 'candidato', 'q2', 2) returning id into sl;
  r := cr_assinar('q2', img); if r->>'erro' <> 'aguardando_vez' or r->>'aguardando' <> 'Orizon' then raise exception 'O8 recusado não bloqueou: %', r; end if;
  -- O9 ordem nula no contrato sequencial não bloqueia (dado antigo)
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status, ordem_assinatura) values ('clt', 'CLT-O-0003', 'CLT — Duda', 'Duda', 'enviado', 'sequencial') returning id into cl;
  insert into cr_signatarios (contrato_id, nome, papel, token) values (cl, 'Duda', 'candidato', 'n1');
  r := cr_assinar('n1', img); if (r->>'ok')::boolean is not true then raise exception 'O9 %', r; end if;
  -- O10 constraint
  begin insert into cr_contratos (tipo, numero_contrato, titulo, ordem_assinatura) values ('clt', 'X', 'x', 'aleatoria'); raise exception 'O10 aceitou ordem inválida';
  exception when check_violation then null; end;
  raise notice 'ORDEM SQL: 17 verificações OK (sequencial bloqueia assinar e recusar, mesma ordem junto, livre ignora, recusado bloqueia, dado antigo)';
end $$;

-- Lembretes
do $$
declare cid bigint; a bigint; b bigint; c bigint; d bigint; e bigint; r json; seq bigint;
begin
  truncate cr_signatarios, cr_contratos, cr_auditoria, cr_log restart identity cascade;
  insert into cr_contratos (tipo, numero_contrato, titulo, nome_candidato, status, ordem_assinatura) values ('estagio', 'TCE-R-0001', 'TCE — Ana', 'Ana', 'enviado', 'sequencial') returning id into cid;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cid, 'Orizon', 'empresa_nexus', 'r1', 1) returning id into a;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem) values (cid, 'Ana', 'candidato', 'r2', 2) returning id into b;
  insert into cr_signatarios (contrato_id, nome, papel, token, ordem, expira_em) values (cid, 'Velho', 'supervisor', 'r3', 1, now() - interval '1 day') returning id into c;
  -- R1 visitante não registra lembrete
  perform set_config('request.jwt.claim.sub', '', false);
  begin perform cr_registrar_lembrete(a, 'whatsapp'); raise exception 'R1 visitante registrou'; exception when others then if sqlerrm not like '%autenticado%' then raise; end if; end;
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  -- R2 canal inválido / inexistente
  r := cr_registrar_lembrete(a, 'sms'); if r->>'erro' <> 'canal_invalido' then raise exception 'R2a %', r; end if;
  r := cr_registrar_lembrete(a, null); if r->>'erro' <> 'canal_invalido' then raise exception 'R2b %', r; end if;
  r := cr_registrar_lembrete(999999, 'link'); if r->>'erro' <> 'signatario_inexistente' then raise exception 'R2c %', r; end if;
  -- R3 quem está na vez: registra, conta e audita
  r := cr_registrar_lembrete(a, 'whatsapp');
  if (r->>'ok')::boolean is not true or (r->>'lembretes_qtd')::int <> 1 then raise exception 'R3a %', r; end if;
  r := cr_registrar_lembrete(a, 'email'); if (r->>'lembretes_qtd')::int <> 2 then raise exception 'R3b %', r; end if;
  if (select lembretes_qtd from cr_signatarios where id = a) <> 2 or (select lembrete_em from cr_signatarios where id = a) is null then raise exception 'R3c coluna'; end if;
  if (select count(*) from cr_auditoria where evento = 'lembrete' and detalhe = 'Orizon | whatsapp | nº 1') <> 1 or (select count(*) from cr_auditoria where evento = 'lembrete') <> 2 then raise exception 'R3d auditoria'; end if;
  if (select count(*) from cr_log where acao = 'lembrete' and usuario_id is not null) <> 2 then raise exception 'R3e cr_log'; end if;
  if exists (select 1 from cr_auditoria where detalhe like '%r1%' or detalhe like '%r2%') or exists (select 1 from cr_log where detalhe like '%r1%') then raise exception 'R3f token vazou'; end if;
  -- R4 fora da vez: não lembra (a pessoa ainda nem pode assinar)
  r := cr_registrar_lembrete(b, 'whatsapp'); if r->>'erro' <> 'aguardando_vez' or r->>'aguardando' <> 'Orizon' then raise exception 'R4 %', r; end if;
  if (select coalesce(lembretes_qtd, 0) from cr_signatarios where id = b) <> 0 then raise exception 'R4b contou'; end if;
  -- R5 link vencido: manda renovar primeiro; o token não muda
  r := cr_registrar_lembrete(c, 'link'); if r->>'erro' <> 'link_vencido' then raise exception 'R5 %', r; end if;
  -- R6 assinou -> não lembra; vira a vez do próximo
  perform set_config('request.jwt.claim.sub', '', false);
  perform cr_assinar('r1', repeat('A', 200));
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_registrar_lembrete(a, 'link'); if r->>'erro' <> 'ja_assinado' then raise exception 'R6a %', r; end if;
  -- (Velho, ordem 1, ainda pendente com link vencido bloqueia a Ana; renova e assina para liberar)
  r := cr_registrar_lembrete(b, 'link'); if r->>'erro' <> 'aguardando_vez' or r->>'aguardando' <> 'Velho' then raise exception 'R6b %', r; end if;
  perform cr_renovar_link(c, 7, false);
  perform set_config('request.jwt.claim.sub', '', false);
  perform cr_assinar('r3', repeat('A', 200));
  perform set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
  r := cr_registrar_lembrete(b, 'link'); if (r->>'ok')::boolean is not true then raise exception 'R6c vez chegou: %', r; end if;
  -- R7 cancelado
  update cr_contratos set status = 'cancelado' where id = cid;
  r := cr_registrar_lembrete(b, 'link'); if r->>'erro' <> 'cancelado' then raise exception 'R7 %', r; end if;
  raise notice 'LEMBRETE SQL: 17 verificações OK (visitante, canal, vez, link vencido, assinado, cancelado, auditoria sem token)';
end $$;
do $$ begin
  begin set local role anon; perform cr_registrar_lembrete(1, 'link'); raise exception 'anon executou cr_registrar_lembrete';
  exception when insufficient_privilege then null; end;
  begin set local role anon; perform cr_sig_bloqueador(1); raise exception 'anon executou cr_sig_bloqueador';
  exception when insufficient_privilege then null; end;
  raise notice 'ORDEM/LEMBRETE SQL: anon bloqueado nas funções internas OK';
end $$;
