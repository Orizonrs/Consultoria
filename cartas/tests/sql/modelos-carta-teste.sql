-- R38 (M10): segundo modelo (texto da carta de recomendação, chave 'texto_recomendacao') no PostgreSQL real. Roda DEPOIS de modelos-teste.sql (A = admin, B = operador).
alter table cr_modelos disable trigger cr_modelos_imutavel_tg;
delete from cr_modelos where chave = 'texto_recomendacao' and versao > 1; update cr_modelos set ativo = (versao = 1) where chave = 'texto_recomendacao';
alter table cr_modelos enable trigger cr_modelos_imutavel_tg;
reset role;

do $$
declare n int := 0; ok boolean; r json; v1 text; X text := repeat('a', 60); id1 bigint; ver int;
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  perform cr_definir_perfil('a@x.com', 'admin'); perform cr_definir_perfil('b@x.com', 'operador');

  select texto, id into v1, id1 from cr_modelos where chave = 'texto_recomendacao' and versao = 1;
  if v1 is null or v1 !~ '\{\{nome\}\}' or not (select ativo from cr_modelos where id = id1) then raise exception 'FALHOU [C1 semente: v1 ativa com {{nome}}]'; end if; n := n + 1;
  if (select count(*) from cr_modelos where chave = 'texto_recomendacao') <> 1 then raise exception 'FALHOU [C2 semente não duplica]'; end if; n := n + 1;
  if v1 not like 'Durante o período de estágio, {{nome}} demonstrou comprometimento%' then raise exception 'FALHOU [C3 v1 = texto que era fixo]'; end if; n := n + 1;

  -- validação por chave
  if cr_modelo_validar_chave('texto_recomendacao', v1) is not null then raise exception 'FALHOU [C4 v1 é válida]'; end if; n := n + 1;
  if cr_modelo_validar_chave('texto_recomendacao', 'curto') is distinct from 'curto' then raise exception 'FALHOU [C5 curto]'; end if; n := n + 1;
  if cr_modelo_validar_chave('texto_recomendacao', repeat('a', 3001)) is distinct from 'longo' or cr_modelo_validar_chave('texto_recomendacao', repeat('a', 3000)) is not null then raise exception 'FALHOU [C6 limite 3000]'; end if; n := n + 1;
  if cr_modelo_validar_chave('texto_recomendacao', X || '{{apolice}}') is distinct from 'variavel_invalida' then raise exception 'FALHOU [C7 recomendação NÃO aceita {{apolice}}]'; end if; n := n + 1;
  if cr_modelo_validar_chave('texto_recomendacao', X || '{{cpf}}') is distinct from 'variavel_invalida' or cr_modelo_validar_chave('texto_recomendacao', X || '{{ nome }}') is distinct from 'variavel_invalida' or cr_modelo_validar_chave('texto_recomendacao', X || '{{nome') is distinct from 'variavel_invalida' then raise exception 'FALHOU [C8 variável inventada / mal escrita]'; end if; n := n + 1;
  if cr_modelo_validar_chave('texto_recomendacao', X || '{{nome}} e {{nome}}') is not null then raise exception 'FALHOU [C9 {{nome}} repetido ok]'; end if; n := n + 1;
  if cr_modelo_validar_chave('clausulas_tce', X || '{{nome}}') is distinct from 'variavel_invalida' then raise exception 'FALHOU [C10 TCE NÃO aceita {{nome}}]'; end if; n := n + 1;
  if cr_modelo_validar_chave('clausulas_tce', X || '{{apolice}}') is not null then raise exception 'FALHOU [C11 TCE continua aceitando {{apolice}}]'; end if; n := n + 1;
  if cr_modelo_validar_chave('clausulas_tce', repeat('a', 3001)) is not null then raise exception 'FALHOU [C12 TCE mantém limite de 20000]'; end if; n := n + 1;
  if cr_modelo_validar_chave('outra', X) is distinct from 'chave_invalida' then raise exception 'FALHOU [C13 chave desconhecida]'; end if; n := n + 1;

  -- publicar (admin)
  r := cr_modelo_publicar('texto_recomendacao', X || '{{apolice}}');
  if (r ->> 'erro') is distinct from 'variavel_invalida' then raise exception 'FALHOU [C14 publicar recomendação com {{apolice}} recusado: %]', r; end if; n := n + 1;
  r := cr_modelo_publicar('texto_recomendacao', '  ' || v1 || '  ');
  if (r ->> 'erro') is distinct from 'igual_a_ativa' then raise exception 'FALHOU [C15 igual à ativa: %]', r; end if; n := n + 1;
  r := cr_modelo_publicar('texto_recomendacao', 'Segunda versão: {{nome}} foi um(a) estagiário(a) dedicado(a) e cumpriu todas as tarefas com muita competência.');
  if (r ->> 'ok') is distinct from 'true' or (r ->> 'versao')::int <> 2 then raise exception 'FALHOU [C16 publicar v2: %]', r; end if; n := n + 1;
  if (select count(*) from cr_modelos where chave = 'texto_recomendacao' and ativo) <> 1 or (select versao from cr_modelos where chave = 'texto_recomendacao' and ativo) <> 2 then raise exception 'FALHOU [C17 só a v2 ativa]'; end if; n := n + 1;
  if (select count(*) from cr_modelos where chave = 'clausulas_tce' and ativo) <> 1 then raise exception 'FALHOU [C18 publicar recomendação NÃO mexe no TCE]'; end if; n := n + 1;
  r := cr_modelo_publicar('clausulas_tce', X || '{{nome}}');
  if (r ->> 'erro') is distinct from 'variavel_invalida' then raise exception 'FALHOU [C19 TCE com {{nome}} recusado ao publicar]'; end if; n := n + 1;
  -- ativar / voltar atrás
  r := cr_modelo_ativar(id1);
  if (r ->> 'ok') is distinct from 'true' or not (select ativo from cr_modelos where id = id1) or (select count(*) from cr_modelos where chave = 'texto_recomendacao' and ativo) <> 1 then raise exception 'FALHOU [C20 voltar à v1]'; end if; n := n + 1;
  if (select count(*) from cr_modelos where chave = 'clausulas_tce' and ativo) <> 1 then raise exception 'FALHOU [C21 ativar não mexe no TCE]'; end if; n := n + 1;
  -- imutável
  begin update cr_modelos set texto = repeat('x', 80) where id = id1; ok := false; exception when sqlstate '23514' then ok := true; end;
  if not ok then raise exception 'FALHOU [C22 versão imutável]'; end if; n := n + 1;
  begin delete from cr_modelos where id = id1; ok := false; exception when sqlstate '23514' then ok := true; end;
  if not ok then raise exception 'FALHOU [C23 sem exclusão]'; end if; n := n + 1;
  -- histórico sem texto
  if exists (select 1 from cr_log where acao in ('publicou_modelo','ativou_modelo') and detalhe ~* 'Segunda versão') then raise exception 'FALHOU [C24 texto fora do histórico]'; end if; n := n + 1;

  -- operador: lê, não publica nem ativa; escrita direta recusada
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
  set local role authenticated;
  begin perform cr_modelo_publicar('texto_recomendacao', X || '{{nome}}'); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [C25 operador não publica]'; end if; n := n + 1;
  begin perform cr_modelo_ativar(id1); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [C26 operador não ativa]'; end if; n := n + 1;
  if (select count(*) from cr_modelos where chave = 'texto_recomendacao') <> 2 then raise exception 'FALHOU [C27 operador LÊ os modelos]'; end if; n := n + 1;
  begin insert into cr_modelos (chave, versao, texto) values ('texto_recomendacao', 9, repeat('x', 80)); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [C28 escrita direta recusada]'; end if; n := n + 1;
  reset role;
  -- a tabela recusa chave fora da lista
  begin insert into cr_modelos (chave, versao, texto) values ('qualquer', 1, repeat('x', 80)); ok := false; exception when check_violation then ok := true; end;
  if not ok then raise exception 'FALHOU [C29 check da chave]'; end if; n := n + 1;
  raise notice 'MODELO CARTA SQL: % verificações OK (semente, {{nome}} só na recomendação, TCE intacto, admin/operador, imutável)', n;
end $$;

do $$
declare ok boolean;
begin
  set local role anon;
  begin perform cr_modelo_publicar('texto_recomendacao', repeat('x', 80)); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [anon executa publicar]'; end if;
  begin perform cr_modelo_validar_chave('texto_recomendacao', 'x'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [anon executa validar_chave]'; end if;
  reset role;
  raise notice 'MODELO CARTA SQL: permissões OK (anon bloqueado)';
end $$;
