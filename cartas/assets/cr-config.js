/* Configuração única (RT-01). Nenhum outro arquivo declara URL/chave. */
window.CR_CONFIG={SB_URL:'https://zxivdljbpdpwijtporff.supabase.co',SB_KEY:'sb_publishable_tLn7etguMZxi9k_AfxVU_Q_-Kei11r-',EMAILJS:{PUB_KEY:'CqwVX5oNFjP42P-Z_',SVC_ID:'service_9mdik1p',TMPL_OTP:'template_6bxsapc'}};
/* BASE_URL: endereço público da pasta do sistema (usado nos links de assinatura enviados por WhatsApp/e-mail).
   Se o sistema roda em endereço fixo (ex.: https://orizon.com.br/documentos/), preencha BASE_URL_FIXA abaixo — assim o link
   sai certo mesmo quando você abre o sistema por localhost ou outro endereço. Vazio = usa o endereço da página aberta. */
window.CR_CONFIG.BASE_URL_FIXA = '';
window.CR_CONFIG.BASE_URL = (window.CR_CONFIG.BASE_URL_FIXA || (location.origin + location.pathname.replace(/[^/]*$/, ''))).replace(/\/?$/, '/');

/* R26 (M11): dias sem movimento para o painel de contratos sugerir um lembrete (selo 🔔). Só sugere; quem envia é a pessoa. */
window.CR_CONFIG.LEMBRETE_DIAS = 3;

/* R37 (M3): 'sim' = o Novo Contrato já vem com "Exigir código de 6 dígitos" marcado (a pessoa ainda pode trocar para "só o link" em cada contrato). Vazio/'nao' = só o link. */
window.CR_CONFIG.OTP_PADRAO = 'nao';

/* R25 (M6/LGPD): contato do encarregado/canal de privacidade mostrado no aviso da tela de assinatura (e-mail ou telefone).
   Vazio = o aviso manda o signatário falar com a Orizon pelo mesmo canal que enviou o link. PREENCHA com o contato oficial. */
window.CR_CONFIG.LGPD_CONTATO = '';
/* Aviso de privacidade (LGPD) das telas de assinatura. Texto descreve SÓ o que o sistema registra de fato (cr_assinar / cr_carta_assinar:
   nome, imagem da assinatura, data/hora, IP, navegador/dispositivo, hash). Revisar com o jurídico (ver ROTEIRO, R25). */
window.crAvisoLGPD = function () {
  var e = function (x) { return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var c = (window.CR_CONFIG.LGPD_CONTATO || '').trim();
  var contato = c ? 'Para exercer seus direitos ou tirar dúvidas, fale com a Orizon Consultoria e Gestão: <b>' + e(c) + '</b>.'
                  : 'Para exercer seus direitos ou tirar dúvidas, fale com a Orizon Consultoria e Gestão pelo mesmo canal que lhe enviou este link.';
  return '<div id="avisoLGPD" style="border:1px solid rgba(128,128,128,.4);border-radius:10px;padding:.7rem .85rem;margin:.7rem 0;font-size:.76rem;line-height:1.6">'
    + '<b>🔒 Aviso de privacidade (LGPD)</b><br>'
    + 'Para esta assinatura, a Orizon Consultoria e Gestão trata seu nome, a imagem da sua assinatura, a data e a hora, o endereço IP e dados do navegador/dispositivo, '
    + 'além do conteúdo do documento, para registrar e comprovar a assinatura eletrônica e a integridade do documento.'
    + '<details style="margin-top:.4rem"><summary style="cursor:pointer;font-weight:700">Saiba mais</summary>'
    + '<ul style="margin:.4rem 0 0;padding-left:1.1rem">'
    + '<li><b>Quem trata:</b> Orizon Consultoria e Gestão (controladora).</li>'
    + '<li><b>Para quê:</b> formalizar o documento, comprovar quem assinou e quando, e manter a trilha de auditoria contra fraude.</li>'
    + '<li><b>Base legal:</b> execução de contrato ou de procedimentos preliminares e exercício regular de direitos (LGPD, art. 7º, V e VI).</li>'
    + '<li><b>Por quanto tempo:</b> pelo tempo necessário para essa finalidade e para cumprir obrigações legais.</li>'
    + '<li><b>Seus direitos (art. 18):</b> confirmar o tratamento, acessar e corrigir dados, pedir informações sobre compartilhamento e, quando cabível, eliminação ou anonimização. '
    + 'Alguns dados não podem ser apagados enquanto forem necessários para comprovar a assinatura.</li>'
    + '</ul><div style="margin-top:.4rem">' + contato + '</div></details></div>';
};
