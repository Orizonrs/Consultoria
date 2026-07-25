#!/usr/bin/env node
/**
 * limpar-vagas-expiradas.js
 * ──────────────────────────────────────────────────────────────────
 * Lê o vagas.html, calcula quais vagas já passaram do prazo de
 * expiração (mesmas regras já usadas no site: 60 dias para vagas com
 * link de sistema, 15 dias para vagas só com WhatsApp/e-mail) e
 * REMOVE essas vagas de verdade do array `vagas` no arquivo.
 *
 * Uso:
 *   node limpar-vagas-expiradas.js [caminho/para/vagas.html]
 *
 * Se nenhum caminho for passado, procura "vagas.html" na raiz do repo.
 *
 * Por padrão, antes de remover, guarda uma cópia das vagas removidas
 * em vagas-removidas.log.jsonl (uma linha JSON por vaga, com a data
 * da remoção) — isso NÃO aparece no site, é só um histórico seu, caso
 * precise consultar depois. Para desativar, rode com ARQUIVAR=0.
 * ──────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");

const ARQUIVO = process.argv[2] || path.join(process.cwd(), "vagas.html");
const ARQUIVAR = process.env.ARQUIVAR !== "0";
const LOG_PATH = path.join(path.dirname(ARQUIVO), "vagas-removidas.log.jsonl");

function main() {
  if (!fs.existsSync(ARQUIVO)) {
    console.error(`Arquivo não encontrado: ${ARQUIVO}`);
    process.exit(1);
  }

  const html = fs.readFileSync(ARQUIVO, "utf8");

  // 1) Localiza o bloco "const vagas = [ ... ];"
  const inicioMarcador = "const vagas = [";
  const inicioIdx = html.indexOf(inicioMarcador);
  if (inicioIdx === -1) {
    console.error('Não encontrei "const vagas = [" no arquivo. Nada foi alterado.');
    process.exit(1);
  }
  const fimIdx = html.indexOf("\n];", inicioIdx);
  if (fimIdx === -1) {
    console.error('Não encontrei o fechamento "];" do array. Nada foi alterado.');
    process.exit(1);
  }

  const arrayTexto = html.slice(inicioIdx + "const vagas = ".length, fimIdx + 2);

  // 2) Localiza os limites de expiração já definidos no arquivo
  //    (para não precisar duplicar/manter em dois lugares).
  const limites = extrairLimites(html);

  // 3) Avalia o array como JS de verdade (é um literal de array/objeto puro)
  let vagas;
  try {
    vagas = new Function(`"use strict"; return (${arrayTexto});`)();
  } catch (err) {
    console.error("Erro ao interpretar o array de vagas:", err.message);
    process.exit(1);
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const mantidas = [];
  const removidas = [];

  for (const v of vagas) {
    const pub = new Date(v.dataPublicacao + "T00:00:00");
    const dias = Math.floor((hoje - pub) / 86400000);
    const limite = v.linkSistema ? limites.LIMITE_DIAS_LINK : limites.LIMITE_DIAS_CONTATO;
    const expirada = dias > limite;
    if (expirada) {
      removidas.push({ ...v, diasNoAr: dias, limiteAplicado: limite });
    } else {
      mantidas.push(v);
    }
  }

  if (removidas.length === 0) {
    console.log("Nenhuma vaga expirada encontrada. Nada foi alterado.");
    return;
  }

  // 4) Arquiva as removidas (opcional, mas ligado por padrão)
  if (ARQUIVAR) {
    const linhas = removidas
      .map((v) => JSON.stringify({ removidaEm: hoje.toISOString().slice(0, 10), ...v }))
      .join("\n") + "\n";
    fs.appendFileSync(LOG_PATH, linhas, "utf8");
  }

  // 5) Regenera o texto do array e substitui no arquivo original
  const novoArrayTexto = serializarVagas(mantidas);
  const novoHtml =
    html.slice(0, inicioIdx) +
    "const vagas = " +
    novoArrayTexto +
    html.slice(fimIdx + 2);

  fs.writeFileSync(ARQUIVO, novoHtml, "utf8");

  console.log(`Removidas ${removidas.length} vaga(s) expirada(s):`);
  for (const v of removidas) {
    console.log(`  - ${v.empresa} — ${v.cargo} (publicada ${v.dataPublicacao}, ${v.diasNoAr} dias, limite ${v.limiteAplicado})`);
  }
  console.log(`Restaram ${mantidas.length} vaga(s) no arquivo.`);
  if (ARQUIVAR) console.log(`Histórico salvo em: ${LOG_PATH}`);
}

function extrairLimites(html) {
  const pegar = (nome, padrao) => {
    const m = html.match(new RegExp(`${nome}\\s*=\\s*(\\d+)`));
    return m ? Number(m[1]) : padrao;
  };
  return {
    LIMITE_DIAS_LINK: pegar("LIMITE_DIAS_LINK", 60),
    LIMITE_DIAS_CONTATO: pegar("LIMITE_DIAS_CONTATO", 15),
  };
}

function jsStr(v) {
  return JSON.stringify(v == null ? "" : v);
}

function serializarVagas(lista) {
  if (lista.length === 0) return "[\n];";
  const blocos = lista.map((v) => {
    const req = Array.isArray(v.requisitos) && v.requisitos.length
      ? `[${v.requisitos.map(jsStr).join(", ")}]`
      : "[]";
    return [
      "  {",
      `    empresa: ${jsStr(v.empresa)},`,
      `    cargo: ${jsStr(v.cargo)},`,
      `    numeroVagas: ${Number(v.numeroVagas) || 1},`,
      `    area: ${jsStr(v.area)},`,
      `    local: ${jsStr(v.local)},`,
      `    tipo: ${jsStr(v.tipo)},`,
      `    dataPublicacao: ${jsStr(v.dataPublicacao)},`,
      `    linkSistema: ${jsStr(v.linkSistema)},`,
      `    email: ${jsStr(v.email)},`,
      `    whatsapp: ${jsStr(v.whatsapp)},`,
      `    mensagemWhats: ${jsStr(v.mensagemWhats)},`,
      `    descricao: ${jsStr(v.descricao)},`,
      `    requisitos: ${req}`,
      "  }",
    ].join("\n");
  });
  return "[\n" + blocos.join(",\n") + "\n];";
}

main();
