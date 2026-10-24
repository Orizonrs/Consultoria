# R49: gera o PDF de um contrato assinado FICTÍCIO (Chromium via Playwright) e deixa em /tmp/pdft. Conferir: 3 páginas, nome/IP/hash/QR na última. NÃO usa o Supabase real.
import sys, json, threading, http.server, socketserver, os, functools
from playwright.sync_api import sync_playwright
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'..','..'))  # raiz do projeto
class Q(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*a,**k): super().__init__(*a,directory=ROOT,**k)
    def log_message(self,*a): pass
srv=socketserver.TCPServer(('127.0.0.1',8765),Q); threading.Thread(target=srv.serve_forever,daemon=True).start()
PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNkYPhfz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC'
HASHD='a'*64
contrato={'id':1,'tipo':'estagio','numero_contrato':'TCE-2026-0001','titulo':'TCE — Maria Teste — Empresa Teste','nome_candidato':'Maria Teste','cpf':'529.982.247-25','cargo':'Estagiária','email_candidato':'maria@teste.com','empresa':'Empresa Teste Ltda','cnpj_empresa':'11.222.333/0001-81','endereco_emp':'Rua A, 100, Porto Alegre/RS','periodo_inicio':'2026-11-01','periodo_fim':'2027-10-31','jornada_horas':'6','valor_bolsa':1200,'valor_vt':200,'apolice_seguro':'AP-123','supervisor_nome':'João Chefe','supervisor_cargo':'Gerente','atividades_plano':'Apoio administrativo.','curso':'Administração','instituicao':'Universidade Teste','matricula':'123','semestre':'4','status':'assinado','hash_documento':HASHD,'criado_em':'2026-10-23T12:00:00Z','atualizado_em':'2026-10-23T13:00:00Z'}
def sig(i,nome,papel,h):
    return {'id':i,'contrato_id':1,'nome':nome,'email':nome.split()[0].lower()+'@teste.com','papel':papel,'status':'assinado','token':'t'*48,'ip':'201.10.20.%d'%i,'user_agent':'Mozilla/5.0 (Linux; Android 14) Chrome/130','assinatura_img':PNG,'hash_assinatura':h*64,'assinado_em':'2026-10-23T1%d:30:00Z'%i,'visualizado_em':'2026-10-23T1%d:20:00Z'%i,'criado_em':'2026-10-23T12:00:00Z','expira_em':'2026-11-22T12:00:00Z'}
sigs=[sig(1,'Maria Teste','candidato','b'),sig(2,'João Chefe','supervisor','c'),sig(3,'Orizon Consultoria','empresa_nexus','d')]
audit=[{'id':1,'contrato_id':1,'evento':'assinou','ip':'201.10.20.1','criado_em':'2026-10-23T11:30:00Z','detalhe':'Maria Teste'}]
STUB='''window.supabase={createClient:function(){
 var D=%s;
 function q(t){var o={t:t,single:false};var b={select:function(){return b},eq:function(){return b},order:function(){return b},limit:function(){return b},
  single:function(){o.single=true;return b},then:function(res,rej){var d=D[t];if(o.single)d=Array.isArray(d)?d[0]:d;return Promise.resolve({data:d,error:null}).then(res,rej)}};return b}
 return {from:q,rpc:function(){return Promise.resolve({data:null,error:null})},auth:{getSession:function(){return Promise.resolve({data:{session:{user:{id:'u1',email:'a@b.c'}}}})},onAuthStateChange:function(){return {data:{subscription:{unsubscribe:function(){}}}}}}};}};''' % json.dumps({'cr_contratos':contrato,'cr_signatarios':sigs,'cr_auditoria':audit})
def run(nome, base_fixa):
    with sync_playwright() as p:
        b=p.chromium.launch(); pg=b.new_page(viewport={'width':1280,'height':900})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        pg.route('**/supabase.min.js',lambda r:r.fulfill(body=STUB,content_type='application/javascript'))
        pg.route('**/*fonts.g*',lambda r:r.abort())
        pg.route('**/cr-config.js',lambda r:r.fulfill(body=open(ROOT+'/assets/cr-config.js',encoding='utf8').read()+"\nwindow.CR_CONFIG.BASE_URL_FIXA=%s;window.CR_CONFIG.BASE_URL=%s;"%(json.dumps(base_fixa),json.dumps(base_fixa or 'http://127.0.0.1:8765/')),content_type='application/javascript'))
        pg.goto('http://127.0.0.1:8765/visualizar-assinado.html?id=1'); pg.wait_for_timeout(2500)
        avisos=pg.locator('.qr-aviso').count()
        pg.pdf(path='/tmp/pdft/%s.pdf'%nome,prefer_css_page_size=True,print_background=True)
        pg.screenshot(path='/tmp/pdft/%s-tela.png'%nome,full_page=False)
        print(nome,'qr-aviso na tela:',avisos,'| erros:',errs[:4]); b.close()
run('sem-base','')
run('com-base','https://orizon.exemplo.com.br/documentos/')
