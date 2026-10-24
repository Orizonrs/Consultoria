// R25 (M6): testa o aviso de privacidade das telas de assinatura. Sem dependências: node tests/lgpd-test.js
const fs=require('fs'),path=require('path'),vm=require('vm'),root=path.join(__dirname,'..');
const rd=f=>fs.readFileSync(path.join(root,f),'utf8');
function carregar(contato){const w={};const sb={window:w,location:{origin:'https://x.com',pathname:'/d/index.html'}};vm.createContext(sb);vm.runInContext(rd('assets/cr-config.js'),sb);if(contato!==undefined)w.CR_CONFIG.LGPD_CONTATO=contato;return w;}
let falhas=0;const t=(n,ok)=>{console.log((ok?'ok   ':'FALHOU ')+n);if(!ok)falhas++;};
const base=carregar().crAvisoLGPD();
t('função existe e devolve HTML',typeof base==='string'&&base.includes('avisoLGPD'));
['nome','assinatura','data','hora','IP','navegador/dispositivo','integridade','art. 7º','art. 18','Orizon Consultoria'].forEach(x=>t('menciona "'+x+'"',base.includes(x)));
t('sem contato configurado manda falar pelo mesmo canal do link',base.includes('mesmo canal que lhe enviou este link'));
const com=carregar('privacidade@exemplo.com').crAvisoLGPD();
t('com contato configurado mostra o contato',com.includes('privacidade@exemplo.com')&&!com.includes('mesmo canal'));
const xss=carregar('<img src=x onerror=alert(1)>').crAvisoLGPD();
t('contato é escapado (sem HTML injetado)',!xss.includes('<img')&&xss.includes('&lt;img'));
t('não promete o que o sistema não faz (sem "vend", "apagamos tudo", "nunca")',!/vend|apagamos tudo|nunca/i.test(base));
const ac=rd('assinar-contrato.html');
t('assinar-contrato.html usa o aviso e carrega cr-config.js antes',ac.includes('window.crAvisoLGPD()')&&ac.indexOf('assets/cr-config.js')<ac.indexOf('crAvisoLGPD'));
const a=rd('assinar.html');
t('assinar.html tem lgpdBox e preenche depois de carregar cr-config.js',a.includes('id="lgpdBox"')&&a.indexOf('assets/cr-config.js')<a.indexOf('getElementById("lgpdBox").innerHTML'));
console.log(falhas?'\n'+falhas+' falha(s)':'\nTodos OK');process.exit(falhas?1:0);
