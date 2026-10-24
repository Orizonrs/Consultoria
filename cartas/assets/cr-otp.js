/* R37 (M3): confirmação de identidade por código (OTP). Funções puras + chamadas ao servidor. Sem dependências (roda na tela pública e no painel).
   Quem decide é o SERVIDOR (cr_otp_* e cr_assinar); aqui só se formata, se traduz erro e se chama a função. O código NUNCA é gravado nem impresso no console. */
(function (g) {
  g.OTP_TENTATIVAS_MAX = 5;
  g.OTP_PRAZOS = [[15, '15 minutos'], [60, '1 hora'], [240, '4 horas'], [1440, '24 horas']];
  // só dígitos, no máximo 6 (aceita "123 456" e "123-456")
  g.otpLimpar = function (v) { return String(v == null ? '' : v).replace(/\D/g, '').slice(0, 6); };
  // devolve o código de 6 dígitos ou '' se não está completo
  g.otpCodigoValido = function (v) { var d = g.otpLimpar(v); return d.length === 6 ? d : ''; };
  g.otpExibir = function (c) { c = String(c == null ? '' : c); return c.length === 6 ? c.slice(0, 3) + ' ' + c.slice(3) : c; };
  g.otpQuando = function (iso) {
    var d = new Date(iso); if (isNaN(d)) return '—';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  var E = {
    codigo_ausente: 'Digite o código de 6 dígitos que a Orizon enviou para você.',
    codigo_bloqueado: 'Código bloqueado após 5 erros. Peça à Orizon um código novo.',
    codigo_expirado: 'O código venceu. Peça à Orizon um código novo.',
    codigo_nao_emitido: 'A Orizon ainda não gerou o seu código. Peça a ela e tente de novo.',
    aguardando_vez: 'Ainda não é a vez desta pessoa assinar: aguarda a assinatura anterior.',
    cancelado: 'Este contrato foi cancelado.',
    ja_assinado: 'Esta pessoa já assinou.',
    recusado: 'Esta pessoa recusou o documento.',
    expirado: 'O link expirou. Peça um novo à Orizon.',
    token_invalido: 'Link inválido.',
    link_vencido: 'O link venceu: prorrogue ou gere link novo antes de gerar o código.',
    minutos_invalido: 'Validade inválida (use de 5 minutos a 24 horas).',
    signatario_inexistente: 'Signatário não encontrado.',
    valor_invalido: 'Valor inválido.'
  };
  g.erroOtp = function (k, restantes) {
    if (k === 'codigo_invalido') {
      var r = Number(restantes);
      if (!(r > 0)) return 'Código incorreto.';
      return 'Código incorreto. ' + (r === 1 ? 'Resta 1 tentativa.' : 'Restam ' + r + ' tentativas.');
    }
    if (/^ja_/.test(String(k)) && !E[k]) return 'Esta pessoa já ' + String(k).slice(3) + '.';
    return E[k] || 'Não foi possível concluir. Tente novamente.';
  };
  g.erroOtpRede = function (err) {
    var m = (err && (err.message || '')) + '', c = err && err.code;
    if (c === '42501') return 'Sem permissão para isto.';
    if (c === 'PGRST202' || c === '42883' || /function|schema cache|does not exist/i.test(m)) return 'Esta função ainda não existe: rode sql/cr-schema.sql (R37).';
    return 'Não foi possível concluir. Nada foi alterado.';
  };
  // estado do código de um signatário, para o painel (linha de cr_signatarios)
  g.otpEstado = function (s, agora) {
    s = s || {};
    if (!s.otp_exigido) return { exigido: false, estado: 'desligado', cls: 'tag-gray', rotulo: 'Sem código: só o link' };
    var t = agora ? Date.parse(agora) : Date.now();
    if (!s.otp_emitido_em) return { exigido: true, estado: 'a_emitir', cls: 'tag-orange', rotulo: 'Código exigido: ainda não gerado' };
    if ((s.otp_tentativas || 0) >= g.OTP_TENTATIVAS_MAX) return { exigido: true, estado: 'bloqueado', cls: 'tag-red', rotulo: 'Código bloqueado (5 erros): gere outro' };
    if (s.otp_expira_em && Date.parse(s.otp_expira_em) < t) return { exigido: true, estado: 'expirado', cls: 'tag-red', rotulo: 'Código vencido: gere outro' };
    var n = s.otp_tentativas || 0;
    return { exigido: true, estado: 'valido', cls: 'tag-green', rotulo: 'Código gerado, vale até ' + g.otpQuando(s.otp_expira_em) + (n ? ' · ' + n + ' erro(s)' : '') };
  };
  // mensagem com o CÓDIGO (sem o link: o código vai por outro canal)
  g.otpMensagem = function (s, titulo, codigo, expira) {
    return 'Olá ' + s.nome + '! Seu código de confirmação para assinar "' + titulo + '" é ' + g.otpExibir(codigo)
      + '. Ele vale até ' + g.otpQuando(expira) + '. Não compartilhe este código com ninguém.';
  };
  async function rpc(fn, args) {
    try {
      var r = await g._sb.rpc(fn, args);
      if (r.error) { console.error(fn, r.error.code || ''); return { erro: g.erroOtpRede(r.error) }; }
      if (r.data && r.data.erro) return { erro: g.erroOtp(r.data.erro) };
      return r.data || {};
    } catch (e) { console.error(fn, 'falha'); return { erro: 'Não foi possível concluir. Nada foi alterado.' }; }
  }
  g.otpEmitir = function (sigId, minutos) { return rpc('cr_otp_emitir', { p_signatario: sigId, p_minutos: minutos }); };
  g.otpDefinir = function (sigId, exigir) { return rpc('cr_otp_definir', { p_signatario: sigId, p_exigir: !!exigir }); };
})(window);
