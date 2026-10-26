/* cab-carta.js — regras puras da carta de abertura de conta (sem DOM): validações, texto-modelo, hash e código. */
(function () {
  var CAB = window.CAB = {};
  CAB.soDig = function (s) { return String(s == null ? '' : s).replace(/\D/g, ''); };
  CAB.esc = function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  CAB.validarCPF = function (v) {
    var c = CAB.soDig(v); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    for (var t = 9; t < 11; t++) { var s = 0; for (var i = 0; i < t; i++) s += +c[i] * (t + 1 - i); var d = (s * 10) % 11 % 10; if (d !== +c[t]) return false; }
    return true;
  };
  CAB.validarCNPJ = function (v) {
    var c = CAB.soDig(v); if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    for (var t = 12; t < 14; t++) { var s = 0, p = t - 7; for (var i = 0; i < t; i++) { s += +c[i] * p--; if (p < 2) p = 9; } var d = s % 11 < 2 ? 0 : 11 - s % 11; if (d !== +c[t]) return false; }
    return true;
  };
  CAB.fmtCPF = function (v) { var c = CAB.soDig(v); return c.length === 11 ? c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : String(v || ''); };
  CAB.fmtCNPJ = function (v) { var c = CAB.soDig(v); return c.length === 14 ? c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : String(v || ''); };
  CAB.mascararCPF = function (v) { var c = CAB.soDig(v); return c.length === 11 ? '***.' + c.slice(3, 6) + '.' + c.slice(6, 9) + '-**' : '—'; };
  CAB.mascararCNPJ = function (v) { var c = CAB.soDig(v); return c.length === 14 ? '**.' + c.slice(2, 5) + '.' + c.slice(5, 8) + '/****-**' : '—'; };
  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  CAB.dataExtenso = function (iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? (+m[3]) + ' de ' + MESES[+m[2] - 1] + ' de ' + m[1] : ''; };
  CAB.hojeISO = function () { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };

  CAB.TIPOS_CONTA = { pj: 'conta corrente pessoa jurídica', pf: 'conta corrente pessoa física', salario: 'conta salário', pagamento: 'conta de pagamento' };
  CAB.TIPOS_ROTULO = { pj: 'PJ', pf: 'PF', salario: 'Salário', pagamento: 'Pagamento' };

  // ── Textos-modelo (MODELOS — revisar com advogado e com o banco antes de usar) ──
  CAB.MODELO_PADRAO =
    'CARTA DE APRESENTAÇÃO PARA ABERTURA DE CONTA\n\n' +
    '{{cidade}}, {{data_extenso}}.\n\n' +
    'Ao\n{{banco}}{{#agencia}} — Agência {{agencia}}{{/agencia}}\nA/C Gerência de Relacionamento / Abertura de Contas\n\n' +
    'Prezados Senhores,\n\n' +
    'A {{razao_social}}, inscrita no CNPJ sob nº {{cnpj}}, com sede em {{endereco}}, vem, por meio desta, apresentar {{nome_titular}}, portador(a) do CPF nº {{cpf}}, {{cargo_vinculo}}, a fim de que seja realizada a abertura de {{tipo_conta}}, destinada a {{finalidade}}.\n\n' +
    '{{#poderes}}O(A) apresentado(a) está autorizado(a) a {{poderes}}.\n\n{{/poderes}}' +
    'Colocamo-nos à disposição para fornecer os documentos e informações adicionais exigidos pela instituição, em conformidade com as normas de identificação de clientes aplicáveis.\n\n' +
    'Atenciosamente,';
  CAB.MODELO_PF =
    'CARTA DE SOLICITAÇÃO DE ABERTURA DE CONTA\n\n' +
    '{{cidade}}, {{data_extenso}}.\n\n' +
    'Ao\n{{banco}}{{#agencia}} — Agência {{agencia}}{{/agencia}}\nA/C Gerência de Relacionamento / Abertura de Contas\n\n' +
    'Prezados Senhores,\n\n' +
    'Eu, {{nome_titular}}, portador(a) do CPF nº {{cpf}}, {{cargo_vinculo}}, venho, por meio desta, solicitar a abertura de {{tipo_conta}}, destinada a {{finalidade}}.\n\n' +
    'Coloco-me à disposição para apresentar os documentos e informações adicionais exigidos pela instituição, em conformidade com as normas de identificação de clientes aplicáveis.\n\n' +
    'Atenciosamente,';
  CAB.MODELOS_PADRAO = [
    { nome: 'Carta de apresentação para abertura de conta (empresa → banco)', tipo: 'empresa_banco', texto: CAB.MODELO_PADRAO, ativo: true },
    { nome: 'Carta de solicitação de abertura de conta (pessoa física)', tipo: 'pessoa_fisica', texto: CAB.MODELO_PF, ativo: true }
  ];
  CAB.TIPO_MODELO = { empresa_banco: 'Empresa → banco', pessoa_fisica: 'Pessoa física', autorizacao: 'Autorização' };
  CAB.tipoModeloDaConta = function (tc) { return tc === 'pf' ? 'pessoa_fisica' : 'empresa_banco'; };
  CAB.VARIAVEIS = ['cidade', 'data_extenso', 'banco', 'agencia', 'razao_social', 'cnpj', 'endereco', 'nome_titular', 'cpf', 'cargo_vinculo', 'tipo_conta', 'finalidade', 'poderes', 'responsavel', 'cargo_responsavel', 'numero'];

  // {{#x}}...{{/x}} entra só se x tiver valor; {{x}} sem valor vira [x] (fica visível para a pessoa corrigir)
  CAB.renderModelo = function (modelo, v) {
    v = v || {};
    var t = String(modelo || '').replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, function (_, k, corpo) { return v[k] ? corpo : ''; });
    return t.replace(/\{\{(\w+)\}\}/g, function (_, k) { return v[k] ? v[k] : '[' + k + ']'; });
  };
  CAB.variaveisFaltando = function (modelo, v) {
    var t = String(modelo || '').replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, function (_, k, c) { return (v || {})[k] ? c : ''; }), out = [], m, re = /\{\{(\w+)\}\}/g;
    while ((m = re.exec(t))) if (!(v || {})[m[1]] && out.indexOf(m[1]) < 0) out.push(m[1]);
    return out;
  };
  CAB.montarVars = function (d, numero) {
    d = d || {};
    return {
      cidade: d.cidade || '', data_extenso: CAB.dataExtenso(d.data), banco: d.banco_nome || '', agencia: d.agencia || '',
      razao_social: d.razao_social || '', cnpj: CAB.fmtCNPJ(d.cnpj), endereco: d.endereco || '',
      nome_titular: d.titular_nome || '', cpf: CAB.fmtCPF(d.cpf), cargo_vinculo: d.cargo_vinculo || '',
      tipo_conta: CAB.TIPOS_CONTA[d.tipo_conta] || '', finalidade: d.finalidade || '', poderes: d.poderes || '',
      responsavel: d.responsavel || '', cargo_responsavel: d.cargo_responsavel || '', numero: numero || ''
    };
  };

  // Validação por tipo de conta. Devolve { campo: 'mensagem' } (vazio = ok).
  CAB.validar = function (d) {
    var e = {}; d = d || {}; var pf = d.tipo_conta === 'pf';
    var req = function (k, msg) { if (!String(d[k] || '').trim()) e[k] = msg || 'Obrigatório.'; };
    req('tipo_conta'); req('banco_nome'); req('cidade'); req('data'); req('titular_nome'); req('cargo_vinculo'); req('finalidade');
    if (!pf) { req('razao_social'); req('endereco'); req('responsavel'); req('cargo_responsavel'); if (d.cnpj !== undefined || true) { if (!CAB.validarCNPJ(d.cnpj)) e.cnpj = 'CNPJ inválido.'; } }
    if (!CAB.validarCPF(d.cpf)) e.cpf = 'CPF inválido.';
    if (d.email_titular && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email_titular)) e.email_titular = 'E-mail inválido.';
    if (d.data && !CAB.dataExtenso(d.data)) e.data = 'Data inválida.';
    return e;
  };

  // ── Hash SHA-256 (hex) e código de verificação ──
  function sha256Puro(str) {
    var u = unescape(encodeURIComponent(str)), l = u.length, b = [], i;
    for (i = 0; i < l; i++) b[i >> 2] = (b[i >> 2] | 0) | (u.charCodeAt(i) << (24 - (i % 4) * 8));
    var K = [], H = [], p = 2, n = 0;
    function prim(x) { for (var f = 2; f * f <= x; f++) if (x % f === 0) return false; return true; }
    function fr(x) { return ((x - Math.floor(x)) * 4294967296) | 0; }
    for (; n < 64; p++) if (prim(p)) { if (n < 8) H[n] = fr(Math.pow(p, .5)); K[n++] = fr(Math.pow(p, 1 / 3)); }
    b[l >> 2] = (b[l >> 2] | 0) | (0x80 << (24 - (l % 4) * 8));
    var nw = ((l * 8 + 64 >> 9) << 4) + 16; for (i = 0; i < nw; i++) b[i] = b[i] | 0; b[nw - 1] = l * 8;
    var w = new Array(64);
    for (var o = 0; o < nw; o += 16) {
      var a = H.slice(0, 8), j;
      for (j = 0; j < 64; j++) {
        if (j < 16) w[j] = b[o + j]; else {
          var g0 = w[j - 15], g1 = w[j - 2];
          w[j] = (w[j - 16] + (((g0 >>> 7) | (g0 << 25)) ^ ((g0 >>> 18) | (g0 << 14)) ^ (g0 >>> 3)) + w[j - 7] + (((g1 >>> 17) | (g1 << 15)) ^ ((g1 >>> 19) | (g1 << 13)) ^ (g1 >>> 10))) | 0;
        }
        var e = a[4], ch = (e & a[5]) ^ (~e & a[6]), ma = (a[0] & a[1]) ^ (a[0] & a[2]) ^ (a[1] & a[2]);
        var s0 = ((a[0] >>> 2) | (a[0] << 30)) ^ ((a[0] >>> 13) | (a[0] << 19)) ^ ((a[0] >>> 22) | (a[0] << 10));
        var s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var t1 = (a[7] + s1 + ch + K[j] + w[j]) | 0, t2 = (s0 + ma) | 0;
        a = [(t1 + t2) | 0, a[0], a[1], a[2], (a[3] + t1) | 0, a[4], a[5], a[6]];
      }
      for (j = 0; j < 8; j++) H[j] = (H[j] + a[j]) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }
  CAB.sha256Puro = sha256Puro;
  CAB.sha256 = function (txt) {
    try {
      if (window.crypto && crypto.subtle && window.TextEncoder) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
        });
      }
    } catch (e) {}
    return Promise.resolve(sha256Puro(txt));
  };
  CAB.gerarCodigo = function () {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '', r = new Uint8Array(10);
    try { crypto.getRandomValues(r); } catch (e) { for (var i = 0; i < 10; i++) r[i] = Math.floor(Math.random() * 256); }
    for (var k = 0; k < 10; k++) out += A[r[k] % A.length];
    return out;
  };

  // ── Texto → HTML da folha ──
  CAB.corpoHTML = function (texto, destacar) {
    var ps = String(texto || '').split(/\n\n/);
    return ps.map(function (p, i) {
      var h = CAB.esc(p).replace(/\n/g, '<br/>');
      if (destacar) h = h.replace(/\[(\w+)\]/g, '<mark class="sh-ph">[$1]</mark>');
      return (i === 0 && /^[^a-zà-ú]{6,90}$/.test(p) ? '<h1 class="sh-tit">' : '<p>') + h + (i === 0 && /^[^a-zà-ú]{6,90}$/.test(p) ? '</h1>' : '</p>');
    }).join('');
  };
  CAB.linhaRodape = function (B) {
    B = B || {}; var p = [];
    if (B.nome) p.push(B.nome); if (B.cnpj) p.push('CNPJ ' + B.cnpj); if (B.endereco) p.push(B.endereco); if (B.email) p.push(B.email); if (B.telefone) p.push(B.telefone);
    return p.join(' · ');
  };
  // Folha A4 completa (cabeçalho com logo, corpo, assinatura, código de verificação, rodapé)
  CAB.folhaHTML = function (c, opts) {
    opts = opts || {}; var B = window.CR_BRAND || {}, d = c.dados || {}, pf = d.tipo_conta === 'pf';
    var quem = pf ? (d.titular_nome || '') : (d.responsavel || ''), cargo = pf ? 'Titular' : (d.cargo_responsavel || '');
    var ass = opts.semAssinatura ? '' : '<div class="sh-ass"><div class="sh-linha"></div><b>' + CAB.esc(quem || '[responsável]') + '</b><br/>' + CAB.esc(cargo) + (pf ? '' : '<br/>' + CAB.esc(d.razao_social || '')) + '</div>';
    return '<div class="sheet' + (c.cancelada ? ' cancelada' : '') + '">' +
      '<div class="sh-head"><img class="sh-logo" src="' + (B.logo || '') + '" alt=""/><div class="sh-emp"><b>' + CAB.esc(B.nome || '') + '</b><span>' + CAB.esc(B.sistema || '') + '</span></div>' +
      '<div class="sh-num">' + (c.numero ? 'Nº <b class="mono">' + CAB.esc(c.numero) + '</b>' : '<i>pré-visualização</i>') + '</div></div>' +
      '<div class="sh-corpo">' + CAB.corpoHTML(c.texto, opts.destacar) + '</div>' + ass +
      (c.codigo ? '<div class="sh-cod">Documento nº <b class="mono">' + CAB.esc(c.numero) + '</b> · Código de verificação: <b class="mono">' + CAB.esc(c.codigo) + '</b></div>' : '') +
      (c.cancelada ? '<div class="sh-marca">CANCELADA</div>' : '') +
      '<div class="sh-foot">' + CAB.esc(CAB.linhaRodape(B) || (B.nome || '')) + '</div></div>';
  };
})();
