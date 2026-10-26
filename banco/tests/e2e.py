# Teste de navegador (Playwright): fluxo completo da zona MANUAL no modo demonstração.  Uso: python3 tests/e2e.py
import os, subprocess, time, sys, re
os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); PORT = 8765; BASE = f'http://localhost:{PORT}/'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res = []; erros = []
def chk(n, c): res.append((n, bool(c))); print(('OK    ' if c else 'FALHA ') + n)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1366, 'height': 900}); pg = ctx.new_page()
        ctx.route(re.compile(r'https?://(?!localhost).*'), lambda r: r.abort())          # sem internet: fontes/CDN bloqueados
        ctx.add_init_script('window.print = function(){ window.__printed = (window.__printed||0)+1; }')
        pg.on('pageerror', lambda e: erros.append('pageerror: ' + str(e)))
        pg.on('console', lambda m: erros.append('console: ' + m.text) if m.type == 'error' and 'ERR_FAILED' not in m.text and 'Failed to load resource' not in m.text else None)
        # protegido: sem login volta ao login
        pg.goto(BASE + 'index.html'); pg.wait_for_url('**/login.html*'); chk('sem sessão → login', 'login.html' in pg.url)
        chk('login mostra dica do modo demo', pg.is_visible('#demoDica'))
        pg.fill('#lEmail', 'ana@teste.com'); pg.fill('#lSenha', 'ab'); pg.click('#chHuman'); pg.click('#loginBtn'); pg.wait_for_timeout(600)
        chk('senha curta é recusada', 'login.html' in pg.url)
        pg.wait_for_timeout(2600); pg.fill('#lSenha', 'senha123'); pg.click('#loginBtn'); pg.wait_for_url('**/index.html', timeout=8000); chk('login entra no hub', 'index.html' in pg.url)
        pg.wait_for_selector('.sb-zone.z-auto'); chk('menu tem bloco AUTOMÁTICO e MANUAL', pg.locator('.sb-zone.z-manual').count() == 1 and pg.locator('.sb-zone.z-auto').count() == 1)
        chk('itens "em breve" apagados e sem link', pg.locator('.sb-item.soon').count() >= 5 and pg.locator('span.sb-item.soon').first.get_attribute('href') is None)
        chk('hub: 2 zonas', pg.locator('.hz').count() == 2); chk('aviso demo no hub', pg.locator('.demo-aviso').count() == 1)
        chk('marca no menu', 'cartas de conta' in pg.inner_text('.sb-sub').lower())
        # cadastros
        pg.goto(BASE + 'empresas.html'); pg.wait_for_selector('#tb'); chk('topbar com selo da zona AUTOMÁTICO', 'AUTOM' in pg.inner_text('.zone-pill'))
        pg.click('text=➕ Novo'); pg.fill('#c_razao_social', 'Acme Ltda'); pg.fill('#c_cnpj', '11222333000182'); pg.fill('#c_endereco', 'Rua A, 1'); pg.fill('#c_responsavel', 'Maria Souza'); pg.fill('#c_cargo_responsavel', 'Sócia')
        pg.click('text=💾 Salvar'); chk('CNPJ inválido barrado no cadastro', 'inválido' in pg.inner_text('#x_cnpj'))
        pg.fill('#c_cnpj', '11222333000181'); pg.click('text=💾 Salvar'); pg.wait_for_timeout(300); chk('empresa salva e CNPJ mascarado na lista', '**.222.333/****-**' in pg.inner_text('#tb'))
        pg.goto(BASE + 'clientes.html'); pg.wait_for_selector('#tb'); pg.click('text=➕ Novo'); pg.fill('#c_nome', 'João da Silva'); pg.fill('#c_cpf', '52998224725'); pg.fill('#c_vinculo', 'sócio-administrador'); pg.click('text=💾 Salvar'); pg.wait_for_timeout(300)
        chk('titular salvo e CPF mascarado', '***.982.247-**' in pg.inner_text('#tb'))
        pg.goto(BASE + 'bancos.html'); pg.wait_for_selector('#tb'); pg.click('text=➕ Novo'); pg.fill('#c_nome', 'Banco Teste S.A.'); pg.fill('#c_cidade', 'Guaíba/RS'); pg.click('text=💾 Salvar'); pg.wait_for_timeout(300); chk('banco salvo', 'Banco Teste' in pg.inner_text('#tb'))
        # nova carta
        pg.goto(BASE + 'nova-carta.html'); pg.wait_for_selector('#f_banco_nome'); chk('selo da zona MANUAL', 'MANUAL' in pg.inner_text('.zone-pill'))
        chk('5 etapas para PJ', pg.locator('.step').count() == 5)
        pg.click('#bAvanca'); chk('etapa 1 valida obrigatórios', pg.locator('.fi.err').count() >= 2)
        pg.fill('#f_banco_nome', 'Banco Teste S.A.'); pg.fill('#f_cidade', 'Guaíba/RS'); pg.fill('#f_agencia', '0123'); pg.click('#bAvanca')
        pg.wait_for_selector('#pk'); pg.select_option('#pk', index=1); chk('cadastro preenche empresa', pg.input_value('#f_razao_social') == 'Acme Ltda' and pg.input_value('#f_cnpj') == '11.222.333/0001-81'); pg.click('#bAvanca')
        pg.select_option('#pk', index=1); chk('cadastro preenche titular', pg.input_value('#f_titular_nome') == 'João da Silva' and pg.input_value('#f_cpf') == '529.982.247-25')
        pg.fill('#f_cpf', '111.111.111-11'); pg.click('#bAvanca'); chk('CPF inválido barrado', 'inválido' in pg.inner_text('#e_cpf')); pg.fill('#f_cpf', '529.982.247-25'); pg.click('#bAvanca')
        pg.fill('#f_finalidade', 'movimentação financeira da empresa'); pg.fill('#f_poderes', 'assinar e movimentar a conta'); pg.click('#bAvanca'); pg.wait_for_selector('#pv .sheet')
        t = pg.input_value('#ta'); chk('texto com dados e sem pendências', 'Acme Ltda' in t and '11.222.333/0001-81' in t and 'Agência 0123' in t and 'autorizado(a) a assinar' in t and not re.search(r'\[\w+\]', t))
        chk('aviso "texto completo"', 'completo' in pg.inner_text('#aviso')); chk('prévia A4 mostra logo e marca', pg.locator('#pv .sh-logo').count() == 1 and 'Orizon' in pg.inner_text('#pv .sh-emp'))
        pg.screenshot(path='/tmp/g/revisao.png'); pg.click('#bAvanca'); pg.wait_for_url('**/visualizar.html*', timeout=8000); pg.wait_for_selector('.sheet')
        ano = time.strftime('%Y'); chk('número CAB-AAAA-0001', f'CAB-{ano}-0001' in pg.inner_text('.sheet')); chk('código de verificação impresso', 'Código de verificação' in pg.inner_text('.sheet'))
        pg.wait_for_timeout(1200); chk('abriu a impressão automática', pg.evaluate('window.__printed') == 1); chk('hash confere', 'hash confere' in pg.inner_text('#info'))
        pg.screenshot(path='/tmp/g/visualizar.png', full_page=True); pg.pdf(path='/tmp/g/carta.pdf', format='A4', prefer_css_page_size=True, print_background=True)
        # painel
        pg.goto(BASE + 'index-cartas.html'); pg.wait_for_selector('#tb tr td.mono'); chk('painel lista a carta e KPI', 'CAB-' in pg.inner_text('#tb') and pg.inner_text('#kTotal') == '1')
        pg.click('text=⧉'); pg.wait_for_selector('#f_banco_nome'); chk('duplicar copia os dados', pg.input_value('#f_banco_nome') == 'Banco Teste S.A.')
        for _ in range(4): pg.click('#bAvanca'); pg.wait_for_timeout(120)
        pg.wait_for_selector('#pv .sheet'); pg.click('#bAvanca'); pg.wait_for_url('**/visualizar.html*'); pg.wait_for_selector('.sheet'); chk('2ª carta é CAB-AAAA-0002', f'CAB-{ano}-0002' in pg.inner_text('.sheet'))
        pg.once('dialog', lambda d: d.accept()); pg.click('#bCan'); pg.wait_for_selector('.sh-marca'); chk('cancelar marca CANCELADA', 'CANCELADA' in pg.inner_text('.sheet'))
        pg.goto(BASE + 'index-cartas.html'); pg.wait_for_selector('#tb tr td.mono'); chk('KPI desconta cancelada', pg.inner_text('#kTotal') == '1'); pg.fill('#busca', 'CAB-' + ano + '-0002'); chk('busca por número', pg.locator('#tb tr').count() == 1)
        # hub com números
        pg.goto(BASE + 'index.html'); pg.wait_for_function("document.getElementById('kTotal').textContent!=='—'"); chk('hub conta cartas', pg.inner_text('#kTotal') == '1' and '2 cartas' in pg.inner_text('#hubCartas'))
        # modelos
        pg.goto(BASE + 'modelos.html'); pg.wait_for_selector('#mx'); chk('2 modelos padrão semeados', pg.locator('#lista .action-card').count() == 2); pg.click('.chip-var >> nth=0'); chk('chip insere variável', '{{cidade}}' in pg.input_value('#mx'))
        pg.fill('#mn', 'Modelo editado'); pg.click('text=💾 Salvar'); pg.wait_for_timeout(300); chk('modelo salvo', 'Modelo editado' in pg.inner_text('#lista'))
        # PF pula etapa Empresa
        pg.goto(BASE + 'nova-carta.html'); pg.wait_for_selector('#f_tipo_conta'); pg.select_option('#f_tipo_conta', 'pf'); chk('PF tem 4 etapas', pg.locator('.step').count() == 4)
        # tema claro + celular
        pg.goto(BASE + 'visualizar.html?id=1'); pg.wait_for_selector('.sheet'); pg.click('#crThemeBtn'); chk('tema claro aplicado', pg.evaluate("document.documentElement.getAttribute('data-theme')") == 'light'); pg.screenshot(path='/tmp/g/claro.png')
        m = b.new_context(viewport={'width': 390, 'height': 800}); mp = m.new_page(); m.route(re.compile(r'https?://(?!localhost).*'), lambda r: r.abort())
        mp.goto(BASE + 'login.html'); mp.evaluate("localStorage.setItem('cab_demo_session', JSON.stringify({exp:Date.now()+1e7,user:{id:'d',email:'a@b.c',user_metadata:{}}}))"); mp.goto(BASE + 'index.html'); mp.wait_for_selector('.hz')
        chk('celular: sem rolagem lateral', mp.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')); chk('celular: zonas empilhadas', mp.evaluate("getComputedStyle(document.querySelector('.hub-zones')).gridTemplateColumns.split(' ').length") == 1); mp.screenshot(path='/tmp/g/celular.png')
        b.close()
finally:
    srv.terminate()
for e in erros[:12]: print('ERRO JS:', e)
chk('nenhum erro de JS no console', not erros)
print('RESUMO:', sum(1 for _, o in res if o), 'ok,', sum(1 for _, o in res if not o), 'falhas')
sys.exit(0 if all(o for _, o in res) else 1)
