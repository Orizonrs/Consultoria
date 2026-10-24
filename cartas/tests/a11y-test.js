const {JSDOM}=require('jsdom');const fs=require('fs');
const html=`<body><aside class="sidebar"><a class="sb-item active" href="x">A</a><a class="sb-item" href="y">B</a></aside>
<button class="mob-menu-btn">☰</button><div class="content"><div class="form-group"><label class="fl">Nome</label><input class="fi"/></div>
<button title="Excluir">🗑️</button><button title="Salvar">Salvar</button><canvas></canvas></div><div id="toast-ct"></div></body>`;
const d=new JSDOM(html,{runScripts:'outside-only'});
d.window.eval(fs.readFileSync(process.argv[2],'utf8'));
setTimeout(()=>{const D=d.window.document;const r=[];
r.push(['skip link',!!D.getElementById('crSkip')]);
r.push(['nav role',D.querySelector('aside').getAttribute('role')==='navigation']);
r.push(['aria-current só no ativo',D.querySelectorAll('[aria-current=page]').length===1]);
r.push(['label for',D.querySelector('label').getAttribute('for')===D.querySelector('input').id&&!!D.querySelector('input').id]);
r.push(['botão ícone ganha aria-label',D.querySelector('button[title=Excluir]').getAttribute('aria-label')==='Excluir']);
r.push(['botão com texto não muda',!D.querySelector('button[title=Salvar]').getAttribute('aria-label')]);
r.push(['menu mobile',D.querySelector('.mob-menu-btn').getAttribute('aria-label')==='Abrir menu']);
r.push(['toast live',D.getElementById('toast-ct').getAttribute('aria-live')==='polite']);
r.push(['canvas descrito',D.querySelector('canvas').getAttribute('role')==='img']);
r.forEach(x=>console.log(x[1]?'ok  ':'FALHA',x[0]));process.exit(0)},400);
