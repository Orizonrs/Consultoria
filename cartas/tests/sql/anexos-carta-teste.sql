-- R39 (M16): anexos em CARTAS, no PostgreSQL real (com o stub do Supabase). Faz parte de tests/sql/rodar-m15.sh
-- Usuários: A (admin) e B (operador). Refaz os perfis.
grant select, insert, update on cr_cartas to authenticated;
grant usage on all sequences in schema public to authenticated;
delete from cr_perfis;
insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@x.com'), ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@x.com') on conflict (id) do update set email = excluded.email;
delete from cr_cartas where numero_carta like 'AXC-%';

do $$
declare n int := 0; r json; k1 bigint; k2 bigint; id1 bigint; id2 bigint; ok boolean; i int; nm text; t text;
  pdf text := encode('%PDF-1.4 conteudo de teste'::bytea, 'base64');
  png text := encode('\x89504e470d0a1a0a0000000d49484452'::bytea, 'base64');
  jpg text := encode('\xffd8ffe000104a46494600'::bytea, 'base64');
begin
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  perform cr_definir_perfil('a@x.com', 'admin'); perform cr_definir_perfil('b@x.com', 'operador');
  insert into cr_cartas (numero_carta, nome, tipo_doc, dados) values ('AXC-1', 'Carta Um', 'carta_recomendacao', '{"cpf":"52998224725"}') returning id into k1;
  insert into cr_cartas (numero_carta, nome, tipo_doc) values ('AXC-2', 'Carta Dois', 'tce') returning id into k2;

  r := cr_anexo_carta_adicionar(k1, 'documento_pessoal', 'rg.pdf', pdf);
  if (r ->> 'ok') is distinct from 'true' or (r ->> 'tipo') <> 'pdf' then raise exception 'FALHOU [K01 PDF aceito: %]', r; end if; n := n + 1; id1 := (r ->> 'id')::bigint;
  r := cr_anexo_carta_adicionar(k1, 'outro', 'foto.png', png);
  if (r ->> 'tipo') is distinct from 'png' then raise exception 'FALHOU [K02 PNG aceito: %]', r; end if; n := n + 1; id2 := (r ->> 'id')::bigint;
  r := cr_anexo_carta_adicionar(k1, 'outro', 'foto.jpeg', jpg);
  if (r ->> 'tipo') is distinct from 'jpg' then raise exception 'FALHOU [K03 JPEG aceito: %]', r; end if; n := n + 1;
  r := cr_anexo_carta_adicionar(k1, 'outro', 'sem-extensao', encode('%PDF-1.7 outro'::bytea, 'base64'));
  if (r ->> 'tipo') is distinct from 'pdf' then raise exception 'FALHOU [K04 tipo vem do conteúdo: %]', r; end if; n := n + 1;
  -- recusas
  r := cr_anexo_carta_adicionar(k1, 'outro', 'virus.pdf', encode('MZ executavel disfarcado'::bytea, 'base64'));
  if (r ->> 'erro') is distinct from 'tipo_nao_aceito' then raise exception 'FALHOU [K05 executável com nome .pdf recusado: %]', r; end if; n := n + 1;
  r := cr_anexo_carta_adicionar(k1, 'outro', 'a.pdf', pdf);
  if (r ->> 'erro') is distinct from 'duplicado' then raise exception 'FALHOU [K06 mesmo arquivo não entra 2x: %]', r; end if; n := n + 1;
  r := cr_anexo_carta_adicionar(k2, 'outro', 'a.pdf', pdf);
  if (r ->> 'ok') is distinct from 'true' then raise exception 'FALHOU [K07 mesmo arquivo em OUTRA carta é permitido: %]', r; end if; n := n + 1;
  r := cr_anexo_carta_adicionar(k1, 'qualquer', 'x.pdf', encode('%PDF-1.4 x'::bytea, 'base64'));
  if (r ->> 'erro') is distinct from 'categoria_invalida' then raise exception 'FALHOU [K08 categoria inválida: %]', r; end if; n := n + 1;
  r := cr_anexo_carta_adicionar(k1, 'outro', 'x.pdf', '!!!não é base64!!!');
  if (r ->> 'erro') is distinct from 'arquivo_invalido' then raise exception 'FALHOU [K09 base64 inválido: %]', r; end if; n := n + 1;
  r := cr_anexo_carta_adicionar(k1, 'outro', 'x.pdf', '');
  if (r ->> 'erro') is distinct from 'vazio' then raise exception 'FALHOU [K10 vazio: %]', r; end if; n := n + 1;
  r := cr_anexo_carta_adicionar(k1, 'outro', 'grande.pdf', encode('%PDF'::bytea || decode(repeat('00', 2097152), 'hex'), 'base64'));
  if (r ->> 'erro') is distinct from 'grande' then raise exception 'FALHOU [K11 > 2 MB: %]', r; end if; n := n + 1;
  r := cr_anexo_carta_adicionar(-1, 'outro', 'x.pdf', pdf);
  if (r ->> 'erro') is distinct from 'carta_nao_encontrada' then raise exception 'FALHOU [K12 carta inexistente: %]', r; end if; n := n + 1;
  -- limite de 10
  for i in 1..6 loop r := cr_anexo_carta_adicionar(k1, 'outro', 'n' || i || '.pdf', encode(('%PDF-1.4 arquivo ' || i)::bytea, 'base64')); end loop;
  if (select count(*) from cr_anexos_carta where carta_id = k1) <> 10 then raise exception 'FALHOU [K13 chega a 10: %]', (select count(*) from cr_anexos_carta where carta_id = k1); end if; n := n + 1;
  r := cr_anexo_carta_adicionar(k1, 'outro', 'n11.pdf', encode('%PDF-1.4 arquivo 11'::bytea, 'base64'));
  if (r ->> 'erro') is distinct from 'limite' then raise exception 'FALHOU [K14 11º recusado: %]', r; end if; n := n + 1;
  -- nome saneado
  r := cr_anexo_carta_adicionar(k2, 'outro', 'C:\pasta\..\sub/ar<q>"u|i:v*o?.pdf', encode('%PDF-1.4 nome'::bytea, 'base64'));
  select nome into nm from cr_anexos_carta where id = (r ->> 'id')::bigint;
  if nm is distinct from 'ar_q__u_i_v_o_.pdf' then raise exception 'FALHOU [K15 nome saneado: %]', nm; end if; n := n + 1;
  -- hash correto
  if (select hash_sha256 from cr_anexos_carta where id = id1) <> encode(sha256('%PDF-1.4 conteudo de teste'::bytea), 'hex') then raise exception 'FALHOU [K16 hash SHA-256]'; end if; n := n + 1;
  -- baixar devolve o conteúdo
  r := cr_anexo_carta_baixar(id1);
  if (r ->> 'tipo') <> 'pdf' or decode(r ->> 'base64', 'base64') <> '%PDF-1.4 conteudo de teste'::bytea then raise exception 'FALHOU [K17 baixar]'; end if; n := n + 1;
  if (cr_anexo_carta_baixar(-5) ->> 'erro') is distinct from 'nao_encontrado' then raise exception 'FALHOU [K18 baixar inexistente]'; end if; n := n + 1;
  -- histórico: número da carta e categoria, nunca o nome do arquivo
  if not exists (select 1 from cr_log where acao = 'anexou_arquivo' and entidade = 'carta' and referencia = 'AXC-1' and detalhe = 'documento_pessoal') then raise exception 'FALHOU [K19 histórico da carta]'; end if; n := n + 1;
  if exists (select 1 from cr_log where entidade = 'carta' and acao in ('anexou_arquivo', 'excluiu_anexo') and (detalhe ~* 'rg\.pdf|foto|virus' or referencia ~* '\.pdf')) then raise exception 'FALHOU [K20 nome de arquivo fora do histórico]'; end if; n := n + 1;

  -- operador: anexa e baixa, NÃO exclui, NÃO lê o conteúdo direto
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
  set local role authenticated;
  r := cr_anexo_carta_adicionar(k2, 'outro', 'op.pdf', encode('%PDF-1.4 do operador'::bytea, 'base64'));
  if (r ->> 'ok') is distinct from 'true' then raise exception 'FALHOU [K22 operador anexa: %]', r; end if; n := n + 1;
  if (cr_anexo_carta_baixar(id1) ->> 'tipo') is distinct from 'pdf' then raise exception 'FALHOU [K23 operador baixa]'; end if; n := n + 1;
  begin perform cr_anexo_carta_excluir(id1); ok := false; exception when sqlstate '42501' then ok := true; end;
  if not ok then raise exception 'FALHOU [K24 operador não exclui]'; end if; n := n + 1;
  if (select count(*) from cr_anexos_carta where carta_id = k1) <> 10 then raise exception 'FALHOU [K25 operador LÊ a lista]'; end if; n := n + 1;
  begin perform dados from cr_anexos_carta limit 1; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [K26 conteúdo (dados) não é legível por select]'; end if; n := n + 1;
  begin insert into cr_anexos_carta (carta_id, categoria, nome, tipo, tamanho, hash_sha256, dados) values (k1, 'outro', 'x', 'pdf', 1, 'h', '\x00'); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [K27 escrita direta recusada]'; end if; n := n + 1;
  begin delete from cr_anexos_carta; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [K28 exclusão direta recusada]'; end if; n := n + 1;
  reset role;

  -- admin exclui
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
  r := cr_anexo_carta_excluir(id2);
  if (r ->> 'ok') is distinct from 'true' or exists (select 1 from cr_anexos_carta where id = id2) then raise exception 'FALHOU [K29 admin exclui: %]', r; end if; n := n + 1;
  if (cr_anexo_carta_excluir(id2) ->> 'erro') is distinct from 'nao_encontrado' then raise exception 'FALHOU [K30 excluir de novo]'; end if; n := n + 1;
  if not exists (select 1 from cr_log where acao = 'excluiu_anexo' and entidade = 'carta' and referencia = 'AXC-1' and detalhe = 'outro') then raise exception 'FALHOU [K31 exclusão no histórico]'; end if; n := n + 1;

  -- LGPD: anonimizar a carta APAGA os anexos dela (e só dela)
  update cr_cartas set nome = 'Titular anonimizado', dados = jsonb_build_object('anonimizado', true), anonimizado_em = now() where id = k1;
  if exists (select 1 from cr_anexos_carta where carta_id = k1) then raise exception 'FALHOU [K32 anonimizar apaga os anexos da carta]'; end if; n := n + 1;
  if not exists (select 1 from cr_anexos_carta where carta_id = k2) then raise exception 'FALHOU [K33 anexos de outra carta ficam]'; end if; n := n + 1;
  r := cr_anexo_carta_adicionar(k1, 'outro', 'depois.pdf', pdf);
  if (r ->> 'erro') is distinct from 'carta_anonimizada' then raise exception 'FALHOU [K34 carta anonimizada não recebe anexo: %]', r; end if; n := n + 1;
  -- apagar a carta apaga os anexos (cascade)
  delete from cr_cartas where id = k2;
  if exists (select 1 from cr_anexos_carta where carta_id = k2) then raise exception 'FALHOU [K35 cascade]'; end if; n := n + 1;
  raise notice 'ANEXOS CARTA SQL: % verificações OK (tipos pelo conteúdo, limites, hash, operador x admin, LGPD)', n;
end $$;

do $$
declare ok boolean;
begin
  set local role anon;
  begin perform cr_anexo_carta_adicionar(1, 'outro', 'x.pdf', 'JVBERg=='); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [anon executa adicionar]'; end if;
  begin perform cr_anexo_carta_baixar(1); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [anon executa baixar]'; end if;
  begin perform cr_anexo_carta_excluir(1); ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [anon executa excluir]'; end if;
  begin perform count(*) from cr_anexos_carta; ok := false; exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FALHOU [anon lê a tabela]'; end if;
  reset role;
  raise notice 'ANEXOS CARTA SQL: permissões OK (anon bloqueado)';
end $$;
