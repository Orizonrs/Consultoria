-- R36 (M16): anexos ao contrato, no PostgreSQL real (com o stub do Supabase). Faz parte de tests/sql/rodar-m15.sh
-- Usuários: A (admin) e B (operador). Roda DEPOIS dos outros: refaz os perfis.
grant select, insert, update on cr_contratos to authenticated;
grant usage on all sequences in schema public to authenticated;
delete from cr_perfis;
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@x.com'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@x.com') on conflict (id) do update set email = excluded.email;
delete from cr_contratos where numero_contrato like 'ANX-%';

do $$
declare n int := 0; r json; c1 bigint; c2 bigint; c3 bigint; id1 bigint; id2 bigint; ok boolean; i int; q int; nm text; h text;
  pdf text := encode('%PDF-1.4 conteudo de teste'::bytea, 'base64');
  png text := encode('\x89504e470d0a1a0a0000000d49484452'::bytea, 'base64');
  jpg text := encode('\xffd8ffe000104a46494600'::bytea, 'base64');
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  perform cr_definir_perfil('a@x.com', 'admin');
  perform cr_definir_perfil('b@x.com', 'operador');
  insert into cr_contratos (tipo, numero_contrato, nome_candidato, status) values ('estagio', 'ANX-1', 'Teste Um', 'assinado') returning id into c1;
  insert into cr_contratos (tipo, numero_contrato, nome_candidato, status) values ('estagio', 'ANX-2', 'Teste Dois', 'enviado') returning id into c2;
  insert into cr_contratos (tipo, numero_contrato, nome_candidato, status) values ('clt', 'ANX-3', 'Teste Tres', 'assinado') returning id into c3;

  -- A01..A04 tipos aceitos, decididos pelo conteúdo
  r := cr_anexo_adicionar(c1, 'documento_pessoal', 'rg.pdf', pdf);
  if (r ->> 'ok') is distinct from 'true' or (r ->> 'tipo') <> 'pdf' then raise exception 'FALHOU [A01 PDF aceito: %]', r; end if; n := n + 1; id1 := (r ->> 'id')::bigint;
  r := cr_anexo_adicionar(c1, 'outro', 'foto.png', png);
  if (r ->> 'tipo') is distinct from 'png' then raise exception 'FALHOU [A02 PNG aceito: %]', r; end if; n := n + 1; id2 := (r ->> 'id')::bigint;
  r := cr_anexo_adicionar(c1, 'outro', 'foto.jpeg', jpg);
  if (r ->> 'tipo') is distinct from 'jpg' then raise exception 'FALHOU [A03 JPEG aceito: %]', r; end if; n := n + 1;
  r := cr_anexo_adicionar(c1, 'outro', 'sem-extensao', encode('%PDF-1.7 outro'::bytea, 'base64'));
  if (r ->> 'tipo') is distinct from 'pdf' then raise exception 'FALHOU [A04 o tipo vem do conteúdo, não do nome: %]', r; end if; n := n + 1;

  -- A05..A07 conteúdo recusado
  r := cr_anexo_adicionar(c2, 'outro', 'falso.pdf', encode('isto e so texto'::bytea, 'base64'));
  if (r ->> 'erro') is distinct from 'tipo_nao_aceito' then raise exception 'FALHOU [A05 texto com nome .pdf recusado: %]', r; end if; n := n + 1;
  r := cr_anexo_adicionar(c2, 'outro', 'programa.exe', encode('\x4d5a9000'::bytea, 'base64'));
  if (r ->> 'erro') is distinct from 'tipo_nao_aceito' then raise exception 'FALHOU [A06 executável recusado: %]', r; end if; n := n + 1;
  r := cr_anexo_adicionar(c2, 'outro', 'x.pdf', '');
  if (r ->> 'erro') is distinct from 'vazio' then raise exception 'FALHOU [A07 vazio: %]', r; end if; n := n + 1;
  r := cr_anexo_adicionar(c2, 'outro', 'x.pdf', '@@@não é base64@@@');
  if (r ->> 'erro') is distinct from 'arquivo_invalido' then raise exception 'FALHOU [A07b base64 inválido: %]', r; end if; n := n + 1;

  -- A08 duplicado (mesmo hash, mesmo contrato); em outro contrato pode
  r := cr_anexo_adicionar(c1, 'outro', 'copia.pdf', pdf);
  if (r ->> 'erro') is distinct from 'duplicado' then raise exception 'FALHOU [A08 mesmo arquivo no mesmo contrato recusado: %]', r; end if; n := n + 1;
  r := cr_anexo_adicionar(c3, 'outro', 'rg.pdf', pdf);
  if (r ->> 'ok') is distinct from 'true' then raise exception 'FALHOU [A09 mesmo arquivo em OUTRO contrato é aceito: %]', r; end if; n := n + 1;

  -- A10..A12 tamanho
  r := cr_anexo_adicionar(c2, 'outro', 'limite.pdf', encode(('%PDF' || repeat('a', 2097152 - 4))::bytea, 'base64'));
  if (r ->> 'ok') is distinct from 'true' or (r ->> 'tamanho')::int <> 2097152 then raise exception 'FALHOU [A10 exatamente 2 MB passa: %]', r; end if; n := n + 1;
  delete from cr_anexos where contrato_id = c2;
  r := cr_anexo_adicionar(c2, 'outro', 'x.pdf', encode(('%PDF' || repeat('a', 2097153 - 4))::bytea, 'base64'));
  if (r ->> 'erro') is distinct from 'grande' then raise exception 'FALHOU [A12 acima de 2 MB: %]', r; end if; n := n + 1;

  -- A13..A16 categoria e limite de 10
  r := cr_anexo_adicionar(c2, 'categoria_inventada', 'x.pdf', pdf);
  if (r ->> 'erro') is distinct from 'categoria_invalida' then raise exception 'FALHOU [A13 categoria inválida: %]', r; end if; n := n + 1;
  r := cr_anexo_adicionar(999999, 'outro', 'x.pdf', pdf);
  if (r ->> 'erro') is distinct from 'contrato_nao_encontrado' then raise exception 'FALHOU [A14 contrato inexistente: %]', r; end if; n := n + 1;
  for i in 1..10 loop r := cr_anexo_adicionar(c2, 'outro', 'a' || i || '.pdf', encode(('%PDF-' || i)::bytea, 'base64')); end loop;
  select count(*) into q from cr_anexos where contrato_id = c2;
  if q <> 10 then raise exception 'FALHOU [A15 10 anexos aceitos (%)]', q; end if; n := n + 1;
  r := cr_anexo_adicionar(c2, 'outro', 'onze.pdf', encode('%PDF-11'::bytea, 'base64'));
  if (r ->> 'erro') is distinct from 'limite' then raise exception 'FALHOU [A16 o 11º é recusado: %]', r; end if; n := n + 1;

  -- A17 nome limpo (sem caminho, sem < > : etc.)
  r := cr_anexo_adicionar(c3, 'outro', 'C:\Users\x\..\segredo<1>.png', png);
  select nome into nm from cr_anexos where id = (r ->> 'id')::bigint;
  if nm is null or nm ~ '[\\/<>:]' or nm not like 'segredo%' then raise exception 'FALHOU [A17 nome sem caminho e sem < > : %]', nm; end if; n := n + 1;
  r := cr_anexo_adicionar(c3, 'outro', '   ', encode('%PDF-nome'::bytea, 'base64'));
  select nome into nm from cr_anexos where id = (r ->> 'id')::bigint;
  if nm is distinct from 'arquivo.pdf' then raise exception 'FALHOU [A18 nome vazio vira arquivo.pdf: %]', nm; end if; n := n + 1;

  -- A19 coluna dados não é legível por select; metadados são
  set local role authenticated;
  begin perform dados from cr_anexos limit 1; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [A19 coluna dados NÃO é legível por select]'; end if; n := n + 1;
  begin perform id, nome, tipo, tamanho, hash_sha256 from cr_anexos limit 1; ok := true; exception when insufficient_privilege then ok := false; end;
  if not ok then raise exception 'FALHOU [A20 metadados são legíveis]'; end if; n := n + 1;
  begin insert into cr_anexos (contrato_id, categoria, nome, tipo, tamanho, hash_sha256, dados) values (c1, 'outro', 'x', 'pdf', 1, 'h', '\x00'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [A21 escrita direta bloqueada]'; end if; n := n + 1;
  reset role;
  if has_table_privilege('authenticated', 'cr_anexos', 'insert') or has_table_privilege('authenticated', 'cr_anexos', 'update') or has_table_privilege('authenticated', 'cr_anexos', 'delete') or has_table_privilege('authenticated', 'cr_anexos', 'select') then
    raise exception 'FALHOU [A21b authenticated sem insert/update/delete/select de tabela inteira em cr_anexos]'; end if; n := n + 1;
  if has_table_privilege('anon', 'cr_anexos', 'select') or has_column_privilege('authenticated', 'cr_anexos', 'dados', 'select') then raise exception 'FALHOU [A21c anon sem select; dados sem select]'; end if; n := n + 1;
  -- sem login (auth.uid() nulo) as 3 funções recusam
  perform set_config('request.jwt.claim.sub', '', false);
  begin perform cr_anexo_adicionar(c2, 'outro', 'x.pdf', pdf); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [A21d adicionar exige login]'; end if; n := n + 1;
  begin perform cr_anexo_baixar(id1); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [A21e baixar exige login]'; end if; n := n + 1;
  begin perform cr_anexo_excluir(id1); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [A21f excluir exige login]'; end if; n := n + 1;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);

  -- A22 baixar devolve o mesmo conteúdo
  r := cr_anexo_baixar(id1);
  if (r ->> 'base64') is distinct from pdf or (r ->> 'tipo') <> 'pdf' or (r ->> 'nome') <> 'rg.pdf' then raise exception 'FALHOU [A22 baixar devolve o conteúdo: %]', r; end if; n := n + 1;
  r := cr_anexo_baixar(0);
  if (r ->> 'erro') is distinct from 'nao_encontrado' then raise exception 'FALHOU [A22b baixar inexistente]'; end if; n := n + 1;

  -- A23 operador não exclui; A24 admin exclui
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
  begin perform cr_anexo_excluir(id1); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok or not exists (select 1 from cr_anexos where id = id1) then raise exception 'FALHOU [A23 operador não exclui anexo]'; end if; n := n + 1;
  r := cr_anexo_adicionar(c1, 'outro', 'do-operador.pdf', encode('%PDF-op'::bytea, 'base64'));
  if (r ->> 'ok') is distinct from 'true' then raise exception 'FALHOU [A23b operador anexa: %]', r; end if; n := n + 1;
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  r := cr_anexo_excluir(id1);
  if (r ->> 'ok') is distinct from 'true' or exists (select 1 from cr_anexos where id = id1) then raise exception 'FALHOU [A24 admin exclui: %]', r; end if; n := n + 1;
  r := cr_anexo_excluir(id1);
  if (r ->> 'erro') is distinct from 'nao_encontrado' then raise exception 'FALHOU [A25 excluir de novo: %]', r; end if; n := n + 1;

  -- A26 histórico: anexar e excluir registrados, sem o nome do arquivo
  select count(*) into q from cr_log where acao in ('anexou_arquivo', 'excluiu_anexo') and referencia like 'ANX-%';
  if q < 2 or exists (select 1 from cr_log where acao in ('anexou_arquivo', 'excluiu_anexo') and (coalesce(detalhe, '') ilike '%.pdf%' or coalesce(detalhe, '') ilike '%.png%' or coalesce(detalhe, '') ilike '%rg%')) then
    raise exception 'FALHOU [A26 histórico registra anexar e excluir]'; end if; n := n + 1;

  -- A27 o hash de assinatura do contrato não muda ao anexar (anexo fica fora do hash)
  update cr_contratos set hash_documento = 'hash-fixo' where id = c3;
  perform cr_anexo_adicionar(c3, 'outro', 'depois.pdf', encode('%PDF-depois'::bytea, 'base64'));
  if (select hash_documento from cr_contratos where id = c3) is distinct from 'hash-fixo' then raise exception 'FALHOU [A27 anexar não mexe no hash do contrato]'; end if; n := n + 1;

  -- A28..A30 anonimizar o contrato apaga os anexos (só os dele)
  select count(*) into q from cr_anexos where contrato_id = c1;
  if q = 0 then raise exception 'FALHOU [A28 pré-condição: c1 tem anexos]'; end if; n := n + 1;
  update cr_contratos set anonimizado_em = now() where id = c1;
  if exists (select 1 from cr_anexos where contrato_id = c1) then raise exception 'FALHOU [A30 anonimizar o contrato APAGA os anexos]'; end if; n := n + 1;
  if not exists (select 1 from cr_anexos where contrato_id = c3) or not exists (select 1 from cr_anexos where contrato_id = c2) then raise exception 'FALHOU [A31 anexos de outros contratos ficam]'; end if; n := n + 1;
  r := cr_anexo_adicionar(c1, 'outro', 'tarde.pdf', pdf);
  if (r ->> 'erro') is distinct from 'contrato_anonimizado' then raise exception 'FALHOU [A32 contrato anonimizado não recebe anexo: %]', r; end if; n := n + 1;

  -- A33 apagar o contrato leva os anexos junto (cascata)
  insert into cr_contratos (tipo, numero_contrato, nome_candidato, status) values ('clt', 'ANX-4', 'Teste Quatro', 'rascunho') returning id into c1;
  perform cr_anexo_adicionar(c1, 'outro', 'sera-apagado.pdf', pdf);
  if not exists (select 1 from cr_anexos where contrato_id = c1) then raise exception 'FALHOU [A33 pré-condição]'; end if;
  delete from cr_contratos where id = c1;
  if exists (select 1 from cr_anexos where contrato_id = c1) then raise exception 'FALHOU [A33 apagar o contrato leva os anexos]'; end if; n := n + 1;

  raise notice 'ANEXOS SQL: % verificações OK (tipo pelo conteúdo, 2 MB, 10 por contrato, duplicado, conteúdo só pela função, exclusão só admin, log sem nome, anonimização apaga)', n;
end $$;

-- o visitante (anon) não lê nem executa
do $$
declare ok boolean;
begin
  set local role anon;
  begin perform count(*) from cr_anexos; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [A34 anon lê cr_anexos]'; end if;
  begin perform cr_anexo_adicionar(1, 'outro', 'x.pdf', 'JVBERg=='); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [A35 anon executa adicionar]'; end if;
  begin perform cr_anexo_baixar(1); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [A36 anon executa baixar]'; end if;
  begin perform cr_anexo_excluir(1); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [A37 anon executa excluir]'; end if;
  reset role;
  raise notice 'ANEXOS SQL: permissões OK (anon bloqueado)';
end $$;
