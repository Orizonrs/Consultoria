// Uso: node tests/run-tests.js  (a partir da pasta do sistema)
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..'),rd=f=>fs.readFileSync(path.join(root,f),'utf8');
const htmls=()=>fs.readdirSync(root).filter(f=>f.endsWith('.html'));
const pages=p=>p==='*.html'?htmls():p;
const scripts=f=>{const h=rd(f);let out=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  for(const m of h.matchAll(/<script src="(assets\/[^"]+)"/g)) if(fs.existsSync(path.join(root,m[1]))) out.push(rd(m[1]));return out;};
const C={
 fileExists:c=>fs.existsSync(path.join(root,c.file))?null:'não existe '+c.file,
 removed:c=>fs.existsSync(path.join(root,c.file))?'ainda existe':htmls().some(f=>rd(f).includes(c.file))?'ainda referenciado':null,
 contains:c=>rd(c.file).includes(c.text)?null:'não contém: '+c.text,
 notContainsAny:c=>{const bad=[];pages(c.pages).forEach(f=>c.text.forEach(t=>{if(rd(f).includes(t))bad.push(f+' → '+t)}));return bad.length?bad.join('; '):null},
 noRedeclare:c=>{const bad=[];pages(c.pages).forEach(f=>{const seen={};scripts(f).forEach((s,i)=>{const names=new Set([...s.matchAll(/^(?:const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]));names.forEach(n=>{if(seen[n]!==undefined&&seen[n]!==i)bad.push(f+' → '+n);seen[n]=i})})});return bad.length?bad.join('; '):null},
 orderBefore:c=>{const bad=c.pages.filter(f=>{const h=rd(f),a=h.indexOf(c.first),b=h.indexOf(c.then);return a<0||b<0||a>b});return bad.length?bad.join(', '):null},
 shellOnly:c=>{const bad=c.pages.filter(f=>{const h=rd(f);return !h.includes('assets/cr-shell.js')||/<a class="sb-item/.test(h)});return bad.length?bad.join(', '):null},
 jsSyntax:()=>{const bad=[];htmls().forEach(f=>scripts(f).forEach((s,i)=>{try{new vm.Script(s)}catch(e){bad.push(f+'#'+i+': '+e.message)}}));fs.readdirSync(path.join(root,'assets')).filter(f=>f.endsWith('.js')).forEach(f=>{try{new vm.Script(rd('assets/'+f))}catch(e){bad.push(f+': '+e.message)}});return bad.length?bad.join('; '):null},
 unit:c=>{const sb={console,setInterval(){},clearInterval(){},setTimeout(){},localStorage:{length:0,getItem(){return null},setItem(){},removeItem(){}},document:{getElementById(){return null},querySelector(){return null},querySelectorAll(){return[]},addEventListener(){},readyState:'complete'},navigator:{}};sb.window=sb;vm.createContext(sb);vm.runInContext(rd('assets/cr-utils.js'),sb);const bad=c.cases.filter(([i,o])=>sb[c.fn](i)!==o).map(([i])=>i);return bad.length?c.fn+' errou para: '+bad.join(' | '):null},
 node:c=>{const r=require('child_process').spawnSync(process.execPath,[path.join(root,c.file)],{encoding:'utf8'});return r.status===0?null:('saída: '+(r.stdout+r.stderr).slice(-300))},
 containsAll:c=>{const h=rd(c.file),m=c.text.filter(t=>!h.includes(t));return m.length?'faltam: '+m.join(', '):null},
 menuTargets:()=>{const m=[...rd('assets/cr-shell.js').matchAll(/\['([\w-]+\.html)(?:#\w+)?'/g)].map(x=>x[1]);const bad=m.filter(f=>!fs.existsSync(path.join(root,f)));return bad.length?'faltam: '+bad.join(', '):null}
};
const T=JSON.parse(rd('tests/cr-testes.json'));let ok=0,fail=0,man=0;const res=[];
for(const t of T.testes){
  if(!t.auto){man++;res.push({id:t.id,status:'MANUAL',desc:t.desc});continue}
  let err;try{err=C[t.check.type](t.check)}catch(e){err='erro: '+e.message}
  err?fail++:ok++;res.push({id:t.id,status:err?'FALHOU':'OK',desc:t.desc,detalhe:err||undefined});
}
fs.writeFileSync(path.join(root,'tests/resultado.json'),JSON.stringify({rodada:T.rodada,executado_em:new Date().toISOString(),ok,falhou:fail,manuais_pendentes:man,resultados:res},null,2));
res.forEach(r=>console.log(r.status.padEnd(7),r.id,r.desc,r.detalhe?'→ '+r.detalhe:''));
console.log(`\nOK:${ok}  FALHOU:${fail}  MANUAL:${man}`);process.exit(fail?1:0);
