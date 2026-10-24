-- R35 (M10): modelos editáveis com versão, no PostgreSQL real (com o stub do Supabase). Faz parte de tests/sql/rodar-m15.sh
-- Usuários: A (admin) e B (operador). Roda DEPOIS de perfis-teste.sql (que deixa B como admin e A como operador): aqui refazemos os perfis.
grant select, insert, update on cr_contratos to authenticated;
grant usage on all sequences in schema public to authenticated;
delete from cr_perfis;
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@x.com'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@x.com') on conflict (id) do update set email = excluded.email;
delete from cr_contratos where numero_contrato like 'MOD-%';
-- limpa versões de testes anteriores (a trava de imutabilidade impede apagar: desliga só aqui, na base de teste)
alter table cr_modelos disable trigger cr_modelos_imutavel_tg;
delete from cr_modelos where versao > 1; update cr_modelos set ativo = (versao = 1);
alter table cr_modelos enable trigger cr_modelos_imutavel_tg;

do $$
declare n int := 0; ok boolean; r json; v1 text; id1 bigint; id2 bigint; c1 bigint; c2 bigint; c3 bigint; t text; ver int;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  perform cr_definir_perfil('a@x.com', 'admin');
  perform cr_definir_perfil('b@x.com', 'operador');

  -- semente
  select count(*) into ver from cr_modelos where chave = 'clausulas_tce';
  if ver <> 1 then raise exception 'FALHOU [Q01 semente: 1 versão (%)]', ver; end if; n := n + 1;
  select texto into v1 from cr_modelos where chave = 'clausulas_tce' and ativo;
  if v1 is null or v1 not like '%Cláusula 1ª — Objeto%' or v1 not like '%{{apolice}}%' or v1 not like '%Cláusula 6ª — Validade Digital%' then raise exception 'FALHOU [Q02 a versão 1 é o texto que estava fixo no código, com {{apolice}}]'; end if; n := n + 1;

  -- validação
  if cr_modelo_validar('curto') is distinct from 'curto' then raise exception 'FALHOU [Q03 texto curto]'; end if; n := n + 1;
  if cr_modelo_validar(repeat('a', 20001)) is distinct from 'longo' then raise exception 'FALHOU [Q04 texto longo]'; end if; n := n + 1;
  if cr_modelo_validar(repeat('a', 60) || '{{cpf}}') is distinct from 'variavel_invalida' then raise exception 'FALHOU [Q05 variável fora da lista (cpf) recusada]'; end if; n := n + 1;
  if cr_modelo_validar(repeat('a', 60) || '{{apolice') is distinct from 'variavel_invalida' then raise exception 'FALHOU [Q06 chave aberta recusada]'; end if; n := n + 1;
  if cr_modelo_validar(repeat('a', 60) || '{{ apolice }}') is distinct from 'variavel_invalida' then raise exception 'FALHOU [Q07 variável com espaço recusada (nada de adivinhar)]'; end if; n := n + 1;
  if cr_modelo_validar(repeat('a', 60) || '{{apolice}} {{numero}} {{empresa}} {{agencia}}') is not null then raise exception 'FALHOU [Q08 as 4 variáveis permitidas passam]'; end if; n := n + 1;
  if cr_modelo_validar(null) is distinct from 'curto' then raise exception 'FALHOU [Q09 nulo = curto]'; end if; n := n + 1;

  -- operador não publica nem ativa
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
  set local role authenticated;
  begin perform cr_modelo_publicar('clausulas_tce', repeat('x', 80)); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [Q10 operador não publica]'; end if; n := n + 1;
  select id into id1 from cr_modelos where chave = 'clausulas_tce' and versao = 1;
  begin perform cr_modelo_ativar(id1); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [Q11 operador não ativa]'; end if; n := n + 1;
  if (select count(*) from cr_modelos where chave = 'clausulas_tce') <> 1 then raise exception 'FALHOU [Q12 operador LÊ os modelos]'; end if; n := n + 1;
  begin insert into cr_modelos (chave, versao, texto) values ('clausulas_tce', 9, repeat('x', 80)); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [Q13 escrita direta recusada]'; end if; n := n + 1;

  -- contrato de estágio criado AGORA recebe a versão 1 (copiada pelo servidor, mesmo que o app mande outra coisa)
  insert into cr_contratos (tipo, numero_contrato, nome_candidato, status, modelo_clausulas_texto, modelo_clausulas_versao) values ('estagio', 'MOD-1', 'Teste', 'enviado', 'TEXTO FORJADO PELO APP', 99) returning id into c1;
  select modelo_clausulas_versao, modelo_clausulas_texto into ver, t from cr_contratos where id = c1;
  if ver <> 1 or t <> v1 then raise exception 'FALHOU [Q14 o servidor copia a versão ativa e ignora o que o app mandou]'; end if; n := n + 1;
  insert into cr_contratos (tipo, numero_contrato, nome_candidato, status, modelo_clausulas_texto) values ('clt', 'MOD-CLT', 'Teste', 'enviado', 'FORJADO');
  if (select modelo_clausulas_texto from cr_contratos where numero_contrato = 'MOD-CLT') is not null then raise exception 'FALHOU [Q15 CLT não tem cláusulas (cópia forjada some)]'; end if; n := n + 1;

  -- admin publica a versão 2
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  r := cr_modelo_publicar('outra', repeat('x', 80));
  if (r ->> 'erro') is distinct from 'chave_invalida' then raise exception 'FALHOU [Q16 chave desconhecida recusada: %]', r; end if; n := n + 1;
  r := cr_modelo_publicar('clausulas_tce', 'curto');
  if (r ->> 'erro') is distinct from 'curto' then raise exception 'FALHOU [Q17 publicar texto curto devolve erro (não exceção)]'; end if; n := n + 1;
  r := cr_modelo_publicar('clausulas_tce', '  ' || v1 || '  ');
  if (r ->> 'erro') is distinct from 'igual_a_ativa' then raise exception 'FALHOU [Q18 igual à ativa (ignorando espaços nas pontas) não cria versão: %]', r; end if; n := n + 1;
  r := cr_modelo_publicar('clausulas_tce', '**Cláusula 1ª:** Texto novo da versão dois, apólice nº {{apolice}}, contrato {{numero}}, empresa {{empresa}}, agência {{agencia}}.');
  if (r ->> 'ok') is distinct from 'true' or (r ->> 'versao')::int <> 2 then raise exception 'FALHOU [Q19 versão 2 publicada: %]', r; end if; n := n + 1;
  id2 := (r ->> 'id')::bigint;
  if (select count(*) from cr_modelos where chave = 'clausulas_tce' and ativo) <> 1 or not (select ativo from cr_modelos where id = id2) then raise exception 'FALHOU [Q20 só a v2 fica ativa]'; end if; n := n + 1;
  if not exists (select 1 from cr_log where acao = 'publicou_modelo' and detalhe = 'versão 2') then raise exception 'FALHOU [Q21 publicar entra no histórico]'; end if; n := n + 1;
  if exists (select 1 from cr_log where acao in ('publicou_modelo', 'ativou_modelo') and detalhe ~* 'Texto novo') then raise exception 'FALHOU [Q22 o histórico não leva o texto]'; end if; n := n + 1;

  -- contrato novo pega a v2; o antigo continua na v1 (publicar NÃO muda contrato criado)
  insert into cr_contratos (tipo, numero_contrato, nome_candidato, status) values ('estagio', 'MOD-2', 'Teste', 'enviado') returning id into c2;
  if (select modelo_clausulas_versao from cr_contratos where id = c2) <> 2 then raise exception 'FALHOU [Q23 contrato novo recebe a v2]'; end if; n := n + 1;
  if (select modelo_clausulas_versao from cr_contratos where id = c1) <> 1 or (select modelo_clausulas_texto from cr_contratos where id = c1) <> v1 then raise exception 'FALHOU [Q24 contrato antigo continua na v1]'; end if; n := n + 1;

  -- a cópia não pode ser alterada depois
  begin update cr_contratos set modelo_clausulas_texto = 'outro' where id = c1; ok := false; exception when sqlstate '23514' then ok := true; end;
  if not ok then raise exception 'FALHOU [Q25 cópia do texto não muda (texto)]'; end if; n := n + 1;
  begin update cr_contratos set modelo_clausulas_versao = 2 where id = c1; ok := false; exception when sqlstate '23514' then ok := true; end;
  if not ok then raise exception 'FALHOU [Q26 cópia não muda (versão)]'; end if; n := n + 1;
  update cr_contratos set nome_candidato = 'Teste Editado' where id = c1;   -- o resto do contrato continua editável
  if (select nome_candidato from cr_contratos where id = c1) <> 'Teste Editado' then raise exception 'FALHOU [Q27 outros campos seguem editáveis]'; end if; n := n + 1;

  -- movimento herda a cópia do ORIGINAL, não a versão ativa
  insert into cr_contratos (tipo, numero_contrato, nome_candidato, status, contrato_origem_id, tipo_mov) values ('estagio', 'MOD-ADT', 'Teste', 'enviado', c1, 'aditivo') returning id into c3;
  if (select modelo_clausulas_versao from cr_contratos where id = c3) <> 1 or (select modelo_clausulas_texto from cr_contratos where id = c3) <> v1 then raise exception 'FALHOU [Q28 aditivo herda a v1 do contrato de origem (a ativa é a v2)]'; end if; n := n + 1;

  -- versões são imutáveis e não se apagam
  reset role;
  begin update cr_modelos set texto = 'adulterado' where id = id2; ok := false; exception when sqlstate '23514' then ok := true; end;
  if not ok then raise exception 'FALHOU [Q29 texto de versão não muda nem pelo dono]'; end if; n := n + 1;
  begin delete from cr_modelos where id = id2; ok := false; exception when sqlstate '23514' then ok := true; end;
  if not ok then raise exception 'FALHOU [Q30 versão não se apaga]'; end if; n := n + 1;

  -- voltar atrás: ativar a v1; contrato novo nasce com v1, os já criados não mudam
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  r := cr_modelo_ativar(id2);
  if (r ->> 'erro') is distinct from 'ja_ativa' then raise exception 'FALHOU [Q31 ativar a que já está ativa avisa]'; end if; n := n + 1;
  r := cr_modelo_ativar(-5);
  if (r ->> 'erro') is distinct from 'nao_encontrado' then raise exception 'FALHOU [Q32 id inexistente]'; end if; n := n + 1;
  r := cr_modelo_ativar(id1);
  if (r ->> 'ok') is distinct from 'true' then raise exception 'FALHOU [Q33 ativar v1: %]', r; end if; n := n + 1;
  if (select count(*) from cr_modelos where chave = 'clausulas_tce' and ativo) <> 1 or not (select ativo from cr_modelos where id = id1) then raise exception 'FALHOU [Q34 só a v1 ativa]'; end if; n := n + 1;
  insert into cr_contratos (tipo, numero_contrato, nome_candidato, status) values ('estagio', 'MOD-3', 'Teste', 'enviado');
  if (select modelo_clausulas_versao from cr_contratos where numero_contrato = 'MOD-3') <> 1 then raise exception 'FALHOU [Q35 depois de voltar, contrato novo recebe a v1]'; end if; n := n + 1;
  if (select modelo_clausulas_versao from cr_contratos where id = c2) <> 2 then raise exception 'FALHOU [Q36 contrato criado com a v2 continua na v2]'; end if; n := n + 1;
  if not exists (select 1 from cr_log where acao = 'ativou_modelo' and detalhe = 'versão 1') then raise exception 'FALHOU [Q37 ativar entra no histórico]'; end if; n := n + 1;
  -- publicar de novo o texto da v2 depois de voltar: cria v3 (a v2 existe, mas não é a ATIVA; versões não se reaproveitam por texto)
  r := cr_modelo_publicar('clausulas_tce', (select texto from cr_modelos where id = id2));
  if (r ->> 'versao')::int <> 3 then raise exception 'FALHOU [Q38 versão nova = maior + 1 (3): %]', r; end if; n := n + 1;

  -- sem login
  perform set_config('request.jwt.claim.sub', '', false);
  begin perform cr_modelo_publicar('clausulas_tce', repeat('y', 80)); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [Q39 sem login não publica]'; end if; n := n + 1;
  begin perform cr_modelo_ativar(id1); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [Q40 sem login não ativa]'; end if; n := n + 1;
  reset role;
  raise notice 'MODELOS SQL: % verificações OK (semente, validação, só admin, cópia forjada ignorada, contrato antigo intocado, movimento herda, versões imutáveis, voltar atrás)', n;
end $$;

-- o visitante (anon) não lê modelos nem executa as funções
do $$
declare ok boolean;
begin
  set local role anon;
  begin perform count(*) from cr_modelos; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [Q41 anon lê cr_modelos]'; end if;
  begin perform cr_modelo_publicar('clausulas_tce', repeat('z', 80)); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [Q42 anon executa publicar]'; end if;
  begin perform cr_modelo_ativar(1); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [Q43 anon executa ativar]'; end if;
  reset role;
  raise notice 'MODELOS SQL: permissões OK (anon bloqueado)';
end $$;
