-- R34 (M6): retenção e anonimização LGPD no PostgreSQL real (com o stub do Supabase). Faz parte de tests/sql/rodar-m15.sh
-- Usuários: A (admin) e B (operador). CPFs de teste válidos: 529.982.247-25 e 111.444.777-35
grant select, insert, update, delete on cr_candidatos, cr_cartas, cr_carta_links, cr_contratos, cr_signatarios, cr_auditoria to authenticated;
grant select on cr_log to authenticated;
grant usage on all sequences in schema public to authenticated;
delete from cr_perfis;
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@x.com'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@x.com') on conflict (id) do update set email = excluded.email;
insert into cr_perfis (user_id, email, perfil) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@x.com', 'admin'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@x.com', 'operador');
delete from cr_log;
delete from cr_auditoria where contrato_id in (select id from cr_contratos where numero_contrato like 'RET-%');
delete from cr_signatarios where contrato_id in (select id from cr_contratos where numero_contrato like 'RET-%');
update cr_contratos set contrato_origem_id = null where numero_contrato like 'RET-%';
delete from cr_contratos where numero_contrato like 'RET-%';
delete from cr_cartas where numero_carta like 'RET-%';
delete from cr_carta_links where token like 'ret-%';
delete from cr_candidatos where lower(nome) like 'ret teste%' or cpf in ('52998224725', '11144477735');

-- contratos (periodo_fim e atualizado_em controlam a data de referência)
insert into cr_contratos (numero_contrato, tipo, status, nome_candidato, cpf, email_candidato, matricula, empresa, supervisor_nome, titulo, valor_bolsa, hash_documento, periodo_fim, atualizado_em) values
 ('RET-01', 'estagio', 'assinado',  'Ana Antiga',   '529.982.247-25', 'ana@ret.com', 'M1', 'Emp A', 'Sup A', 'TCE — Ana Antiga — Emp A', 1000, 'hash-c1', '2020-01-01', '2020-01-01'),
 ('RET-02', 'estagio', 'assinado',  'Bia Recente',  '111.444.777-35', 'bia@ret.com', 'M2', 'Emp B', 'Sup B', 'TCE — Bia Recente — Emp B', 900,  'hash-c2', current_date + 200, now()),
 ('RET-03', 'estagio', 'enviado',   'Caio Parado',  null,             'caio@ret.com', 'M3', 'Emp C', 'Sup C', 'TCE — Caio Parado — Emp C', 800, null, '2020-01-01', '2020-01-01'),
 ('RET-04', 'clt',     'cancelado', 'Dani Cancelada', null,           'dani@ret.com', null, 'Emp D', 'Sup D', 'Contrato CLT — Dani — Emp D', 700, null, '2020-02-01', '2020-02-01'),
 ('RET-05', 'estagio', 'assinado',  'Edu Com Aditivo', null,          'edu@ret.com', 'M5', 'Emp E', 'Sup E', 'TCE — Edu — Emp E', 600, 'hash-c5', '2020-03-01', '2020-03-01'),
 ('RET-06', 'estagio', 'enviado',   'Edu Com Aditivo', null,          'edu@ret.com', 'M5', 'Emp E', 'Sup E', 'TCE — Edu (aditivo)', 600, null, '2020-03-01', '2020-03-01'),
 ('RET-07', 'estagio', 'assinado',  'Fabi Cadeia',  null,             'fabi@ret.com', 'M7', 'Emp F', 'Sup F', 'TCE — Fabi — Emp F', 500, 'hash-c7', '2020-04-01', '2020-04-01'),
 ('RET-08', 'estagio', 'assinado',  'Fabi Cadeia',  null,             'fabi@ret.com', 'M7', 'Emp F', 'Sup F', 'TCE — Fabi (renov.) — Emp F', 500, 'hash-c8', '2020-05-01', '2020-05-01'),
 ('RET-09', 'estagio', 'assinado',  'Gui Alterado Hoje', null,        'gui@ret.com', 'M9', 'Emp G', 'Sup G', 'TCE — Gui — Emp G', 400, 'hash-c9', '2020-06-01', now());
update cr_contratos set contrato_origem_id = (select id from cr_contratos where numero_contrato = 'RET-05') where numero_contrato = 'RET-06';
update cr_contratos set contrato_origem_id = (select id from cr_contratos where numero_contrato = 'RET-07') where numero_contrato = 'RET-08';
-- o UPDATE acima de atualizado_em é refeito porque o gatilho/valores padrão não mexem nele, mas garantimos:
update cr_contratos set atualizado_em = '2020-03-01' where numero_contrato in ('RET-05', 'RET-06');
update cr_contratos set atualizado_em = '2020-05-01' where numero_contrato in ('RET-07', 'RET-08');

insert into cr_signatarios (contrato_id, nome, email, papel, token, status, ip, user_agent, assinatura_img, hash_assinatura, motivo_recusa)
select id, 'Ana Antiga', 'ana@ret.com', 'candidato', 'ret-tok-c1-cand', 'assinado', '200.1.1.1', 'Firefox', repeat('A', 200), 'hash-sig-cand', null from cr_contratos where numero_contrato = 'RET-01';
insert into cr_signatarios (contrato_id, nome, email, papel, token, status, ip, user_agent, assinatura_img, hash_assinatura)
select id, 'Sup A', 'supa@ret.com', 'supervisor', 'ret-tok-c1-sup', 'assinado', '200.1.1.2', 'Chrome', repeat('B', 200), 'hash-sig-sup' from cr_contratos where numero_contrato = 'RET-01';
insert into cr_signatarios (contrato_id, nome, email, papel, token, status) select id, 'Bia Recente', 'bia@ret.com', 'candidato', 'ret-tok-c2-cand', 'pendente' from cr_contratos where numero_contrato = 'RET-02';
insert into cr_signatarios (contrato_id, nome, email, papel, token, status, motivo_recusa) select id, 'Dani Cancelada', 'dani@ret.com', 'candidato', 'ret-tok-c4-cand', 'recusado', 'motivo pessoal' from cr_contratos where numero_contrato = 'RET-04';
insert into cr_auditoria (contrato_id, signatario_id, evento, detalhe, ip)
select c.id, s.id, 'assinou', 'Ana Antiga | hash-sig-cand', '200.1.1.1' from cr_contratos c join cr_signatarios s on s.contrato_id = c.id and s.papel = 'candidato' where c.numero_contrato = 'RET-01';
insert into cr_auditoria (contrato_id, evento, detalhe, ip) select id, 'visualizou', 'Ana Antiga', '200.1.1.1' from cr_contratos where numero_contrato = 'RET-01';
insert into cr_auditoria (contrato_id, evento, detalhe, ip) select id, 'visualizou', 'Bia Recente', '200.1.1.9' from cr_contratos where numero_contrato = 'RET-02';

-- cartas e links
insert into cr_cartas (numero_carta, nome, tipo, empresa, dados, status, criado_em) values
 ('RET-K1', 'Zeca Antigo', 'estagiario', 'Emp Z', '{"nome":"Zeca Antigo","cpf":"111.444.777-35","empresa":"Emp Z"}', 'emitida', '2020-01-01'),
 ('RET-K2', 'Hugo Recente', 'estagiario', 'Emp H', '{"nome":"Hugo Recente","cpf":"000.000.000-00","empresa":"Emp H"}', 'emitida', now());
insert into cr_carta_links (token, payload, expira_em, assinado_em, assinatura, ip_assinatura, user_agent, hash_conteudo) values
 ('ret-lk-vencido40', '{"nome":"X"}', now() - interval '40 days', null, null, null, null, null),
 ('ret-lk-vencido5',  '{"nome":"X"}', now() - interval '5 days', null, null, null, null, null),
 ('ret-lk-assin-velho', '{"nome":"Y"}', now() - interval '3000 days', now() - interval '3000 days', '{"img":"abc"}', '9.9.9.9', 'Safari', 'hash-link'),
 ('ret-lk-assin-novo',  '{"nome":"Y"}', now() + interval '10 days', now(), '{"img":"abc"}', '9.9.9.9', 'Safari', 'hash-link2');

insert into cr_candidatos (nome, cpf, email) values ('Ret Teste Titular', '529.982.247-25', 'titular@ret.com'), ('Ret Teste Outro', '111.444.777-35', null);

do $$
declare n int := 0; ok boolean; j json; c int; r record;
begin
  -- ===== operador e visitante =====
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
  set local role authenticated;
  begin perform cr_retencao_resumo(12); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [R01 operador não vê o resumo da retenção]'; end if; n := n + 1;
  begin perform cr_retencao_aplicar(12); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [R02 operador não aplica retenção]'; end if; n := n + 1;
  begin perform cr_titular_buscar('529.982.247-25'); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [R03 operador não busca titular]'; end if; n := n + 1;
  begin perform cr_titular_anonimizar('529.982.247-25'); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [R04 operador não anonimiza titular]'; end if; n := n + 1;
  if (select nome_candidato from cr_contratos where numero_contrato = 'RET-01') <> 'Ana Antiga' then raise exception 'FALHOU [R05 nada mudou após as tentativas do operador]'; end if; n := n + 1;

  -- ===== admin: resumo =====
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  begin perform cr_retencao_resumo(5); j := cr_retencao_resumo(5); if (j->>'erro') is distinct from 'meses_invalido' then raise exception 'x'; end if; ok := true; exception when others then ok := false; end;
  if not ok then raise exception 'FALHOU [R06 prazo menor que 6 meses recusado]'; end if; n := n + 1;
  if (cr_retencao_resumo(241)->>'erro') is distinct from 'meses_invalido' or (cr_retencao_resumo(null)->>'erro') is distinct from 'meses_invalido' then raise exception 'FALHOU [R07 prazo maior que 240 ou vazio recusado]'; end if; n := n + 1;
  if (cr_retencao_aplicar(5)->>'erro') is distinct from 'meses_invalido' or (cr_retencao_aplicar(241)->>'erro') is distinct from 'meses_invalido' or (cr_retencao_aplicar(null)->>'erro') is distinct from 'meses_invalido' then raise exception 'FALHOU [R07b aplicar também recusa prazo fora de 6-240]'; end if; n := n + 1;
  if exists (select 1 from cr_contratos where numero_contrato like 'RET-%' and anonimizado_em is not null) then raise exception 'FALHOU [R07c prazo recusado não anonimiza nada]'; end if; n := n + 1;
  j := cr_retencao_resumo(12);
  if (j->>'contratos')::int <> 4 then raise exception 'FALHOU [R08 resumo: 4 contratos elegíveis (01, 04, 07, 08); veio %]', j->>'contratos'; end if; n := n + 1;
  if (j->>'cartas')::int <> 1 or (j->>'links_vencidos')::int <> 1 or (j->>'links_assinados')::int <> 1 then raise exception 'FALHOU [R09 resumo de cartas e links: %]', j::text; end if; n := n + 1;
  if (select nome_candidato from cr_contratos where numero_contrato = 'RET-01') <> 'Ana Antiga' then raise exception 'FALHOU [R10 resumo não altera nada]'; end if; n := n + 1;
  if j::text ~* 'ana|529|ret\.com' then raise exception 'FALHOU [R11 resumo não devolve dado pessoal]'; end if; n := n + 1;

  -- ===== admin: aplicar =====
  j := cr_retencao_aplicar(12);
  if (j->>'contratos')::int <> 4 or (j->>'cartas')::int <> 1 or (j->>'links_apagados')::int <> 1 or (j->>'links_anonimizados')::int <> 1 then raise exception 'FALHOU [R12 aplicar devolveu %]', j::text; end if; n := n + 1;
  select * into r from cr_contratos where numero_contrato = 'RET-01';
  if r.nome_candidato <> 'Titular anonimizado' or r.cpf is not null or r.email_candidato is not null or r.matricula is not null or r.anonimizado_em is null then raise exception 'FALHOU [R13 contrato 01 perdeu os dados pessoais]'; end if; n := n + 1;
  if r.supervisor_nome <> 'Supervisor anonimizado' or r.titulo <> 'TCE — Titular anonimizado — Emp A' then raise exception 'FALHOU [R14 supervisor e título anonimizados: %]', r.titulo; end if; n := n + 1;
  if r.numero_contrato <> 'RET-01' or r.status <> 'assinado' or r.hash_documento <> 'hash-c1' or r.valor_bolsa <> 1000 or r.empresa <> 'Emp A' then raise exception 'FALHOU [R15 número, status, hash, valor e empresa preservados]'; end if; n := n + 1;
  select count(*) into c from cr_signatarios s join cr_contratos k on k.id = s.contrato_id where k.numero_contrato = 'RET-01'
     and s.nome = 'Signatário anonimizado' and s.email is null and s.token is null and s.ip is null and s.user_agent is null and s.assinatura_img is null;
  if c <> 2 then raise exception 'FALHOU [R16 os 2 signatários do contrato 01 anonimizados, veio %]', c; end if; n := n + 1;
  if (select count(*) from cr_signatarios s join cr_contratos k on k.id = s.contrato_id where k.numero_contrato = 'RET-01' and s.hash_assinatura in ('hash-sig-cand', 'hash-sig-sup') and s.status = 'assinado') <> 2 then raise exception 'FALHOU [R17 hash e status das assinaturas preservados]'; end if; n := n + 1;
  if exists (select 1 from cr_signatarios where papel = 'candidato' and contrato_id = (select id from cr_contratos where numero_contrato = 'RET-04') and (motivo_recusa is not null or nome <> 'Signatário anonimizado')) then raise exception 'FALHOU [R18 motivo da recusa limpo no cancelado]'; end if; n := n + 1;
  if exists (select 1 from cr_auditoria a join cr_contratos k on k.id = a.contrato_id where k.numero_contrato = 'RET-01' and (a.ip is not null or a.detalhe ~* 'ana')) then raise exception 'FALHOU [R19 auditoria sem IP nem nome]'; end if; n := n + 1;
  if (select detalhe from cr_auditoria a join cr_contratos k on k.id = a.contrato_id where k.numero_contrato = 'RET-01' and a.evento = 'assinou') <> '[anonimizado] | hash-sig-cand' then raise exception 'FALHOU [R20 evento assinou guarda só o hash]'; end if; n := n + 1;
  if (select detalhe from cr_auditoria a join cr_contratos k on k.id = a.contrato_id where k.numero_contrato = 'RET-01' and a.evento = 'visualizou') <> '[anonimizado]' then raise exception 'FALHOU [R21 demais eventos viram [anonimizado]]'; end if; n := n + 1;
  if (select count(*) from cr_contratos where numero_contrato in ('RET-04', 'RET-07', 'RET-08') and anonimizado_em is not null) <> 3 then raise exception 'FALHOU [R22 cancelado e a cadeia assinada/assinada anonimizados]'; end if; n := n + 1;
  if (select count(*) from cr_contratos where numero_contrato in ('RET-02', 'RET-03', 'RET-05', 'RET-06', 'RET-09') and (anonimizado_em is not null or nome_candidato like '%anonimizado%')) <> 0 then raise exception 'FALHOU [R23 recente, em andamento, com aditivo em andamento e alterado hoje NÃO entram]'; end if; n := n + 1;
  if (select token from cr_signatarios where contrato_id = (select id from cr_contratos where numero_contrato = 'RET-02')) <> 'ret-tok-c2-cand' then raise exception 'FALHOU [R24 link do contrato recente continua valendo]'; end if; n := n + 1;
  if (select nome from cr_cartas where numero_carta = 'RET-K1') <> 'Titular anonimizado' or (select dados::text from cr_cartas where numero_carta = 'RET-K1') ~* 'zeca|111' then raise exception 'FALHOU [R25 carta antiga esvaziada]'; end if; n := n + 1;
  if (select nome from cr_cartas where numero_carta = 'RET-K2') <> 'Hugo Recente' then raise exception 'FALHOU [R26 carta recente intacta]'; end if; n := n + 1;
  if exists (select 1 from cr_carta_links where token = 'ret-lk-vencido40') or not exists (select 1 from cr_carta_links where token = 'ret-lk-vencido5') then raise exception 'FALHOU [R27 só o link vencido há mais de 30 dias é apagado]'; end if; n := n + 1;
  select * into r from cr_carta_links where token = 'ret-lk-assin-velho';
  if r.payload <> '{}'::jsonb or r.assinatura is not null or r.ip_assinatura is not null or r.user_agent is not null or r.hash_conteudo <> 'hash-link' or r.anonimizado_em is null then raise exception 'FALHOU [R28 link assinado antigo guarda só o hash]'; end if; n := n + 1;
  if (select payload from cr_carta_links where token = 'ret-lk-assin-novo') = '{}'::jsonb then raise exception 'FALHOU [R29 link assinado recente intacto]'; end if; n := n + 1;
  j := cr_retencao_aplicar(12);
  if (j->>'contratos')::int <> 0 or (j->>'cartas')::int <> 0 or (j->>'links_apagados')::int <> 0 or (j->>'links_anonimizados')::int <> 0 then raise exception 'FALHOU [R30 rodar de novo não faz nada: %]', j::text; end if; n := n + 1;

  -- ===== log sem dado pessoal =====
  select count(*) into c from cr_log where acao = 'retencao_aplicada';
  if c <> 2 then raise exception 'FALHOU [R31 duas aplicações = duas linhas no histórico, veio %]', c; end if; n := n + 1;
  if exists (select 1 from cr_log where (coalesce(referencia, '') || coalesce(detalhe, '')) ~* 'ana|529|ret\.com|titular@') then raise exception 'FALHOU [R32 o histórico leva só contagens (RN-10)]'; end if; n := n + 1;

  -- ===== movimento de contrato anonimizado =====
  begin insert into cr_contratos (numero_contrato, tipo, status, contrato_origem_id) values ('RET-10', 'estagio', 'enviado', (select id from cr_contratos where numero_contrato = 'RET-01')); ok := false; exception when sqlstate '23514' then ok := true; end;
  reset role;
  if not ok then raise exception 'FALHOU [R33 não nasce movimento de contrato anonimizado]'; end if; n := n + 1;
  insert into cr_contratos (numero_contrato, tipo, status, contrato_origem_id) values ('RET-10', 'estagio', 'enviado', (select id from cr_contratos where numero_contrato = 'RET-02'));
  n := n + 1;  -- R34 contrato normal ainda aceita movimento

  raise notice 'RETENCAO SQL: % verificações OK (admin só, prazo 6-240, elegibilidade, anonimização, hash preservado, log só com contagens)', n;
end $$;

do $$
declare n int := 0; ok boolean; j json; c int;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  set local role authenticated;
  -- ===== titular =====
  -- preparo (como admin, via função): um contrato EM ANDAMENTO e um assinado novo do mesmo CPF não saem do lugar de graça
  reset role;
  insert into cr_contratos (numero_contrato, tipo, status, nome_candidato, cpf, email_candidato, matricula, empresa, titulo) values
    ('RET-20', 'estagio', 'assinado', 'Titular Um', '111.444.777-35', 'tit@ret.com', 'MT', 'Emp T', 'TCE — Titular Um — Emp T'),
    ('RET-21', 'estagio', 'enviado',  'Titular Um', '111.444.777-35', 'tit@ret.com', 'MT', 'Emp T', 'TCE — Titular Um (2) — Emp T');
  insert into cr_signatarios (contrato_id, nome, email, papel, token, status, ip)
    select id, 'Titular Um', 'tit@ret.com', 'candidato', 'ret-tok-c20-cand', 'assinado', '1.2.3.4' from cr_contratos where numero_contrato = 'RET-20';
  insert into cr_signatarios (contrato_id, nome, email, papel, token, status)
    select id, 'Supervisor T', 'supt@ret.com', 'supervisor', 'ret-tok-c20-sup', 'assinado' from cr_contratos where numero_contrato = 'RET-20';
  set local role authenticated;

  j := cr_titular_buscar('111.444.777-35');
  if (j->>'contratos')::int <> 2 or (j->>'contratos_andamento')::int <> 1 or (j->>'cartas')::int <> 0 or (j->>'candidatos')::int <> 1 then raise exception 'FALHOU [R35 busca conta: %]', j::text; end if; n := n + 1;
  if j::text ~* '111|444|777|tit@|Titular Um' then raise exception 'FALHOU [R36 a busca não devolve CPF nem nome]'; end if; n := n + 1;
  if (cr_titular_buscar('123.456.789-00')->>'erro') is distinct from 'cpf_invalido' or (cr_titular_buscar(null)->>'erro') is distinct from 'cpf_invalido' then raise exception 'FALHOU [R37 CPF inválido ou vazio recusado]'; end if; n := n + 1;
  if (select nome_candidato from cr_contratos where numero_contrato = 'RET-20') <> 'Titular Um' then raise exception 'FALHOU [R38 buscar não altera]'; end if; n := n + 1;
  j := cr_titular_anonimizar('111.444.777-35');
  if (j->>'contratos')::int <> 2 or (j->>'cartas')::int <> 0 or (j->>'candidatos')::int <> 1 then raise exception 'FALHOU [R39 anonimizar devolveu %]', j::text; end if; n := n + 1;
  if j::text ~* '111|444|777' then raise exception 'FALHOU [R40 a resposta não devolve o CPF]'; end if; n := n + 1;
  if (select cpf from cr_contratos where numero_contrato = 'RET-20') is not null or (select nome_candidato from cr_contratos where numero_contrato = 'RET-20') <> 'Titular anonimizado' then raise exception 'FALHOU [R41 contrato do titular anonimizado]'; end if; n := n + 1;
  if (select nome from cr_signatarios where token is null and contrato_id = (select id from cr_contratos where numero_contrato = 'RET-20') and papel = 'candidato') <> 'Signatário anonimizado' then raise exception 'FALHOU [R42 signatário candidato anonimizado]'; end if; n := n + 1;
  if (select nome from cr_signatarios where papel = 'supervisor' and contrato_id = (select id from cr_contratos where numero_contrato = 'RET-20')) <> 'Supervisor T' then raise exception 'FALHOU [R43 pedido do titular NÃO apaga o nome de outras pessoas do contrato]'; end if; n := n + 1;
  if (select nome_candidato from cr_contratos where numero_contrato = 'RET-21') <> 'Titular Um' or (select anonimizado_em from cr_contratos where numero_contrato = 'RET-21') is not null then raise exception 'FALHOU [R44 contrato em andamento NÃO é tocado]'; end if; n := n + 1;
  if exists (select 1 from cr_candidatos where regexp_replace(coalesce(cpf, ''), '\D', '', 'g') = '11144477735') then raise exception 'FALHOU [R45 candidato com esse CPF excluído de verdade]'; end if; n := n + 1;
  if not exists (select 1 from cr_candidatos where lower(nome) = 'ret teste titular') then raise exception 'FALHOU [R46 candidato de outro CPF fica]'; end if; n := n + 1;
  if (select nome from cr_cartas where numero_carta = 'RET-K2') <> 'Hugo Recente' then raise exception 'FALHOU [R47 carta de outro CPF fica]'; end if; n := n + 1;
  if not exists (select 1 from cr_log where acao = 'titular_anonimizado') then raise exception 'FALHOU [R48 pedido do titular entra no histórico]'; end if; n := n + 1;
  if exists (select 1 from cr_log where acao = 'titular_anonimizado' and (coalesce(referencia, '') || coalesce(detalhe, '')) ~ '111|444|777|Titular Um|tit@') then raise exception 'FALHOU [R49 o histórico do titular não leva CPF, nome nem e-mail (RN-10)]'; end if; n := n + 1;
  j := cr_titular_anonimizar('111.444.777-35');
  if (j->>'contratos')::int <> 0 or (j->>'candidatos')::int <> 0 then raise exception 'FALHOU [R50 repetir não faz nada]'; end if; n := n + 1;
  -- carta com CPF formatado diferente da busca
  reset role;
  insert into cr_cartas (numero_carta, nome, dados) values ('RET-K3', 'Zeca Dois', '{"cpf":"529.982.247-25"}');
  set local role authenticated;
  if (cr_titular_buscar('52998224725')->>'cartas')::int <> 1 then raise exception 'FALHOU [R51 CPF só com dígitos acha carta gravada com máscara]'; end if; n := n + 1;
  j := cr_titular_anonimizar('52998224725');
  if (select nome from cr_cartas where numero_carta = 'RET-K3') <> 'Titular anonimizado' then raise exception 'FALHOU [R52 carta do titular esvaziada]'; end if; n := n + 1;
  reset role;
  raise notice 'TITULAR SQL: % verificações OK (busca só conta, anonimiza só o titular, em andamento intacto, candidato excluído, log sem CPF)', n;
end $$;

do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '', false);
  set local role anon;
  begin perform cr_retencao_resumo(12); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [R53 anon não executa cr_retencao_resumo]'; end if;
  begin perform cr_retencao_aplicar(12); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [R54 anon não executa cr_retencao_aplicar]'; end if;
  begin perform cr_titular_buscar('111.444.777-35'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [R55 anon não executa cr_titular_buscar]'; end if;
  begin perform cr_titular_anonimizar('111.444.777-35'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [R56 anon não executa cr_titular_anonimizar]'; end if;
  begin perform cr_contratos_retencao(12); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [R57 anon não executa a função interna]'; end if;
  reset role;
  raise notice 'RETENCAO SQL: anon bloqueado OK';
end $$;
