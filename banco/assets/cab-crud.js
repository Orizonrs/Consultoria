/* cab-crud.js — tela de cadastro genérica (lista + busca + modal) usada por empresas, bancos e clientes/titulares. */
window.CABCrud = (function () {
  var cfg, L = [], ED = null;
  function val(k) { var e = document.getElementById('c_' + k); return e ? e.value.trim() : ''; }
  function celula(c, r) { var v = r[c.k]; if (c.mask === 'cpf') return CAB.mascararCPF(v); if (c.mask === 'cnpj') return CAB.mascararCNPJ(v); return CAB.esc(v || '—'); }
  function desenhar() {
    var q = (document.getElementById('busca').value || '').trim().toLowerCase();
    var l = L.filter(function (r) { return !q || cfg.campos.map(function (c) { return r[c.k] || ''; }).join(' ').toLowerCase().indexOf(q) >= 0; });
    document.getElementById('cnt').textContent = L.length + ' ' + (L.length === 1 ? cfg.singular : cfg.plural);
    document.getElementById('tb').innerHTML = l.length ? l.map(function (r) {
      return '<tr>' + cfg.colunas.map(function (k) { var c = cfg.campos.filter(function (x) { return x.k === k; })[0]; return '<td>' + (k === cfg.colunas[0] ? '<strong>' + celula(c, r) + '</strong>' : celula(c, r)) + '</td>'; }).join('') +
        '<td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" onclick="CABCrud.abrir(' + r.id + ')">✏️ Editar</button> <button class="btn btn-red btn-sm" onclick="CABCrud.excluir(' + r.id + ')">🗑</button></td></tr>';
    }).join('') : '<tr><td colspan="' + (cfg.colunas.length + 1) + '"><div class="empty"><span>' + cfg.icone + '</span>Nenhum cadastro' + (q ? ' encontrado' : ' ainda') + '. <a href="#" onclick="CABCrud.abrir();return false" style="color:var(--accent)">Cadastrar ' + cfg.singular + ' →</a></div></td></tr>';
  }
  async function carregar() { var r = await _sb.from(cfg.tabela).select('*').order('id', { ascending: false }); if (r.error) { toast('Erro: ' + r.error.message, 'err'); return; } L = r.data || []; desenhar(); }
  function abrir(id) {
    ED = id ? L.filter(function (r) { return r.id === id; })[0] : null; var r = ED || {};
    document.getElementById('mt').textContent = (ED ? 'Editar ' : 'Novo ') + cfg.singular;
    document.getElementById('mf').innerHTML = cfg.campos.map(function (c) {
      return '<div class="form-group"><label class="fl" for="c_' + c.k + '">' + c.l + (c.req ? ' <span class="req">*</span>' : '') + '</label><input class="fi" id="c_' + c.k + '" value="' + CAB.esc(c.mask === 'cpf' ? CAB.fmtCPF(r[c.k]) : c.mask === 'cnpj' ? CAB.fmtCNPJ(r[c.k]) : (r[c.k] || '')) + '"' +
        (c.mask === 'cpf' ? ' oninput="maskCPF(this)"' : c.mask === 'cnpj' ? ' oninput="maskCNPJ(this)"' : c.mask === 'tel' ? ' oninput="maskTel(this)"' : '') + ' placeholder="' + CAB.esc(c.ph || '') + '"/><div class="f-err" id="x_' + c.k + '"></div></div>';
    }).join('');
    document.getElementById('modal').classList.add('open'); var p = document.querySelector('#mf .fi'); if (p) p.focus();
  }
  function fechar() { document.getElementById('modal').classList.remove('open'); }
  async function salvar() {
    var o = {}, ok = true; cfg.campos.forEach(function (c) { var v = val(c.k); if (c.mask === 'cpf' || c.mask === 'cnpj') v = CAB.soDig(v); o[c.k] = v; var m = '';
      if (c.req && !v) m = 'Obrigatório.'; else if (v && c.mask === 'cpf' && !CAB.validarCPF(v)) m = 'CPF inválido.'; else if (v && c.mask === 'cnpj' && !CAB.validarCNPJ(v)) m = 'CNPJ inválido.'; else if (v && c.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) m = 'E-mail inválido.';
      document.getElementById('x_' + c.k).textContent = m; document.getElementById('c_' + c.k).classList.toggle('err', !!m); if (m) ok = false; });
    if (!ok) return toast('Corrija os campos destacados.', 'wrn');
    var r = ED ? await _sb.from(cfg.tabela).update(o).eq('id', ED.id) : await _sb.from(cfg.tabela).insert(o);
    if (r.error) return toast('Erro: ' + r.error.message, 'err'); logAcao(cfg.tabela + (ED ? '_editado' : '_criado')); toast('Cadastro salvo.'); fechar(); carregar();
  }
  async function excluir(id) { if (!confirm('Excluir este cadastro? Cartas já emitidas não são afetadas.')) return; var r = await _sb.from(cfg.tabela).delete().eq('id', id); if (r.error) return toast('Erro: ' + r.error.message, 'err'); toast('Cadastro excluído.', 'wrn'); carregar(); }
  return { init: function (c) { cfg = c; crPronto().then(carregar); document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fechar(); }); }, abrir: abrir, fechar: fechar, salvar: salvar, excluir: excluir, desenhar: desenhar };
})();
