-- R40 (M6 + M16): a retenção LGPD e o pedido do titular CONTAM os anexos que serão apagados (antes e depois), no PostgreSQL real (com o stub do Supabase).
-- Faz parte de tests/sql/rodar-m15.sh. Usuários: A (admin) e B (operador). Prefixo dos dados: RAX-. CPF de teste válido: 123.456.789-09
-- Os números globais (outros testes deixam dados no banco) são comparados por DIFERENÇA ou contra a contagem real das tabelas.
grant select, insert, update, delete on cr_candidatos, cr_cartas, cr_carta_links, cr_contratos, cr_signatarios, cr_auditoria to authenticated;
grant select on cr_log to authenticated;
grant usage on all sequences in schema public to authenticated;
delete from cr_perfis;
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@x.com'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@x.com') on conflict (id) do update set email = excluded.email;
insert into cr_perfis (user_id, email, perfil) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@x.com', 'admin'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@x.com', 'operador');
delete from cr_log;
delete from cr_cartas where numero_carta like 'RAX-%';
update cr_contratos set contrato_origem_id = null where numero_contrato like 'RAX-%';
delete from cr_contratos where numero_contrato like 'RAX-%';
delete from cr_candidatos where cpf = '12345678909';

do $$
declare n int := 0; ok boolean; j json; b json; r json;
  k1 bigint; k2 bigint; k3 bigint; c1 bigint; c2 bigint; c3 bigint; c4 bigint; c5 bigint;
  antes_c bigint; antes_k bigint; dep_c bigint; dep_k bigint;
  -- cada arquivo precisa ser DIFERENTE (o servidor recusa o mesmo conteúdo duas vezes no mesmo contrato/carta)
  f1 text := encode('%PDF-1.4 arquivo um'::bytea, 'base64');
  f2 text := encode('%PDF-1.4 arquivo dois'::bytea, 'base64');
  f3 text := encode('%PDF-1.4 arquivo tres'::bytea, 'base64');
  f4 text := encode('%PDF-1.4 arquivo quatro'::bytea, 'base64');
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);

  -- ===== linha de base (admin, antes de criar os dados deste teste) =====
  set local role authenticated;
  b := cr_retencao_resumo(12);
  if (b ->> 'anexos_contratos') is null or (b ->> 'anexos_cartas') is null then raise exception 'FALHOU [X01 o resumo devolve as contagens de anexos: %]', b; end if; n := n + 1;
  reset role;

  -- ===== dados =====
  insert into cr_contratos (numero_contrato, tipo, status, nome_candidato, cpf, empresa, titulo, periodo_fim, atualizado_em) values
    ('RAX-01', 'estagio', 'assinado', 'Rax Antigo',    '123.456.789-09', 'Emp R', 'TCE — Rax Antigo — Emp R', '2020-01-01', '2020-01-01'),
    ('RAX-02', 'estagio', 'assinado', 'Rax Recente',   null,             'Emp R', 'TCE — Rax Recente — Emp R', current_date + 200, now()),
    ('RAX-03', 'estagio', 'enviado',  'Rax Andamento', '123.456.789-09', 'Emp R', 'TCE — Rax Andamento — Emp R', '2020-01-01', '2020-01-01');
  update cr_contratos set atualizado_em = '2020-01-01' where numero_contrato in ('RAX-01', 'RAX-03');
  select id into c1 from cr_contratos where numero_contrato = 'RAX-01';
  select id into c2 from cr_contratos where numero_contrato = 'RAX-02';
  select id into c3 from cr_contratos where numero_contrato = 'RAX-03';
  insert into cr_cartas (numero_carta, nome, tipo_doc, dados, criado_em) values ('RAX-K1', 'Rax Carta Antiga', 'carta_recomendacao', '{"cpf":"123.456.789-09"}', '2020-01-01') returning id into k1;
  insert into cr_cartas (numero_carta, nome, tipo_doc, dados) values ('RAX-K2', 'Rax Carta Recente', 'carta_recomendacao', '{"cpf":"000.000.000-00"}') returning id into k2;
  insert into cr_candidatos (nome, cpf) values ('Rax Candidato', '123.456.789-09');

  set local role authenticated;
  perform cr_anexo_adicionar(c1, 'documento_pessoal', 'rg-secreto.pdf', f1);
  perform cr_anexo_adicionar(c1, 'outro', 'cpf-secreto.pdf', f2);
  perform cr_anexo_adicionar(c2, 'outro', 'recente.pdf', f1);
  perform cr_anexo_adicionar(c3, 'outro', 'andamento.pdf', f1);
  perform cr_anexo_carta_adicionar(k1, 'documento_pessoal', 'carta-rg-secreto.pdf', f1);
  perform cr_anexo_carta_adicionar(k1, 'outro', 'carta-outro.pdf', f2);
  perform cr_anexo_carta_adicionar(k2, 'outro', 'carta-recente.pdf', f1);
  reset role;
  if (select count(*) from cr_anexos where contrato_id in (c1, c2, c3)) <> 4 or (select count(*) from cr_anexos_carta where carta_id in (k1, k2)) <> 3 then raise exception 'FALHOU [X02 preparo: 4 anexos de contrato e 3 de carta]'; end if; n := n + 1;

  -- ===== operador e visitante: a função interna e a tela de retenção continuam fechadas =====
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
  set local role authenticated;
  begin perform cr_retencao_resumo(12); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [X03 operador não vê o resumo (com anexos)]'; end if; n := n + 1;
  begin perform cr_contar_anexos('{1}', '{1}'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [X04 logado não executa a função interna cr_contar_anexos]'; end if; n := n + 1;
  reset role;
  perform set_config('request.jwt.claim.sub', '', false);
  set local role anon;
  begin perform cr_contar_anexos('{1}', '{1}'); ok := false; exception when insufficient_privilege then ok := true; end;
  reset role;
  if not ok then raise exception 'FALHOU [X05 anon não executa cr_contar_anexos]'; end if; n := n + 1;

  -- ===== admin: resumo conta o que será apagado =====
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  set local role authenticated;
  j := cr_retencao_resumo(12);
  if (j ->> 'anexos_contratos')::bigint - (b ->> 'anexos_contratos')::bigint <> 2 then raise exception 'FALHOU [X06 resumo: +2 anexos de contrato (RAX-01); veio % -> %]', b ->> 'anexos_contratos', j ->> 'anexos_contratos'; end if; n := n + 1;
  if (j ->> 'anexos_cartas')::bigint - (b ->> 'anexos_cartas')::bigint <> 2 then raise exception 'FALHOU [X07 resumo: +2 anexos de carta (RAX-K1); veio % -> %]', b ->> 'anexos_cartas', j ->> 'anexos_cartas'; end if; n := n + 1;
  if (j ->> 'contratos')::bigint - (b ->> 'contratos')::bigint <> 1 or (j ->> 'cartas')::bigint - (b ->> 'cartas')::bigint <> 1 then raise exception 'FALHOU [X08 só o contrato e a carta antigos entram]'; end if; n := n + 1;
  if j::text ~* 'secreto|\.pdf|123\.?456|rax' then raise exception 'FALHOU [X09 o resumo não devolve nome de arquivo, CPF nem nome de pessoa: %]', j::text; end if; n := n + 1;
  reset role;
  -- resumo só conta: nada mudou
  if (select count(*) from cr_anexos where contrato_id in (c1, c2, c3)) <> 4 or (select count(*) from cr_anexos_carta where carta_id in (k1, k2)) <> 3 then raise exception 'FALHOU [X10 ver não apaga nada]'; end if; n := n + 1;

  -- ===== admin: aplicar apaga exatamente o que o resumo contou =====
  select count(*) into antes_c from cr_anexos; select count(*) into antes_k from cr_anexos_carta;
  set local role authenticated;
  r := cr_retencao_aplicar(12);
  reset role;
  select count(*) into dep_c from cr_anexos; select count(*) into dep_k from cr_anexos_carta;
  if (r ->> 'anexos_contratos')::bigint <> (j ->> 'anexos_contratos')::bigint or (r ->> 'anexos_cartas')::bigint <> (j ->> 'anexos_cartas')::bigint then raise exception 'FALHOU [X11 aplicar informa o mesmo número que o resumo: % x %]', r::text, j::text; end if; n := n + 1;
  if antes_c - dep_c <> (r ->> 'anexos_contratos')::bigint or antes_k - dep_k <> (r ->> 'anexos_cartas')::bigint then raise exception 'FALHOU [X12 o número informado é o que sumiu de verdade: contrato % x %, carta % x %]', antes_c - dep_c, r ->> 'anexos_contratos', antes_k - dep_k, r ->> 'anexos_cartas'; end if; n := n + 1;
  if exists (select 1 from cr_anexos where contrato_id = c1) or exists (select 1 from cr_anexos_carta where carta_id = k1) then raise exception 'FALHOU [X13 anexos do contrato e da carta anonimizados sumiram]'; end if; n := n + 1;
  if (select count(*) from cr_anexos where contrato_id = c2) <> 1 or (select count(*) from cr_anexos where contrato_id = c3) <> 1 or (select count(*) from cr_anexos_carta where carta_id = k2) <> 1 then raise exception 'FALHOU [X14 recente, em andamento e carta recente NÃO perdem anexo]'; end if; n := n + 1;
  if not exists (select 1 from cr_log where acao = 'retencao_aplicada' and detalhe ~ 'anexos de contratos, .* anexos de cartas apagados') then raise exception 'FALHOU [X15 o histórico registra as contagens de anexos]'; end if; n := n + 1;
  if exists (select 1 from cr_log where (coalesce(referencia, '') || coalesce(detalhe, '')) ~* 'secreto|\.pdf|123\.?456|rax (antigo|recente|titular|carta|candidato|andamento)') then raise exception 'FALHOU [X16 o histórico não leva nome de arquivo, CPF nem nome (RN-10)]'; end if; n := n + 1;
  -- repetir: nada a apagar
  set local role authenticated;
  r := cr_retencao_aplicar(12);
  reset role;
  if (r ->> 'anexos_contratos')::bigint <> 0 or (r ->> 'anexos_cartas')::bigint <> 0 then raise exception 'FALHOU [X17 repetir não apaga (nem conta) de novo: %]', r::text; end if; n := n + 1;

  -- ===== pedido do titular =====
  insert into cr_contratos (numero_contrato, tipo, status, nome_candidato, cpf, empresa, titulo) values
    ('RAX-04', 'estagio', 'assinado', 'Rax Titular',  '123.456.789-09', 'Emp R', 'TCE — Rax Titular — Emp R'),
    ('RAX-05', 'estagio', 'enviado',  'Rax Titular 2', '123.456.789-09', 'Emp R', 'TCE — Rax Titular 2 — Emp R');
  select id into c4 from cr_contratos where numero_contrato = 'RAX-04';
  select id into c5 from cr_contratos where numero_contrato = 'RAX-05';
  insert into cr_cartas (numero_carta, nome, tipo_doc, dados) values ('RAX-K3', 'Rax Carta Titular', 'carta_recomendacao', '{"cpf":"12345678909"}') returning id into k3;
  set local role authenticated;
  perform cr_anexo_adicionar(c4, 'documento_pessoal', 'titular-rg-secreto.pdf', f1);
  perform cr_anexo_adicionar(c4, 'outro', 'titular-cpf-secreto.pdf', f2);
  perform cr_anexo_adicionar(c4, 'outro', 'titular-outro-secreto.pdf', f3);
  perform cr_anexo_adicionar(c5, 'outro', 'titular-andamento.pdf', f1);
  perform cr_anexo_carta_adicionar(k3, 'outro', 'titular-carta-secreto.pdf', f4);
  reset role;
  select count(*) into antes_c from cr_anexos; select count(*) into antes_k from cr_anexos_carta;

  set local role authenticated;
  j := cr_titular_buscar('123.456.789-09');
  reset role;
  if (j ->> 'anexos_contratos')::bigint <> 3 then raise exception 'FALHOU [X18 titular: 3 anexos do contrato TERMINADO (o do em andamento não conta): %]', j::text; end if; n := n + 1;
  if (j ->> 'anexos_cartas')::bigint <> 1 then raise exception 'FALHOU [X19 titular: 1 anexo de carta: %]', j::text; end if; n := n + 1;
  if j::text ~* 'secreto|\.pdf|123\.?456|rax' then raise exception 'FALHOU [X20 a busca do titular não devolve arquivo, CPF nem nome: %]', j::text; end if; n := n + 1;
  if (select count(*) from cr_anexos) <> antes_c or (select count(*) from cr_anexos_carta) <> antes_k then raise exception 'FALHOU [X21 buscar não apaga nada]'; end if; n := n + 1;

  set local role authenticated;
  r := cr_titular_anonimizar('123.456.789-09');
  reset role;
  if (r ->> 'anexos_contratos')::bigint <> 3 or (r ->> 'anexos_cartas')::bigint <> 1 then raise exception 'FALHOU [X22 anonimizar informa 3 + 1: %]', r::text; end if; n := n + 1;
  if antes_c - (select count(*) from cr_anexos) <> 3 or antes_k - (select count(*) from cr_anexos_carta) <> 1 then raise exception 'FALHOU [X23 sumiram de verdade 3 de contrato e 1 de carta]'; end if; n := n + 1;
  if exists (select 1 from cr_anexos where contrato_id = c4) or exists (select 1 from cr_anexos_carta where carta_id = k3) then raise exception 'FALHOU [X24 anexos do titular sumiram]'; end if; n := n + 1;
  if (select count(*) from cr_anexos where contrato_id = c5) <> 1 then raise exception 'FALHOU [X25 anexo de contrato em ANDAMENTO do titular fica]'; end if; n := n + 1;
  if r::text ~* 'secreto|\.pdf|123\.?456|rax' then raise exception 'FALHOU [X26 a resposta do titular não devolve arquivo, CPF nem nome]'; end if; n := n + 1;
  if not exists (select 1 from cr_log where acao = 'titular_anonimizado' and detalhe ~ '3 anexos de contratos, 1 anexos de cartas apagados') then raise exception 'FALHOU [X27 histórico do titular tem as contagens de anexos]'; end if; n := n + 1;
  if exists (select 1 from cr_log where (coalesce(referencia, '') || coalesce(detalhe, '')) ~* 'secreto|\.pdf|123\.?456|rax (antigo|recente|titular|carta|candidato|andamento)') then raise exception 'FALHOU [X28 histórico do titular sem arquivo, CPF nem nome (RN-10)]'; end if; n := n + 1;

  -- ===== SQL antigo / tabelas de anexos ausentes: o campo vem NULO e nada quebra =====
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  alter table cr_anexos rename to cr_anexos_fora;
  alter table cr_anexos_carta rename to cr_anexos_carta_fora;
  j := cr_retencao_resumo(12);
  if (j ->> 'anexos_contratos') is not null or (j ->> 'anexos_cartas') is not null or (j ->> 'contratos') is null then raise exception 'FALHOU [X29 sem tabelas de anexos: contagem nula (não inventa 0) e o resto funciona: %]', j::text; end if; n := n + 1;
  j := cr_titular_buscar('123.456.789-09');
  if (j ->> 'anexos_contratos') is not null or (j ->> 'anexos_cartas') is not null or (j ->> 'candidatos') is null then raise exception 'FALHOU [X30 titular sem tabelas de anexos: idem: %]', j::text; end if; n := n + 1;
  alter table cr_anexos_fora rename to cr_anexos;
  alter table cr_anexos_carta_fora rename to cr_anexos_carta;

  raise notice 'RETENCAO ANEXOS SQL: % verificações OK (resumo e titular contam, aplicar apaga o que contou, só terminados, log sem nome de arquivo, sem tabela = nulo)', n;
end $$;
