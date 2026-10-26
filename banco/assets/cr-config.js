/* Configuração única. Nenhum outro arquivo declara URL/chave.
   SB_URL e SB_KEY vazios = MODO DEMONSTRAÇÃO: o sistema funciona inteiro no navegador (dados só neste computador), sem banco.
   Para usar de verdade: crie um projeto Supabase NOVO, rode sql/cab-schema.sql e preencha as duas linhas abaixo
   (a chave é a "publishable/anon", nunca a "secret"/"service_role"). */
window.CR_CONFIG = { SB_URL: '', SB_KEY: '', EMAILJS: { PUB_KEY: '', SVC_ID: '', TMPL_OTP: '' } };
window.CR_CONFIG.DEMO = !(window.CR_CONFIG.SB_URL && window.CR_CONFIG.SB_KEY);
/* Endereço público da pasta do sistema (links de assinatura). Vazio = endereço da página aberta. */
window.CR_CONFIG.BASE_URL_FIXA = '';
window.CR_CONFIG.BASE_URL = (window.CR_CONFIG.BASE_URL_FIXA || (location.origin + location.pathname.replace(/[^/]*$/, ''))).replace(/\/?$/, '/');
