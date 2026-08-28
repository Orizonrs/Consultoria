/* ═══════════════════════ TEMA CLARO/ESCURO (roda primeiro, sempre) ═══════════════════════ */
(function(){
  const root = document.documentElement;
  function temaAtual(){ return root.getAttribute('data-theme') || 'dark'; }
  function aplicarTema(t){
    root.setAttribute('data-theme', t);
    try{ localStorage.setItem('eco-theme', t); }catch(e){}
  }
  function ligar(){
    const btn = document.getElementById('themeToggle');
    if(btn) btn.addEventListener('click', function(){ aplicarTema(temaAtual() === 'dark' ? 'light' : 'dark'); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar);
  else ligar();
})();

/* ═══════════════════════ ÁREAS PADRÃO ═══════════════════════ */
const AREAS = ['Geral','Vendas','Atendimento ao Cliente','TI/Desenvolvimento','Operações/Produção','Liderança/Gestão','Administrativo','Financeiro','Saúde','Educação','Jurídico','Marketing','Logística','Industrial','Varejo'];

/* ═══════════════════════ BIBLIOTECA UNIVERSAL DE PERGUNTAS ═══════════════════════ */
function seedBiblioteca(){
  const mk = (texto, categoria, areas) => ({id:'lib-'+Math.random().toString(36).slice(2,10), texto, categoria, areas});
  return [
    // Comportamentais (gerais + por área)
    mk("Conte sobre uma situação em que você precisou lidar com um conflito na equipe. Como agiu e qual foi o resultado?","comportamental",["Geral"]),
    mk("Descreva um momento em que você cometeu um erro importante no trabalho. O que aconteceu e o que você aprendeu?","comportamental",["Geral"]),
    mk("Fale sobre uma vez em que precisou entregar um resultado com prazo apertado e recursos limitados.","comportamental",["Geral"]),
    mk("Dê um exemplo de quando você teve que convencer alguém de uma ideia com a qual discordava.","comportamental",["Geral","Liderança/Gestão"]),
    mk("Conte sobre uma situação em que você teve que se adaptar rapidamente a uma mudança inesperada.","comportamental",["Geral"]),
    mk("Descreva um momento em que você identificou um problema antes que ele se tornasse crítico.","comportamental",["Geral","Operações/Produção"]),
    mk("Conte sobre uma venda difícil que você conseguiu fechar. Qual foi a objeção principal e como contornou?","comportamental",["Vendas"]),
    mk("Descreva um atendimento em que o cliente estava muito insatisfeito. O que você fez?","comportamental",["Atendimento ao Cliente"]),
    mk("Fale sobre um bug ou problema técnico difícil que você resolveu. Como investigou a causa?","comportamental",["TI/Desenvolvimento"]),
    mk("Conte sobre uma vez em que precisou tomar uma decisão de liderança impopular.","comportamental",["Liderança/Gestão"]),
    mk("Descreva uma situação em que você precisou lidar com um paciente/cliente em situação delicada de saúde.","comportamental",["Saúde"]),
    mk("Conte sobre um imprevisto na operação/produção que exigiu ação rápida sua.","comportamental",["Operações/Produção","Industrial"]),
    mk("Fale sobre uma negociação com fornecedor que não saiu como planejado.","comportamental",["Logística","Financeiro"]),
    mk("Descreva uma campanha ou ação de marketing que não teve o resultado esperado. O que você fez a partir disso?","comportamental",["Marketing"]),
    // Competências
    mk("Como você organiza suas prioridades quando tem múltiplas demandas urgentes ao mesmo tempo?","competencias",["Geral"]),
    mk("Dê um exemplo de como você usa dados ou indicadores para tomar decisões no dia a dia.","competencias",["Geral","Financeiro","Marketing"]),
    mk("Como você costuma dar feedback para colegas ou liderados?","competencias",["Liderança/Gestão"]),
    mk("Descreva como você lidou com uma meta que parecia difícil de alcançar.","competencias",["Vendas","Geral"]),
    mk("Como você garante a qualidade do seu trabalho antes de entregá-lo?","competencias",["Geral","Industrial"]),
    mk("Como você se mantém atualizado(a) nas ferramentas e tecnologias da sua área?","competencias",["TI/Desenvolvimento"]),
    mk("Como você lida com metas de atendimento (tempo de resposta, satisfação) no dia a dia?","competencias",["Atendimento ao Cliente"]),
    mk("Como você planeja e organiza uma rota ou entrega com múltiplas restrições de tempo?","competencias",["Logística"]),
    mk("Como você equilibra rigor técnico e empatia no atendimento a pacientes/famílias?","competencias",["Saúde"]),
    mk("Como você adapta sua comunicação para públicos diferentes (alunos, pais, colegas)?","competencias",["Educação"]),
    // Técnicas
    mk("[Adapte] Explique como você resolveria [problema técnico específico do cargo].","tecnica",["Geral"]),
    mk("Quais linguagens/frameworks você domina e em qual nível? Descreva um projeto relevante.","tecnica",["TI/Desenvolvimento"]),
    mk("Como você faria a reconciliação de uma divergência contábil entre dois relatórios?","tecnica",["Financeiro"]),
    mk("Quais equipamentos/normas de segurança você já operou nesta função?","tecnica",["Industrial","Operações/Produção"]),
    mk("Como você estrutura um funil de vendas do zero para um produto novo?","tecnica",["Vendas"]),
    mk("Como você planejaria a distribuição de estoque entre centros de distribuição?","tecnica",["Logística"]),
    mk("Quais protocolos você segue para um procedimento de rotina na sua especialidade?","tecnica",["Saúde"]),
    mk("Como você mede o ROI de uma campanha paga?","tecnica",["Marketing"]),
    mk("Quais cláusulas você revisaria primeiro em um contrato de prestação de serviços?","tecnica",["Jurídico"]),
    // Situacionais
    mk("Se um cliente importante estivesse insatisfeito com um serviço que você prestou, o que você faria?","situacional",["Geral","Atendimento ao Cliente","Vendas"]),
    mk("Como você agiria se percebesse que um colega está cometendo um erro repetidamente, mas não é sua responsabilidade corrigi-lo?","situacional",["Geral"]),
    mk("O que você faria se recebesse uma tarefa sem instruções claras e o responsável não estivesse disponível?","situacional",["Geral"]),
    mk("Se dois membros da sua equipe entrassem em conflito direto na sua frente, como você mediaria?","situacional",["Liderança/Gestão"]),
    mk("Se um sistema crítico caísse em produção durante um lançamento, quais seriam seus primeiros passos?","situacional",["TI/Desenvolvimento"]),
    mk("Se uma entrega estivesse atrasada por culpa de um fornecedor, como você comunicaria isso ao cliente final?","situacional",["Logística","Vendas"]),
    // Motivacionais
    mk("O que te motivou a se candidatar a esta vaga especificamente?","motivacional",["Geral"]),
    mk("O que você mais valoriza em um ambiente de trabalho?","motivacional",["Geral"]),
    mk("Onde você se vê profissionalmente nos próximos anos?","motivacional",["Geral"]),
    mk("O que te faria sair de um emprego mesmo gostando da função?","motivacional",["Geral"]),
    mk("Por que interesse por esta área específica (ex: saúde, educação, jurídico)?","motivacional",["Saúde","Educação","Jurídico"]),
    // Eliminatórias
    mk("Possui disponibilidade para o horário/turno da vaga?","eliminatoria",["Geral"]),
    mk("Possui a documentação/certificação obrigatória para a função?","eliminatoria",["Geral","Saúde","Industrial"]),
    mk("Possui disponibilidade para o local de trabalho (presencial/híbrido/remoto)?","eliminatoria",["Geral"]),
    mk("Possui CNH válida na categoria exigida, se aplicável?","eliminatoria",["Logística","Vendas"]),
    mk("Possui registro no conselho de classe exigido para a função (se aplicável)?","eliminatoria",["Saúde","Jurídico"]),
    mk("Possui disponibilidade para viagens, se exigido pela vaga?","eliminatoria",["Vendas","Geral"]),
    // ── Adicionadas para cobrir "técnica" e "situacional" em todas as 15 áreas (mín. 4 cada) ──
    // Técnicas
    mk("Quais ferramentas ou sistemas você já utilizou que são relevantes para esta função?","tecnica",["Geral"]),
    mk("Descreva como você aprende a usar uma ferramenta ou processo novo rapidamente.","tecnica",["Geral"]),
    mk("Que tipo de treinamento ou capacitação você teve nos últimos 2 anos relacionado à função?","tecnica",["Geral"]),
    mk("Como você utiliza um CRM no dia a dia para gerenciar seu funil de vendas?","tecnica",["Vendas"]),
    mk("Como você calcula e acompanha sua taxa de conversão de vendas?","tecnica",["Vendas"]),
    mk("Quais sistemas de atendimento (CRM, chat, abertura de chamados) você já operou?","tecnica",["Atendimento ao Cliente"]),
    mk("Como você documenta o histórico de um atendimento para o próximo agente dar continuidade?","tecnica",["Atendimento ao Cliente"]),
    mk("Como você mede e melhora seu tempo médio de atendimento (TMA)?","tecnica",["Atendimento ao Cliente"]),
    mk("Como você versiona código e organiza um fluxo de Git em equipe?","tecnica",["TI/Desenvolvimento"]),
    mk("Como você testaria uma funcionalidade antes de colocá-la em produção?","tecnica",["TI/Desenvolvimento"]),
    mk("Quais indicadores de produção (ex: OEE, produtividade, refugo) você acompanha e como?","tecnica",["Operações/Produção"]),
    mk("Como você conduz uma parada de linha para manutenção sem comprometer o prazo de entrega?","tecnica",["Operações/Produção"]),
    mk("Quais ferramentas de gestão de projetos ou OKRs você já utilizou com sua equipe?","tecnica",["Liderança/Gestão"]),
    mk("Como você estrutura uma reunião de acompanhamento de resultados (1:1 ou de equipe)?","tecnica",["Liderança/Gestão"]),
    mk("Como você constrói e acompanha um plano de desenvolvimento individual (PDI)?","tecnica",["Liderança/Gestão"]),
    mk("Quais sistemas de gestão (ERP, planilhas, protocolos internos) você já utilizou no dia a dia?","tecnica",["Administrativo"]),
    mk("Como você organiza e arquiva documentos físicos e digitais para fácil localização?","tecnica",["Administrativo"]),
    mk("Como você lida com o controle de agenda e prioridades de múltiplas pessoas ao mesmo tempo?","tecnica",["Administrativo"]),
    mk("Como você monta um fluxo de caixa e o que observa nele semanalmente?","tecnica",["Financeiro"]),
    mk("Quais sistemas contábeis/ERP financeiros você já operou?","tecnica",["Financeiro"]),
    mk("Como você garante a administração correta de medicamentos e o registro em prontuário?","tecnica",["Saúde"]),
    mk("Quais protocolos de biossegurança você segue no seu dia a dia de trabalho?","tecnica",["Saúde"]),
    mk("Como você planeja uma aula considerando diferentes níveis de aprendizagem na turma?","tecnica",["Educação"]),
    mk("Quais metodologias ou recursos didáticos você utiliza com mais frequência?","tecnica",["Educação"]),
    mk("Como você avalia o progresso de um aluno ao longo do bimestre/semestre?","tecnica",["Educação"]),
    mk("Como você conduz uma pesquisa jurisprudencial para embasar um parecer?","tecnica",["Jurídico"]),
    mk("Quais sistemas de processo eletrônico (ex: PJe, e-SAJ) você já utilizou?","tecnica",["Jurídico"]),
    mk("Quais ferramentas de análise (Google Analytics, Meta Ads etc.) você já utilizou?","tecnica",["Marketing"]),
    mk("Como você define e testa uma hipótese em um teste A/B de campanha?","tecnica",["Marketing"]),
    mk("Como você utiliza um WMS ou TMS para gerenciar estoque e entregas?","tecnica",["Logística"]),
    mk("Como você lida com uma ruptura de estoque em cima da hora?","tecnica",["Logística"]),
    mk("Quais normas regulamentadoras (NRs) você conhece e já aplicou na função?","tecnica",["Industrial"]),
    mk("Como você realiza a manutenção preventiva de um equipamento sob sua responsabilidade?","tecnica",["Industrial"]),
    mk("Como você organiza a exposição de produtos para maximizar vendas (visual merchandising)?","tecnica",["Varejo"]),
    mk("Como você conduz o fechamento de caixa e a conferência de valores ao final do turno?","tecnica",["Varejo"]),
    mk("Como você identifica oportunidades de venda adicional (cross-sell/up-sell) no atendimento?","tecnica",["Varejo"]),
    // Situacionais (completando p/ mínimo de 4 por área)
    mk("Se você percebesse que não vai conseguir cumprir um prazo já combinado, o que faria?","situacional",["Geral"]),
    mk("Se um cliente pedisse algo que foge da política da empresa, como você agiria?","situacional",["Atendimento ao Cliente"]),
    mk("Se identificasse uma falha de qualidade momentos antes de uma entrega, o que faria?","situacional",["Operações/Produção"]),
    mk("Se recebesse duas solicitações urgentes e conflitantes de superiores diferentes, como decidiria?","situacional",["Administrativo"]),
    mk("Se identificasse um erro em um pagamento já processado, quais seriam seus próximos passos?","situacional",["Financeiro"]),
    mk("Se um paciente ou familiar questionasse uma orientação sua, como você conduziria a conversa?","situacional",["Saúde"]),
    mk("Se um aluno estivesse com uma dificuldade de aprendizagem ainda não identificada, o que você faria?","situacional",["Educação"]),
    mk("Se identificasse um risco jurídico não previsto em um contrato quase fechado, como agiria?","situacional",["Jurídico"]),
    mk("Se uma campanha estivesse com desempenho muito abaixo do esperado na metade do período, o que faria?","situacional",["Marketing"]),
    mk("Se percebesse um risco de segurança em uma máquina em operação, quais seriam seus primeiros passos?","situacional",["Industrial"]),
    mk("Se a loja estivesse cheia e faltasse um produto que o cliente queria, como você agiria?","situacional",["Varejo"]),
  ];
}
function carregarBibliotecaStorage(){
  try{
    const raw = localStorage.getItem('instrumento_biblioteca_v2');
    if(raw){ const parsed = JSON.parse(raw); if(Array.isArray(parsed) && parsed.length) return parsed; }
  }catch(e){}
  const seed = seedBiblioteca();
  try{ localStorage.setItem('instrumento_biblioteca_v2', JSON.stringify(seed)); }catch(e){}
  return seed;
}
function salvarBibliotecaStorage(){ try{ localStorage.setItem('instrumento_biblioteca_v2', JSON.stringify(BIBLIOTECA)); }catch(e){} }
let BIBLIOTECA = carregarBibliotecaStorage();

/* ═══════════════════════ MODELOS DE VAGA PADRÃO (presets) ═══════════════════════ */
function buildPresetBanks(ids){
  const map = {};
  ['comportamental','competencias','tecnica','situacional','motivacional','eliminatoria'].forEach(cat=>map[cat]=[]);
  ids.forEach(id=>{
    const q = BIBLIOTECA.find(x=>x.id===id);
    if(q) map[q.categoria].push(q.texto);
  });
  return map;
}
function libIdsByAreaCat(area, cats){
  return BIBLIOTECA.filter(q=> cats.includes(q.categoria) && (q.areas.includes(area)||q.areas.includes('Geral'))).map(q=>q.id);
}
/* Seleciona até `cap` perguntas de uma categoria para uma área, priorizando
   perguntas marcadas especificamente para aquela área antes das genéricas ("Geral"). */
function libIdsAreaCatCapped(area, cat, cap){
  const especificas = BIBLIOTECA.filter(q=> q.categoria===cat && q.areas.includes(area) && area!=='Geral');
  const genericas = BIBLIOTECA.filter(q=> q.categoria===cat && q.areas.includes('Geral') && !q.areas.includes(area));
  const pool = area==='Geral' ? BIBLIOTECA.filter(q=> q.categoria===cat && q.areas.includes('Geral')) : especificas.concat(genericas);
  return pool.slice(0, cap).map(q=>q.id);
}
/* Monta um banco de EXATAMENTE 24 perguntas padrão por modelo: 4 por categoria x 6 categorias. */
function buildPresetBanks24(area){
  const cats = ['comportamental','competencias','tecnica','situacional','motivacional','eliminatoria'];
  let ids = [];
  cats.forEach(cat => { ids = ids.concat(libIdsAreaCatCapped(area, cat, 4)); });
  return buildPresetBanks(ids);
}
function seedPresetTemplates(){
  // 60 modelos = 15 áreas x 4 cargos por área, cada um com 24 perguntas padrão (4 por categoria)
  const presets = [
    // Geral
    {nome:'Assistente Geral', area:'Geral'},
    {nome:'Estagiário(a)', area:'Geral'},
    {nome:'Auxiliar Multifuncional', area:'Geral'},
    {nome:'Trainee', area:'Geral'},
    // Vendas
    {nome:'Vendedor(a) Interno', area:'Vendas'},
    {nome:'Vendedor(a) Externo', area:'Vendas'},
    {nome:'Representante Comercial', area:'Vendas'},
    {nome:'Gerente de Vendas', area:'Vendas'},
    // Atendimento ao Cliente
    {nome:'Atendente de Suporte', area:'Atendimento ao Cliente'},
    {nome:'Analista de Relacionamento com Cliente', area:'Atendimento ao Cliente'},
    {nome:'Operador(a) de Telemarketing', area:'Atendimento ao Cliente'},
    {nome:'Supervisor(a) de Atendimento', area:'Atendimento ao Cliente'},
    // TI/Desenvolvimento
    {nome:'Desenvolvedor(a) Backend', area:'TI/Desenvolvimento'},
    {nome:'Desenvolvedor(a) Frontend', area:'TI/Desenvolvimento'},
    {nome:'Analista de Suporte Técnico', area:'TI/Desenvolvimento'},
    {nome:'Analista de Infraestrutura / DevOps', area:'TI/Desenvolvimento'},
    // Operações/Produção
    {nome:'Operador(a) de Produção', area:'Operações/Produção'},
    {nome:'Supervisor(a) de Operações', area:'Operações/Produção'},
    {nome:'Analista de Processos', area:'Operações/Produção'},
    {nome:'Técnico(a) de Manutenção', area:'Operações/Produção'},
    // Liderança/Gestão
    {nome:'Coordenador(a) de Equipe', area:'Liderança/Gestão'},
    {nome:'Gerente de Área', area:'Liderança/Gestão'},
    {nome:'Supervisor(a) Geral', area:'Liderança/Gestão'},
    {nome:'Diretor(a) de Operações', area:'Liderança/Gestão'},
    // Administrativo
    {nome:'Assistente Administrativo', area:'Administrativo'},
    {nome:'Analista Administrativo', area:'Administrativo'},
    {nome:'Auxiliar de Escritório', area:'Administrativo'},
    {nome:'Secretário(a) Executivo(a)', area:'Administrativo'},
    // Financeiro
    {nome:'Analista Financeiro', area:'Financeiro'},
    {nome:'Auxiliar de Contas a Pagar/Receber', area:'Financeiro'},
    {nome:'Contador(a)', area:'Financeiro'},
    {nome:'Controller', area:'Financeiro'},
    // Saúde
    {nome:'Técnico(a) de Enfermagem', area:'Saúde'},
    {nome:'Enfermeiro(a)', area:'Saúde'},
    {nome:'Recepcionista de Clínica', area:'Saúde'},
    {nome:'Auxiliar de Farmácia', area:'Saúde'},
    // Educação
    {nome:'Professor(a)', area:'Educação'},
    {nome:'Coordenador(a) Pedagógico(a)', area:'Educação'},
    {nome:'Auxiliar de Sala', area:'Educação'},
    {nome:'Secretário(a) Escolar', area:'Educação'},
    // Jurídico
    {nome:'Advogado(a)', area:'Jurídico'},
    {nome:'Assistente Jurídico', area:'Jurídico'},
    {nome:'Analista de Contratos', area:'Jurídico'},
    {nome:'Estagiário(a) de Direito', area:'Jurídico'},
    // Marketing
    {nome:'Analista de Marketing Digital', area:'Marketing'},
    {nome:'Social Media', area:'Marketing'},
    {nome:'Designer Gráfico', area:'Marketing'},
    {nome:'Analista de Conteúdo / SEO', area:'Marketing'},
    // Logística
    {nome:'Auxiliar de Logística', area:'Logística'},
    {nome:'Analista de Logística', area:'Logística'},
    {nome:'Motorista Entregador', area:'Logística'},
    {nome:'Supervisor(a) de Estoque', area:'Logística'},
    // Industrial
    {nome:'Operador(a) de Máquinas', area:'Industrial'},
    {nome:'Técnico(a) de Segurança do Trabalho', area:'Industrial'},
    {nome:'Supervisor(a) Industrial', area:'Industrial'},
    {nome:'Auxiliar de Produção Industrial', area:'Industrial'},
    // Varejo
    {nome:'Vendedor(a) de Loja', area:'Varejo'},
    {nome:'Operador(a) de Caixa', area:'Varejo'},
    {nome:'Repositor(a)', area:'Varejo'},
    {nome:'Gerente de Loja', area:'Varejo'},
  ];
  return presets.map((p,i)=>({
    id:'preset-'+(i+1)+'-'+p.nome.replace(/[^\w]+/g,'-').toLowerCase(),
    preset:true,
    nome:p.nome, area:p.area,
    secoesAtivas:{identificacao:true,comportamental:true,competencias:true,tecnica:true,situacional:true,motivacional:true,eliminatoria:true,matriz:true,perfil:false,decisao:true,anexos:false},
    sistema:'estrelas',
    bancos: buildPresetBanks24(p.area),
    competenciasMatriz:[{nome:'Comunicação',peso:25},{nome:'Conhecimento técnico',peso:25},{nome:'Trabalho em equipe',peso:25},{nome:'Resolução de problemas',peso:25}],
    barsAncoras: ['Muito abaixo do esperado','Abaixo do esperado','Conforme esperado','Acima do esperado','Muito acima do esperado'],
    criadoEm: new Date().toISOString(),
  }));
}
function carregarTemplates(){
  try{
    const raw = localStorage.getItem('instrumento_templates_v2');
    if(raw) return JSON.parse(raw);
  }catch(e){}
  const seeded = seedPresetTemplates();
  try{ localStorage.setItem('instrumento_templates_v2', JSON.stringify(seeded)); }catch(e){}
  return seeded;
}
let TEMPLATES = carregarTemplates();
function salvarTemplatesStorage(){ try{ localStorage.setItem('instrumento_templates_v2', JSON.stringify(TEMPLATES)); }catch(e){} }

let CANDIDATOS_ARQUIVO = [];
function carregarCandidatos(){
  try{ const raw = localStorage.getItem('instrumento_candidatos_v1'); if(raw) CANDIDATOS_ARQUIVO = JSON.parse(raw); }catch(e){ CANDIDATOS_ARQUIVO=[]; }
}
function salvarCandidatosStorage(){ try{ localStorage.setItem('instrumento_candidatos_v1', JSON.stringify(CANDIDATOS_ARQUIVO)); }catch(e){} }
carregarCandidatos();

/* ═══════════════════════ ESTADO ATUAL DO INSTRUMENTO ═══════════════════════ */
let BANKS = { comportamental:[], competencias:[], tecnica:[], situacional:[], motivacional:[], eliminatoria:[] };
const SEC_META = {
  comportamental:{titulo:'Perguntas Comportamentais (BEI/STAR)', desc:'Baseadas em experiências reais e passadas do candidato.'},
  competencias:{titulo:'Perguntas por Competência', desc:'Avaliam habilidades específicas mapeadas para o cargo.'},
  tecnica:{titulo:'Perguntas Técnicas', desc:'Conhecimento prático e específico da função.'},
  situacional:{titulo:'Perguntas Situacionais / Hipotéticas', desc:'Cenários fictícios para avaliar raciocínio e julgamento.'},
  motivacional:{titulo:'Motivacionais / Fit Cultural', desc:'Alinhamento com valores, propósito e cultura da empresa.'},
  eliminatoria:{titulo:'Perguntas Eliminatórias (Screening)', desc:'Requisitos mínimos — respondidas em sim/não.'},
};
/* Cor de cada seção no papel/PDF — cada .sec-tab herda essa cor via --sec-color.
   Antes o modo de exportação forçava tudo em preto/sem fundo (pensando em impressão
   nativa do navegador, que às vezes some com cor de fundo). Como o PDF agora é gerado
   via html2canvas (foto real da tela), a cor SEMPRE aparece no arquivo — por isso
   voltamos a usar a paleta de cor do próprio site em vez de deixar tudo cinza/preto. */
const SEC_COLOR = {
  comportamental:'var(--accent)', competencias:'var(--teal)', tecnica:'var(--violet)',
  situacional:'var(--warning)', motivacional:'var(--rose)', eliminatoria:'var(--danger)',
  matriz:'var(--success)', perfil:'var(--accent)', anexos:'var(--text-dim)', decisao:'var(--paper-ink)'
};
let SECOES_ATIVAS = {comportamental:false, competencias:false, tecnica:false, situacional:false, motivacional:false, eliminatoria:false, matriz:false, perfil:false, anexos:false};
/* Painéis do builder (viewMontar) que só aparecem quando a seção correspondente é marcada */
const PAINEL_BUILDER_MAP = {comportamental:'panelComportamental', competencias:'panelCompetencias', tecnica:'panelTecnica', situacional:'panelSituacional', motivacional:'panelMotivacional', eliminatoria:'panelEliminatoria', matriz:'panelMatriz'};
function atualizarVisibilidadeSecoesBuilder(){
  let algumAtivo = false;
  Object.keys(PAINEL_BUILDER_MAP).forEach(k=>{
    const el = document.getElementById(PAINEL_BUILDER_MAP[k]);
    if(!el) return;
    const ativo = !!SECOES_ATIVAS[k];
    el.style.display = ativo ? '' : 'none';
    if(ativo) algumAtivo = true;
  });
  const hint = document.getElementById('builderEmptyHint');
  if(hint) hint.style.display = algumAtivo ? 'none' : '';
}
function sincronizarCheckboxesSecoes(){
  document.querySelectorAll('.side-check input[data-sec]').forEach(cb=>{
    const k = cb.getAttribute('data-sec');
    if(SECOES_ATIVAS[k]!==undefined) cb.checked = SECOES_ATIVAS[k];
  });
  atualizarVisibilidadeSecoesBuilder();
}
let SISTEMA = 'estrelas';
let BARS_ANCORAS = ['Muito abaixo do esperado','Abaixo do esperado','Conforme esperado','Acima do esperado','Muito acima do esperado'];
let COMPETENCIAS = [ {nome:'Comunicação', peso:25}, {nome:'Conhecimento técnico', peso:25}, {nome:'Trabalho em equipe', peso:25}, {nome:'Resolução de problemas', peso:25} ];
let PERFIL_TRACOS = { 'Dominância':50, 'Influência':50, 'Estabilidade':50, 'Conformidade':50 };
let ANEXOS = ['Currículo', 'Documento de identidade'];
let DECISAO = ''; let PARECER_FINAL=''; let PERFIL_COMBO='';
let RESPOSTAS = {}; let ANOTACOES = {}; let matrizNotas = {};
let ACTIVE_TEMPLATE_ID = null;

/* seeda BANKS a partir de um preset padrão (Geral) na primeira carga */
function seedBanksInicial(){
  BANKS.comportamental = BIBLIOTECA.filter(q=>q.categoria==='comportamental' && q.areas.includes('Geral')).slice(0,4).map(q=>q.texto);
  BANKS.competencias = BIBLIOTECA.filter(q=>q.categoria==='competencias' && q.areas.includes('Geral')).slice(0,4).map(q=>q.texto);
}
seedBanksInicial();

/* ═══════════════════════ NAVEGAÇÃO ═══════════════════════ */
function mudarView(v){
  const alvo = document.getElementById('view'+v.charAt(0).toUpperCase()+v.slice(1));
  if(!alvo) return; // view não existe nesta página — navegação agora é entre arquivos
  document.querySelectorAll('.view').forEach(el=>el.classList.remove('active'));
  alvo.classList.add('active');
  if(v==='instrumento') renderInstrumento();
  if(v==='biblioteca') renderBiblioteca();
  if(v==='modelos') renderTemplates();
  if(v==='comparar') renderComparar();
}

/* preencher selects de área */
function preencherSelectsArea(){
  const opts = AREAS.map(a=>`<option value="${a}">${a}</option>`).join('');
  document.getElementById('cfgArea').innerHTML = opts;
  document.getElementById('mTplArea').innerHTML = opts;
}
preencherSelectsArea();

/* ═══════════════════════ BUILDER: BANCOS DE PERGUNTAS ═══════════════════════ */
const WRAP_MAP = {comportamental:'bankComportamental',competencias:'bankCompetencias',tecnica:'bankTecnica',situacional:'bankSituacional',motivacional:'bankMotivacional',eliminatoria:'bankEliminatoria'};
/* Ordem em que as categorias entram no instrumento final — usada para numerar
   as perguntas sequencialmente (1, 2, 3...) através de todas as seções. */
const ORDEM_CATEGORIAS = ['comportamental','competencias','tecnica','situacional','motivacional','eliminatoria'];
function renderBank(key){
  const wrap = document.getElementById(WRAP_MAP[key]);
  wrap.innerHTML = '';
  BANKS[key].forEach((texto, i)=>{
    const id = key+'-'+i;
    const item = document.createElement('div');
    item.className = 'qbank-item';
    item.innerHTML = `<span class="qbank-num" style="display:inline-flex;align-items:center;justify-content:center;min-width:1.6em;height:1.6em;padding:0 0.3em;border-radius:999px;background:var(--accent);color:#fff;font-size:0.72rem;font-weight:700;flex:none;margin-top:0.15rem;">·</span>
      <input type="checkbox" checked data-qid="${id}" onchange="sincronizar(); atualizarNumeracaoBuilder();">
      <textarea data-qtext="${id}" oninput="autoGrow(this); BANKS['${key}'][${i}]=this.value; renderInstrumento(true);">${texto}</textarea>
      <button class="rm" onclick="removerPergunta('${key}',${i})" title="Remover">×</button>`;
    wrap.appendChild(item);
  });
  atualizarNumeracaoBuilder();
}
/* Numera as perguntas sequencialmente (1..N) na ordem em que entram no instrumento,
   pulando as desmarcadas (mostram "–" e não contam), e atualiza os contadores de
   cada seção + o total geral no painel lateral, para o recrutador sempre saber
   quantas perguntas o formulário tem. */
function atualizarNumeracaoBuilder(){
  let total = 0;
  ORDEM_CATEGORIAS.forEach(key=>{
    const wrap = document.getElementById(WRAP_MAP[key]);
    if(!wrap) return;
    let ativasNaSecao = 0;
    const itens = wrap.querySelectorAll('.qbank-item');
    itens.forEach(item=>{
      const cb = item.querySelector('input[type=checkbox]');
      const badge = item.querySelector('.qbank-num');
      if(!badge) return;
      if(cb.checked){ total++; ativasNaSecao++; badge.textContent = total; badge.style.opacity = '1'; }
      else { badge.textContent = '–'; badge.style.opacity = '0.4'; }
    });
    const panel = wrap.closest('.panel');
    if(panel){
      let contador = panel.querySelector('.qbank-contador-secao');
      if(!contador){
        contador = document.createElement('span');
        contador.className = 'count qbank-contador-secao';
        const head = panel.querySelector('.panel-head');
        if(head) head.appendChild(contador);
      }
      contador.textContent = `${ativasNaSecao} de ${itens.length} pergunta${itens.length===1?'':'s'}`;
    }
  });
  let totalBox = document.getElementById('totalPerguntasBuilder');
  if(!totalBox){
    const banner = document.getElementById('activeTemplateBanner');
    if(banner && banner.parentElement){
      totalBox = document.createElement('div');
      totalBox.id = 'totalPerguntasBuilder';
      totalBox.style.cssText = 'margin:0.6rem 0;padding:0.5rem 0.7rem;border-radius:8px;background:var(--accent);color:#fff;font-size:0.8rem;font-weight:700;text-align:center;';
      banner.parentElement.insertBefore(totalBox, banner.nextSibling);
    }
  }
  if(totalBox) totalBox.textContent = `📋 ${total} pergunta${total===1?'':'s'} no instrumento`;
}
function autoGrow(el){ el.style.height='auto'; el.style.height=(el.scrollHeight)+'px'; }
function addPergunta(key){ BANKS[key].push(''); renderBank(key); renderInstrumento(true); }
function removerPergunta(key, i){ BANKS[key].splice(i,1); renderBank(key); renderInstrumento(true); }
function initBanks(){ Object.keys(WRAP_MAP).forEach(renderBank); document.querySelectorAll('textarea[data-qtext]').forEach(autoGrow); atualizarNumeracaoBuilder(); }
initBanks();
function getPerguntasAtivas(key){
  const wrap = document.getElementById(WRAP_MAP[key]);
  const out = [];
  wrap.querySelectorAll('.qbank-item').forEach((item)=>{
    const cb = item.querySelector('input[type=checkbox]');
    const ta = item.querySelector('textarea');
    if(cb.checked && ta.value.trim()) out.push({id:ta.getAttribute('data-qtext'), texto:ta.value.trim()});
  });
  return out;
}
function toggleSecao(el){ SECOES_ATIVAS[el.getAttribute('data-sec')] = el.checked; atualizarVisibilidadeSecoesBuilder(); renderInstrumento(true); }
function setSistema(v){
  SISTEMA = v;
  document.querySelectorAll('.scoring-opt').forEach(el=> el.classList.toggle('on', el.getAttribute('data-sys')===v));
  renderBarsEditor();
  if(document.getElementById('instrumentoBody')) renderInstrumento(true);
}
function renderBarsEditor(){
  const wrap = document.getElementById('barsEditor');
  if(SISTEMA!=='bars'){ wrap.style.display='none'; return; }
  wrap.style.display='grid';
  wrap.innerHTML = BARS_ANCORAS.map((a,i)=>`<input class="field-input" value="${escapeHTML(a)}" oninput="BARS_ANCORAS[${i}]=this.value; renderInstrumento(true);">`).join('');
}
renderBarsEditor();

/* ═══════════════════════ MATRIZ DE COMPETÊNCIAS (builder) ═══════════════════════ */
function renderWeightBuilder(){
  const wrap = document.getElementById('weightBuilder');
  wrap.innerHTML = '';
  let total = 0;
  COMPETENCIAS.forEach((c,i)=>{
    total += Number(c.peso)||0;
    const row = document.createElement('div');
    row.className='weight-row';
    row.innerHTML = `<input class="field-input" value="${escapeHTML(c.nome)}" oninput="COMPETENCIAS[${i}].nome=this.value; renderInstrumento(true);">
      <input class="field-input mono" type="number" min="0" max="100" value="${c.peso}" oninput="COMPETENCIAS[${i}].peso=this.value; renderWeightBuilder();">
      <button class="rm" onclick="COMPETENCIAS.splice(${i},1); renderWeightBuilder();">×</button>`;
    wrap.appendChild(row);
  });
  const totalEl = document.createElement('div');
  totalEl.className = 'weight-total ' + (total===100?'good':'bad');
  totalEl.textContent = `Soma dos pesos: ${total}%` + (total===100 ? ' ✓' : ' — ajuste para totalizar 100%');
  wrap.appendChild(totalEl);
  renderInstrumento(true);
}
function addCompetencia(){ COMPETENCIAS.push({nome:'Nova competência', peso:0}); renderWeightBuilder(); }
/* NÃO chamar renderWeightBuilder() aqui no nível superior do arquivo: ele chama renderInstrumento(),
   que usa variáveis (_instrCode, _autoSaveTimer) só declaradas mais abaixo — isso travava o script
   inteiro (ReferenceError de TDZ) antes mesmo dele terminar de carregar, em TODAS as páginas.
   A chamada correta acontece lá embaixo, no bloco INIT, depois de tudo estar declarado. */

/* ═══════════════════════ BIBLIOTECA — RENDER ═══════════════════════ */
let LIB_AREA_FILTROS = new Set();
function renderLibAreaFiltros(){
  const wrap = document.getElementById('libAreaFiltros');
  wrap.innerHTML = AREAS.map(a=>`<span class="tagchip ${LIB_AREA_FILTROS.has(a)?'on':''}" onclick="toggleLibAreaFiltro('${a}')">${a}</span>`).join('');
}
function toggleLibAreaFiltro(a){
  if(LIB_AREA_FILTROS.has(a)) LIB_AREA_FILTROS.delete(a); else LIB_AREA_FILTROS.add(a);
  renderLibAreaFiltros(); renderBiblioteca();
}
function renderBiblioteca(){
  renderLibAreaFiltros();
  const termo = (document.getElementById('libSearch').value||'').toLowerCase();
  const catFiltro = document.getElementById('libCategoriaFiltro').value;
  let lista = BIBLIOTECA.filter(q=>{
    if(catFiltro && q.categoria!==catFiltro) return false;
    if(termo && !q.texto.toLowerCase().includes(termo)) return false;
    if(LIB_AREA_FILTROS.size && !q.areas.some(a=>LIB_AREA_FILTROS.has(a))) return false;
    return true;
  });
  document.getElementById('libCount').textContent = `${lista.length} pergunta${lista.length===1?'':'s'}`;
  const wrap = document.getElementById('libList');
  if(!lista.length){ wrap.innerHTML = '<div class="lib-empty"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.6rem;opacity:.6;"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><div>Nenhuma pergunta encontrada com esses filtros.</div><div style="font-size:0.76rem;margin-top:0.2rem;opacity:.8;">Tente outra palavra-chave ou limpe os filtros de categoria.</div></div>'; return; }
  wrap.innerHTML = lista.map(q=>`
    <div class="lib-card">
      <div class="lib-card-top">
        <p class="txt">${escapeHTML(q.texto)}</p>
        <div class="lib-card-actions">
          <button class="btn sm primary" onclick="puxarParaInstrumento('${q.id}')">+ Usar</button>
          <button class="btn sm danger" onclick="removerDaBiblioteca('${q.id}')">Remover</button>
        </div>
      </div>
      <div class="meta">
        <span class="lib-meta-tag cat">${SEC_META[q.categoria]?SEC_META[q.categoria].titulo:q.categoria}</span>
        ${q.areas.map(a=>`<span class="lib-meta-tag">${a}</span>`).join('')}
      </div>
    </div>`).join('');
}
function puxarParaInstrumento(id){
  const q = BIBLIOTECA.find(x=>x.id===id);
  if(!q) return;
  BANKS[q.categoria].push(q.texto);
  mostrarToast('Pergunta adicionada ao instrumento em "Montar" → categoria: ' + (SEC_META[q.categoria]?SEC_META[q.categoria].titulo:q.categoria));
  initBanks();
}
function removerDaBiblioteca(id){
  if(!confirm('Remover esta pergunta permanentemente da biblioteca?')) return;
  BIBLIOTECA = BIBLIOTECA.filter(x=>x.id!==id);
  salvarBibliotecaStorage();
  renderBiblioteca();
}
function abrirModalNovaPergunta(){
  document.getElementById('mPTexto').value='';
  document.getElementById('mPCategoria').value='comportamental';
  const wrap = document.getElementById('mPAreas');
  wrap.innerHTML = AREAS.map(a=>`<span class="tagchip" data-area="${a}" onclick="this.classList.toggle('on')">${a}</span>`).join('');
  document.getElementById('modalPergunta').classList.add('show');
}
function salvarNovaPerguntaBiblioteca(){
  const texto = document.getElementById('mPTexto').value.trim();
  if(!texto){ mostrarToast('Escreva o texto da pergunta.', true); return; }
  const categoria = document.getElementById('mPCategoria').value;
  const areas = Array.from(document.querySelectorAll('#mPAreas .tagchip.on')).map(el=>el.getAttribute('data-area'));
  BIBLIOTECA.push({id:'lib-'+Math.random().toString(36).slice(2,10), texto, categoria, areas: areas.length?areas:['Geral']});
  salvarBibliotecaStorage();
  fecharModal('modalPergunta');
  renderBiblioteca();
  mostrarToast('Pergunta adicionada à biblioteca.');
}
function baixarBibliotecaJSON(){
  const blob = new Blob([JSON.stringify(BIBLIOTECA,null,2)], {type:'application/json'});
  disparaDownload(blob, 'biblioteca-de-perguntas.json');
  mostrarToast('Biblioteca exportada.');
}
function importarBibliotecaJSON(evt){
  const file = evt.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{ const d = JSON.parse(e.target.result); if(Array.isArray(d)){ BIBLIOTECA = BIBLIOTECA.concat(d); salvarBibliotecaStorage(); renderBiblioteca(); mostrarToast('Biblioteca importada e combinada com a atual.'); } }
    catch(err){ mostrarToast('Arquivo inválido.', true); }
  };
  reader.readAsText(file);
}

/* ═══════════════════════ MODELOS DE VAGA — RENDER ═══════════════════════ */
function renderTemplates(){
  document.getElementById('tplCount').textContent = `${TEMPLATES.length} modelo${TEMPLATES.length===1?'':'s'}`;
  const wrap = document.getElementById('tplGrid');
  wrap.innerHTML = TEMPLATES.map(t=>{
    const totalPerguntas = Object.values(t.bancos||{}).reduce((a,arr)=>a+arr.length,0);
    return `<div class="tpl-card ${t.preset?'preset':''}">
      ${t.preset?'<span class="badge-preset">Modelo pronto</span>':''}
      <h3>${escapeHTML(t.nome)}</h3>
      <div class="area">${t.area||'Geral'}</div>
      <div class="stats">${totalPerguntas} pergunta(s)</div>
      <div class="row-btns">
        <button class="btn sm primary" onclick="usarModeloAgora('${t.id}')">🚀 Usar agora</button>
        <button class="btn sm" onclick="abrirEditorDeVaga('${t.id}')">✏️ Editar esta vaga</button>
        <button class="btn sm" onclick="duplicarTemplate('${t.id}')">Duplicar</button>
        <button class="btn sm" onclick="baixarTemplateUnico('${t.id}')">Exportar</button>
        ${t.preset?'':'<button class="btn sm danger" onclick="excluirTemplate(\''+t.id+'\')">Excluir</button>'}
      </div>
    </div>`;
  }).join('');
}
/* ═══════════════════════ TRANSFERÊNCIA ENTRE PÁGINAS VIA URL (funciona mesmo em file://) ═══════════════════════ */
/* Abrir .html por duplo-clique faz o navegador tratar cada arquivo como uma origem isolada,
   então localStorage de uma página NÃO é visível na outra. Por isso os dados viajam no hash da URL. */
function codificarPayloadURL(obj){
  try{ return encodeURIComponent(JSON.stringify(obj)); }catch(e){ return ''; }
}
function irParaInstrumentoComPayload(payload){
  const hash = codificarPayloadURL(payload);
  window.location.href = 'instrumento.html#dados=' + hash;
}
/* Abre o editor exclusivo de uma vaga (editar-vaga.html) já carregado com as
   perguntas daquele modelo específico — página própria, separada do "Montar"
   genérico (criar do zero), para manter organização entre os dois fluxos. */
function abrirEditorDeVaga(id){
  const t = TEMPLATES.find(x=>x.id===id);
  if(!t) return;
  const payload = {
    modo: 'editarVaga',
    templateId: t.id, nome: t.nome, area: t.area,
    secoesAtivas: t.secoesAtivas, bancos: t.bancos, sistema: t.sistema,
    competenciasMatriz: t.competenciasMatriz, barsAncoras: t.barsAncoras,
  };
  window.location.href = 'editar-vaga.html#dados=' + codificarPayloadURL(payload);
}
/* Leva os dados JÁ PREENCHIDOS do instrumento (respostas, anotações, matriz, decisão...)
   para parecer.html, que os transforma em texto corrido editável (produção de texto),
   em vez do formulário de perguntas do instrumento. Mesma técnica de transporte via
   hash da URL usada em irParaInstrumentoComPayload / abrirEditorDeVaga. */
function irParaParecerComPayload(){
  if(typeof sincronizar === 'function') sincronizar();
  const dados = coletarDadosCompletos();
  window.location.href = 'parecer.html#dados=' + codificarPayloadURL(dados);
}
let _modoPayloadAtual = null;
function aplicarPayloadDaURL(){
  const m = /#dados=(.+)/.exec(location.hash);
  if(!m) return false;
  let payload;
  try{ payload = JSON.parse(decodeURIComponent(m[1])); }catch(e){ return false; }
  if(!payload) return false;
  if(payload.modo === 'editarVaga'){ _modoPayloadAtual = 'editarVaga'; return aplicarPayloadEditarVaga(payload); }
  _modoPayloadAtual = 'instrumento';
  SECOES_ATIVAS = Object.assign({comportamental:false,competencias:false,tecnica:false,situacional:false,motivacional:false,eliminatoria:false,matriz:false,perfil:false,anexos:false}, payload.secoesAtivas);
  BANKS = JSON.parse(JSON.stringify(Object.assign({comportamental:[],competencias:[],tecnica:[],situacional:[],motivacional:[],eliminatoria:[]}, payload.bancos)));
  SISTEMA = payload.sistema||'estrelas';
  COMPETENCIAS = JSON.parse(JSON.stringify(payload.competenciasMatriz||COMPETENCIAS));
  BARS_ANCORAS = JSON.parse(JSON.stringify(payload.barsAncoras||BARS_ANCORAS));
  ACTIVE_TEMPLATE_ID = payload.templateId||null;
  RESPOSTAS = {}; ANOTACOES = {}; matrizNotas = {}; DECISAO=''; PARECER_FINAL=''; PERFIL_COMBO='';
  _instrCode = null;
  if(document.getElementById('pVaga')) document.getElementById('pVaga').value = payload.vaga||'';
  if(document.getElementById('pEmpresa')) document.getElementById('pEmpresa').value = payload.empresa||'';
  if(document.getElementById('pEntrevistador')) document.getElementById('pEntrevistador').value = payload.entrevistador||'';
  if(document.getElementById('pData')) document.getElementById('pData').value = payload.data||'';
  if(document.getElementById('pModEtapa')) document.getElementById('pModEtapa').value = payload.modEtapa||'';
  if(document.getElementById('pNome')) document.getElementById('pNome').value = '';
  try{ history.replaceState(null, '', location.pathname+location.search); }catch(e){ /* alguns navegadores restringem isso em file://; sem problema, o hash só fica visível na barra de endereço */ }
  return true;
}
/* Guarda como a vaga estava no momento em que o editor abriu, para permitir
   "Restaurar perguntas originais" sem precisar voltar para Modelos de Vaga. */
let ORIGINAL_BANCOS_SNAPSHOT = null;
function aplicarPayloadEditarVaga(payload){
  SECOES_ATIVAS = Object.assign({comportamental:false,competencias:false,tecnica:false,situacional:false,motivacional:false,eliminatoria:false,matriz:false,perfil:false,anexos:false}, payload.secoesAtivas);
  BANKS = JSON.parse(JSON.stringify(Object.assign({comportamental:[],competencias:[],tecnica:[],situacional:[],motivacional:[],eliminatoria:[]}, payload.bancos)));
  SISTEMA = payload.sistema||'estrelas';
  COMPETENCIAS = JSON.parse(JSON.stringify(payload.competenciasMatriz||COMPETENCIAS));
  BARS_ANCORAS = JSON.parse(JSON.stringify(payload.barsAncoras||BARS_ANCORAS));
  ACTIVE_TEMPLATE_ID = payload.templateId||null;
  ORIGINAL_BANCOS_SNAPSHOT = JSON.parse(JSON.stringify(BANKS));
  if(document.getElementById('cfgVaga')) document.getElementById('cfgVaga').value = payload.nome||'';
  if(document.getElementById('cfgArea')) document.getElementById('cfgArea').value = payload.area||'Geral';
  sincronizarCheckboxesSecoes();
  document.querySelectorAll('input[name="sistema"]').forEach(r=>{ r.checked = (r.value===SISTEMA); });
  setSistema(SISTEMA);
  initBanks();
  if(document.getElementById('weightBuilder')) renderWeightBuilder();
  if(document.getElementById('activeTemplateBanner')) renderActiveTemplateBanner();
  const banner = document.getElementById('editarVagaBanner');
  if(banner) banner.textContent = 'Editando: '+(payload.nome||'')+' · Área: '+(payload.area||'Geral');
  try{ history.replaceState(null, '', location.pathname+location.search); }catch(e){}
  return true;
}
/* Descarta as edições feitas nas perguntas e volta ao estado em que a vaga
   estava quando o editor foi aberto (não afeta nome/área/sistema já ajustados). */
function restaurarPerguntasOriginais(){
  if(!ORIGINAL_BANCOS_SNAPSHOT){ mostrarToast('Nada para restaurar aqui — abra uma vaga a partir de Modelos de Vaga.', true); return; }
  if(!confirm('Restaurar as perguntas originais deste modelo? As edições feitas nas perguntas serão perdidas.')) return;
  BANKS = JSON.parse(JSON.stringify(ORIGINAL_BANCOS_SNAPSHOT));
  initBanks();
  mostrarToast('Perguntas originais restauradas.');
}

function carregarTemplateNoMontar(id){
  const t = TEMPLATES.find(x=>x.id===id);
  if(!t) return;
  SECOES_ATIVAS = Object.assign({comportamental:false,competencias:false,tecnica:false,situacional:false,motivacional:false,eliminatoria:false,matriz:false,perfil:false,anexos:false}, t.secoesAtivas);
  BANKS = JSON.parse(JSON.stringify(Object.assign({comportamental:[],competencias:[],tecnica:[],situacional:[],motivacional:[],eliminatoria:[]}, t.bancos)));
  SISTEMA = t.sistema||'estrelas';
  COMPETENCIAS = JSON.parse(JSON.stringify(t.competenciasMatriz||COMPETENCIAS));
  BARS_ANCORAS = JSON.parse(JSON.stringify(t.barsAncoras||BARS_ANCORAS));
  ACTIVE_TEMPLATE_ID = t.id;
  document.getElementById('cfgVaga').value = t.nome;
  document.getElementById('cfgArea').value = t.area||'Geral';
  sincronizarCheckboxesSecoes();
  document.querySelectorAll('input[name="sistema"]').forEach(r=>{ r.checked = (r.value===SISTEMA); });
  setSistema(SISTEMA);
  initBanks();
  renderWeightBuilder();
  renderActiveTemplateBanner();
  sincronizar();
  mudarView('montar');
  mostrarToast('Modelo "'+t.nome+'" carregado. Ajuste o que quiser e siga para o Instrumento.');
}
function gerarInstrumentoAgora(){
  sincronizar();
  clearTimeout(_autoSaveTimer);
  salvarAutosaveAgora(); // best-effort — funciona se estiver num servidor local
  irParaInstrumentoComPayload({
    secoesAtivas: SECOES_ATIVAS, bancos: BANKS, sistema: SISTEMA,
    competenciasMatriz: COMPETENCIAS, barsAncoras: BARS_ANCORAS,
    templateId: ACTIVE_TEMPLATE_ID,
    vaga: document.getElementById('pVaga').value, empresa: document.getElementById('pEmpresa').value,
    entrevistador: document.getElementById('pEntrevistador').value, data: document.getElementById('pData').value,
    modEtapa: document.getElementById('pModEtapa').value,
  });
}
function usarModeloAgora(id){
  const t = TEMPLATES.find(x=>x.id===id);
  if(!t) return;
  const secoesAtivas = Object.assign({comportamental:false,competencias:false,tecnica:false,situacional:false,motivacional:false,eliminatoria:false,matriz:false,perfil:false,anexos:false}, t.secoesAtivas);
  const bancos = Object.assign({comportamental:[],competencias:[],tecnica:[],situacional:[],motivacional:[],eliminatoria:[]}, t.bancos);
  clearTimeout(_autoSaveTimer);
  irParaInstrumentoComPayload({
    secoesAtivas, bancos, sistema: t.sistema||'estrelas',
    competenciasMatriz: t.competenciasMatriz, barsAncoras: t.barsAncoras,
    templateId: t.id, vaga: t.nome,
  });
}
function renderActiveTemplateBanner(){
  const el = document.getElementById('activeTemplateBanner');
  if(!ACTIVE_TEMPLATE_ID){ el.innerHTML=''; return; }
  const t = TEMPLATES.find(x=>x.id===ACTIVE_TEMPLATE_ID);
  el.innerHTML = t ? `<div class="active-template-banner"><b>📋 Modelo ativo</b>${escapeHTML(t.nome)} — ${t.area}</div>` : '';
}
function duplicarTemplate(id){
  const t = TEMPLATES.find(x=>x.id===id); if(!t) return;
  const novo = JSON.parse(JSON.stringify(t));
  novo.id = 'tpl-'+Math.random().toString(36).slice(2,10);
  novo.preset = false;
  novo.nome = t.nome + ' (cópia)';
  novo.criadoEm = new Date().toISOString();
  TEMPLATES.push(novo); salvarTemplatesStorage(); renderTemplates();
  mostrarToast('Modelo duplicado — edite livremente a cópia.');
}
function excluirTemplate(id){
  if(!confirm('Excluir este modelo permanentemente?')) return;
  TEMPLATES = TEMPLATES.filter(x=>x.id!==id); salvarTemplatesStorage(); renderTemplates();
}
function baixarTemplateUnico(id){
  const t = TEMPLATES.find(x=>x.id===id); if(!t) return;
  const blob = new Blob([JSON.stringify(t,null,2)], {type:'application/json'});
  disparaDownload(blob, 'modelo-'+t.nome.replace(/\s+/g,'-').toLowerCase()+'.json');
}
function baixarTemplatesJSON(){
  const blob = new Blob([JSON.stringify(TEMPLATES,null,2)], {type:'application/json'});
  disparaDownload(blob, 'modelos-de-vaga.json');
  mostrarToast('Modelos exportados.');
}
function importarTemplatesJSON(evt){
  const file = evt.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const d = JSON.parse(e.target.result);
      const lista = Array.isArray(d) ? d : [d];
      lista.forEach(t=>{ t.id = t.id || ('tpl-'+Math.random().toString(36).slice(2,10)); });
      TEMPLATES = TEMPLATES.concat(lista);
      salvarTemplatesStorage(); renderTemplates();
      mostrarToast('Modelo(s) importado(s).');
    }catch(err){ mostrarToast('Arquivo inválido.', true); }
  };
  reader.readAsText(file);
}
function abrirModalSalvarTemplate(){
  document.getElementById('mTplNome').value = document.getElementById('cfgVaga').value || '';
  document.getElementById('mTplArea').value = document.getElementById('cfgArea').value || 'Geral';
  document.getElementById('modalTpl').classList.add('show');
}
function salvarTemplateAtual(){
  const nome = document.getElementById('mTplNome').value.trim();
  if(!nome){ mostrarToast('Dê um nome ao modelo.', true); return; }
  const area = document.getElementById('mTplArea').value;
  const novo = {
    id:'tpl-'+Math.random().toString(36).slice(2,10),
    preset:false, nome, area,
    secoesAtivas: JSON.parse(JSON.stringify(SECOES_ATIVAS)),
    sistema: SISTEMA,
    bancos: JSON.parse(JSON.stringify(BANKS)),
    competenciasMatriz: JSON.parse(JSON.stringify(COMPETENCIAS)),
    barsAncoras: JSON.parse(JSON.stringify(BARS_ANCORAS)),
    criadoEm: new Date().toISOString(),
  };
  TEMPLATES.push(novo); salvarTemplatesStorage();
  ACTIVE_TEMPLATE_ID = novo.id;
  renderActiveTemplateBanner();
  fecharModal('modalTpl');
  mostrarToast('Modelo "'+nome+'" salvo em Modelos de Vaga.');
}
function fecharModal(id){ document.getElementById(id).classList.remove('show'); }

/* ═══════════════════════ RENDER DO INSTRUMENTO (PAPEL) ═══════════════════════ */
function chipsPorSistema(qid, tipo){
  const sistema = tipo==='eliminatoria' ? 'passafalha' : SISTEMA;
  const val = RESPOSTAS[qid];
  if(sistema==='numerico5' || sistema==='numerico10'){
    const max = sistema==='numerico5'?5:10;
    let html = '<div class="chip-row">';
    for(let n=1;n<=max;n++) html += `<button type="button" class="chip ${val==n?'on':''}" onclick="setResposta('${qid}',${n})">${n}</button>`;
    return html+'</div>';
  }
  if(sistema==='estrelas'){
    let html = '<div class="chip-row">';
    for(let n=1;n<=5;n++) html += `<button type="button" class="chip ${val>=n?'on':''}" onclick="setResposta('${qid}',${n})">★${n}</button>`;
    return html+'</div>';
  }
  if(sistema==='qualitativo'){
    const niveis = ['Insatisfatório','Abaixo','Atende','Supera','Excepcional'];
    let html = '<div class="chip-row">';
    niveis.forEach((n,i)=> html += `<button type="button" class="chip qual-${i+1} ${val===(i+1)?'on':''}" onclick="setResposta('${qid}',${i+1})">${n}</button>`);
    return html+'</div>';
  }
  if(sistema==='bars'){
    let html = '<div class="chip-row">';
    BARS_ANCORAS.forEach((a,i)=> html += `<button type="button" class="chip bars-${i+1} ${val===(i+1)?'on':''}" title="${escapeHTML(a)}" onclick="setResposta('${qid}',${i+1})">${i+1} · ${escapeHTML(a)}</button>`);
    return html+'</div>';
  }
  if(sistema==='letra'){
    let html = '<div class="chip-row">';
    ['A','B','C','D','E'].forEach(l=> html += `<button type="button" class="chip ${val===l?'on':''}" onclick="setResposta('${qid}','${l}')">${l}</button>`);
    return html+'</div>';
  }
  if(sistema==='passafalha'){
    return `<div class="chip-row">
      <button type="button" class="chip q-yes ${val==='sim'?'on':''}" onclick="setResposta('${qid}','sim')">✓ Sim / Passa</button>
      <button type="button" class="chip q-no ${val==='nao'?'on':''}" onclick="setResposta('${qid}','nao')">✕ Não / Reprova</button>
    </div>`;
  }
  return '';
}
function setResposta(qid, val){ RESPOSTAS[qid] = RESPOSTAS[qid]===val ? undefined : val; renderInstrumento(true); }

function renderSecaoPerguntas(key){
  if(!SECOES_ATIVAS[key]) return '';
  const meta = SEC_META[key];
  const perguntas = getPerguntasAtivas(key);
  const tipo = key==='eliminatoria' ? 'eliminatoria' : 'padrao';
  /* Seção marcada mas ainda sem perguntas: mostra o bloco mesmo assim (com um
     aviso), em vez de sumir do preview — marcar a seção sempre reflete no papel. */
  const corpo = perguntas.length ? perguntas.map((p,i)=>`
        <div class="qitem">
          <div class="qitem-q"><span class="qn">${i+1}.</span><span>${escapeHTML(p.texto)}</span></div>
          <textarea class="qitem-note" placeholder="Anotações / evidências da resposta..." oninput="ANOTACOES['${p.id}']=this.value">${ANOTACOES[p.id]||''}</textarea>
          <div class="qitem-score">
            ${tipo==='eliminatoria' ? '<span class="score-label">Atende ao requisito:</span>' : (SISTEMA==='somente_nota' ? '' : '<span class="score-label">Avaliação:</span>')}
            ${chipsPorSistema(p.id, tipo)}
          </div>
        </div>`).join('') : `<div class="sec-empty">Nenhuma pergunta cadastrada nesta seção ainda. Adicione perguntas no banco à esquerda, em "${escapeHTML(meta.titulo)}".</div>`;
  return `<div class="sec" style="--sec-color:${SEC_COLOR[key]}">
    <div class="sec-tab">${meta.titulo}</div>
    <div class="sec-body">
      <div class="sec-desc">${meta.desc}</div>
      ${corpo}
    </div>
  </div>`;
}
function renderMatriz(){
  if(!SECOES_ATIVAS.matriz) return '';
  let somaPeso=0, somaPonderada=0;
  const rows = COMPETENCIAS.map((c,i)=>{
    const nota = matrizNotas[i] ?? '';
    somaPeso += Number(c.peso)||0;
    if(nota!=='') somaPonderada += (Number(nota)||0) * (Number(c.peso)||0)/100;
    return `<tr><td>${escapeHTML(c.nome)}</td><td style="text-align:center;">${c.peso}%</td>
      <td style="text-align:center;"><input class="mnum" type="number" min="0" max="10" step="0.5" value="${nota}" oninput="matrizNotas[${i}]=this.value; renderInstrumento(true);"></td></tr>`;
  }).join('');
  return `<div class="sec" style="--sec-color:${SEC_COLOR.matriz}"><div class="sec-tab">Matriz de Competências Ponderada</div><div class="sec-body">
    <table class="matrix-table"><thead><tr><th>Competência</th><th style="text-align:center;">Peso</th><th style="text-align:center;">Nota (0–10)</th></tr></thead>
    <tbody>${rows}<tr class="matrix-total-row"><td>Score final ponderado</td><td style="text-align:center;">${somaPeso}%</td><td style="text-align:center;">${somaPonderada.toFixed(2)} / 10</td></tr></tbody></table>
  </div></div>`;
}
function renderPerfil(){
  if(!SECOES_ATIVAS.perfil) return '';
  const rows = Object.keys(PERFIL_TRACOS).map(t=>`
    <div class="trait-row"><label>${t}</label>
      <input type="range" min="0" max="100" value="${PERFIL_TRACOS[t]}" oninput="PERFIL_TRACOS['${t}']=this.value; this.nextElementSibling.textContent=this.value+'%';">
      <span class="val">${PERFIL_TRACOS[t]}%</span></div>`).join('');
  return `<div class="sec" style="--sec-color:${SEC_COLOR.perfil}"><div class="sec-tab">Perfil Comportamental Observado</div><div class="sec-body">
    <div class="sec-desc">Registro subjetivo do entrevistador — não substitui teste comportamental validado.</div>
    ${rows}
    <label class="field-label" style="margin-top:0.6rem;">Combinação predominante observada</label>
    <input class="qitem-note" style="min-height:auto;" placeholder="Ex: perfil comunicativo e orientado a pessoas..." oninput="PERFIL_COMBO=this.value" value="${escapeHTML(PERFIL_COMBO||'')}">
  </div></div>`;
}
function renderAnexos(){
  if(!SECOES_ATIVAS.anexos) return '';
  const rows = ANEXOS.map((a,i)=>`<div class="attach-row"><input value="${escapeHTML(a)}" oninput="ANEXOS[${i}]=this.value"><button class="rm" onclick="ANEXOS.splice(${i},1); renderInstrumento(true);">×</button></div>`).join('');
  return `<div class="sec" style="--sec-color:${SEC_COLOR.anexos}"><div class="sec-tab">Documentos / Anexos Apresentados</div><div class="sec-body">
    <div class="attach-list">${rows}</div>
    <button class="attach-add" onclick="ANEXOS.push(''); renderInstrumento(true);">+ Adicionar documento</button>
  </div></div>`;
}
function renderDecisao(){
  return `<div class="sec" style="--sec-color:${SEC_COLOR.decisao}"><div class="sec-tab">Decisão Final</div><div class="sec-body">
    <label class="field-label">Parecer consolidado</label>
    <textarea class="qitem-note" style="min-height:90px;margin-bottom:1rem;" placeholder="Resumo da avaliação, pontos fortes, pontos de atenção..." oninput="PARECER_FINAL=this.value">${escapeHTML(PARECER_FINAL||'')}</textarea>
    <label class="field-label" style="margin-bottom:0.5rem;">Recomendação</label>
    <div class="stamp-grid">
      <button type="button" class="stamp ${DECISAO==='aprovado'?'on s-green':''}" onclick="setDecisao('aprovado')">Aprovado</button>
      <button type="button" class="stamp ${DECISAO==='reserva'?'on s-amber':''}" onclick="setDecisao('reserva')">Banco de Reserva</button>
      <button type="button" class="stamp ${DECISAO==='reprovado'?'on s-red':''}" onclick="setDecisao('reprovado')">Não Aprovado</button>
    </div>
    <div class="sign-row"><div class="sign-line">Assinatura do(a) Entrevistador(a)</div><div class="sign-line">Assinatura do(a) Gestor(a) Responsável</div></div>
  </div></div>`;
}
function setDecisao(d){ DECISAO = DECISAO===d ? '' : d; renderInstrumento(true); }
function escapeHTML(s){ return (s||'').toString().replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function atualizarHeader(){
  document.getElementById('cfgEmpresa').value = document.getElementById('pEmpresa').value;
  document.getElementById('cfgVaga').value = document.getElementById('pVaga').value;
  document.getElementById('cfgEntrevistador').value = document.getElementById('pEntrevistador').value;
  document.getElementById('cfgData').value = document.getElementById('pData').value;
  renderInstrumento(true);
}
let _instrCode = null;
function codigoInstrumento(){
  if(_instrCode) return _instrCode;
  const d = new Date();
  const rnd = Math.random().toString(36).slice(2,6).toUpperCase();
  _instrCode = `IE-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${rnd}`;
  return _instrCode;
}
function calcularScoreResumo(){
  // combina respostas (normalizadas 0-10) + matriz ponderada, retorna {label, valor0a10}
  const vals = [];
  Object.entries(RESPOSTAS).forEach(([qid,val])=>{
    if(val===undefined||val===null||val==='') return;
    if(qid.startsWith('eliminatoria-')){ return; } // não entra na média, é gate
    if(SISTEMA==='numerico5') vals.push(Number(val)*2);
    else if(SISTEMA==='numerico10') vals.push(Number(val));
    else if(SISTEMA==='estrelas') vals.push(Number(val)*2);
    else if(SISTEMA==='qualitativo'||SISTEMA==='bars') vals.push(Number(val)*2);
    else if(SISTEMA==='letra'){ const map={A:10,B:8,C:6,D:4,E:2}; vals.push(map[val]||0); }
  });
  const mediaPerguntas = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  let matrizScore = null;
  if(SECOES_ATIVAS.matriz && COMPETENCIAS.length){
    let soma=0, temNota=false;
    COMPETENCIAS.forEach((c,i)=>{ const n = matrizNotas[i]; if(n!==undefined && n!=='') { soma += (Number(n)||0)*(Number(c.peso)||0)/100; temNota=true; } });
    if(temNota) matrizScore = soma;
  }
  const eliminatoriasReprovadas = Object.entries(RESPOSTAS).some(([qid,val])=> val==='nao');
  let final = null;
  if(matrizScore!==null && mediaPerguntas!==null) final = (matrizScore+mediaPerguntas)/2;
  else if(matrizScore!==null) final = matrizScore;
  else if(mediaPerguntas!==null) final = mediaPerguntas;
  return {final, mediaPerguntas, matrizScore, eliminatoriasReprovadas};
}
function renderScoreSummary(){
  const s = calcularScoreResumo();
  const el = document.getElementById('scoreSummary');
  if(s.final===null && !s.eliminatoriasReprovadas){ el.innerHTML=''; return; }
  el.innerHTML = `<div class="score-summary-box">
    ${s.final!==null?`<div class="item">Score consolidado<b>${s.final.toFixed(1)} / 10</b></div>`:''}
    ${s.mediaPerguntas!==null?`<div class="item">Média das perguntas<b>${s.mediaPerguntas.toFixed(1)} / 10</b></div>`:''}
    ${s.matrizScore!==null?`<div class="item">Matriz ponderada<b>${s.matrizScore.toFixed(1)} / 10</b></div>`:''}
    ${s.eliminatoriasReprovadas?`<div class="item" style="color:var(--stamp-red);">⚠ Reprovado em requisito eliminatório</div>`:''}
  </div>`;
}
function renderInstrumento(preservarScroll){
  const scrollPos = preservarScroll ? window.scrollY : 0;
  const empresa = document.getElementById('pEmpresa').value || 'Empresa não informada';
  const vaga = document.getElementById('pVaga').value || 'Vaga não informada';
  document.getElementById('pHSub').textContent = `${vaga} — ${empresa}`;
  document.getElementById('pHCode').innerHTML = `${codigoInstrumento()}<br/>Sistema: ${labelSistema(SISTEMA)}`;
  /* Capa do PDF (1ª página, só visível em pdf-export-mode) — mantida em sincronia
     com os mesmos campos de identificação, sem precisar de lógica extra no export. */
  const coverVagaEl = document.getElementById('coverVaga');
  if(coverVagaEl){
    coverVagaEl.textContent = vaga;
    document.getElementById('coverEmpresa').textContent = empresa;
    document.getElementById('coverCandidato').textContent = document.getElementById('pNome').value || '—';
    document.getElementById('coverEntrevistador').textContent = document.getElementById('pEntrevistador').value || '—';
    document.getElementById('coverData').textContent = document.getElementById('pData').value || '—';
    document.getElementById('coverModEtapa').textContent = document.getElementById('pModEtapa').value || '—';
    document.getElementById('coverCode').textContent = codigoInstrumento();
  }
  const tagEl = document.getElementById('pModeloTag');
  if(tagEl){
    const tpl = ACTIVE_TEMPLATE_ID ? TEMPLATES.find(x=>x.id===ACTIVE_TEMPLATE_ID) : null;
    if(tpl){ tagEl.textContent = '📋 Modelo: ' + tpl.nome; tagEl.style.display = 'inline-block'; }
    else{ tagEl.textContent=''; tagEl.style.display='none'; }
  }

  let html = '';
  ['comportamental','competencias','tecnica','situacional','motivacional','eliminatoria'].forEach(k=> html += renderSecaoPerguntas(k));
  html += renderMatriz(); html += renderPerfil(); html += renderAnexos(); html += renderDecisao();
  document.getElementById('instrumentoBody').innerHTML = html;
  renderScoreSummary();
  if(preservarScroll) window.scrollTo(0, scrollPos);
  autoSalvar();
}
function labelSistema(s){
  return {numerico5:'Numérica 1–5', numerico10:'Numérica 1–10', estrelas:'Estrelas', qualitativo:'Qualitativa', bars:'BARS (âncoras)', letra:'Conceito A–E', passafalha:'Passa/Não passa', somente_nota:'Somente anotações'}[s]||s;
}
function sincronizar(){
  document.getElementById('pEmpresa').value = document.getElementById('cfgEmpresa').value;
  document.getElementById('pVaga').value = document.getElementById('cfgVaga').value;
  document.getElementById('pEntrevistador').value = document.getElementById('cfgEntrevistador').value;
  document.getElementById('pData').value = document.getElementById('cfgData').value;
  const modEtapa = [document.getElementById('cfgModalidade').value, document.getElementById('cfgEtapa').value].filter(Boolean).join(' · ');
  document.getElementById('pModEtapa').value = modEtapa;
  renderInstrumento(true);
}

/* ═══════════════════════ EXPORTAÇÃO — INSTRUMENTO INDIVIDUAL ═══════════════════════ */
function coletarDadosCompletos(){
  const score = calcularScoreResumo();
  return {
    versao: 2, codigo: codigoInstrumento(), geradoEm: new Date().toISOString(),
    identificacao:{
      candidato: document.getElementById('pNome').value, vaga: document.getElementById('pVaga').value,
      empresa: document.getElementById('pEmpresa').value, entrevistador: document.getElementById('pEntrevistador').value,
      data: document.getElementById('pData').value, modalidadeEtapa: document.getElementById('pModEtapa').value,
      area: document.getElementById('cfgArea') ? document.getElementById('cfgArea').value : '',
      modalidade: document.getElementById('cfgModalidade') ? document.getElementById('cfgModalidade').value : '',
      etapa: document.getElementById('cfgEtapa') ? document.getElementById('cfgEtapa').value : '',
    },
    secoesAtivas: SECOES_ATIVAS, sistemaPontuacao: SISTEMA, barsAncoras: BARS_ANCORAS, bancos: BANKS,
    competenciasMatriz: COMPETENCIAS, notasMatriz: matrizNotas, perfilComportamental: PERFIL_TRACOS, perfilCombo: PERFIL_COMBO,
    anexos: ANEXOS, respostas: RESPOSTAS, anotacoes: ANOTACOES, parecerFinal: PARECER_FINAL, decisao: DECISAO,
    activeTemplateId: ACTIVE_TEMPLATE_ID,
    scoreResumo: score,
  };
}
function baixarJSON(){
  const dados = coletarDadosCompletos();
  const blob = new Blob([JSON.stringify(dados, null, 2)], {type:'application/json'});
  disparaDownload(blob, `instrumento-${(dados.identificacao.candidato||'candidato').replace(/\s+/g,'-').toLowerCase()}-${dados.codigo}.json`);
  mostrarToast('Dados baixados em JSON.');
}
function baixarHTML(){
  mudarView('instrumento');
  const paperClone = document.getElementById('paperRoot').cloneNode(true);
  paperClone.querySelectorAll('input, textarea').forEach(el=>{
    if(el.type==='date'){
      const span = document.createElement('span'); span.textContent = el.value || '—';
      span.style.cssText = 'display:inline-block;border-bottom:1px dashed #d8cfb8;min-width:120px;'; el.replaceWith(span);
    } else {
      el.setAttribute('value', el.value||''); if(el.tagName==='TEXTAREA') el.textContent = el.value||'';
      el.setAttribute('readonly','readonly');
    }
  });
  const styleTag = document.querySelector('style').outerHTML;
  const fontLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"]')).map(l=>l.outerHTML).join('\n');
  const titulo = document.getElementById('pVaga').value || 'Instrumento de Avaliação';
  const out = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>${escapeHTML(titulo)} — Instrumento de Avaliação</title>${fontLinks}${styleTag}
  <style>body{background:#2a2f3a;padding:2.5rem 1rem;} .paper{max-width:920px;}</style></head><body>${paperClone.outerHTML}</body></html>`;
  const blob = new Blob([out], {type:'text/html'});
  disparaDownload(blob, `instrumento-${titulo.replace(/\s+/g,'-').toLowerCase()}-${codigoInstrumento()}.html`);
  mostrarToast('Instrumento baixado como HTML autônomo.');
}
/* Impressão nativa (botão "🖨️ Imprimir"): aplica o mesmo visual do PDF exportado
   (título em preto forte, sem cabeçalho de marca) e troca o título da aba, já que
   o cabeçalho/rodapé do PRÓPRIO NAVEGADOR (URL, data/hora) só pode ser desligado
   pela pessoa em "Mais configurações" > desmarcar "Cabeçalhos e rodapés" — nenhuma
   página web consegue remover isso via código. Por isso o botão recomendado é
   "📄 Baixar PDF", que gera o arquivo direto (sem passar pela caixa de impressão). */
let _tituloOriginalPrint = null;
/* Referência guardada enquanto a seção de Identificação fica fora do DOM durante a
   exportação (ver removerIdentificacaoParaExport). Sem isso ela some visualmente
   (display:none) mas o html2pdf ainda a encontra pela classe .sec e força uma página
   extra em branco pra ela — por isso precisa mesmo sair do DOM, não só ficar oculta. */
let _identRemovidaInfo = null;
function removerIdentificacaoParaExport(){
  const ident = document.querySelector('#paperRoot .sec-identificacao');
  if(!ident || !ident.parentNode) { _identRemovidaInfo = null; return; }
  _identRemovidaInfo = { el: ident, parent: ident.parentNode, next: ident.nextSibling };
  ident.parentNode.removeChild(ident);
}
function restaurarIdentificacaoAposExport(){
  if(!_identRemovidaInfo) return;
  const { el, parent, next } = _identRemovidaInfo;
  parent.insertBefore(el, next);
  _identRemovidaInfo = null;
}
window.addEventListener('beforeprint', function(){
  const paper = document.getElementById('paperRoot');
  if(paper) paper.classList.add('pdf-export-mode');
  removerIdentificacaoParaExport();
  _tituloOriginalPrint = document.title;
  const nome = (document.getElementById('pNome') && document.getElementById('pNome').value) || 'Candidato';
  const vaga = (document.getElementById('pVaga') && document.getElementById('pVaga').value) || '';
  document.title = vaga ? `${nome} — ${vaga}` : nome;
});
window.addEventListener('afterprint', function(){
  const paper = document.getElementById('paperRoot');
  if(paper) paper.classList.remove('pdf-export-mode');
  restaurarIdentificacaoAposExport();
  if(_tituloOriginalPrint !== null){ document.title = _tituloOriginalPrint; _tituloOriginalPrint = null; }
});

/* ═══ Baixar PDF real (sem caixa de impressão do navegador → sem cabeçalho/rodapé dele) ═══
   Clona o instrumento, converte campos em texto estático, aplica o layout .pdf-export-mode
   (seções mais largas/espaçosas, título em preto forte) e usa html2pdf.js (html2canvas + jsPDF)
   para gerar o arquivo direto — 1 seção = 1 página, via a opção pagebreak.before. */
async function baixarPDF(){
  const btn = document.getElementById('btnBaixarPDF');
  const root = document.getElementById('paperRoot');
  if(!root){ mostrarToast('Abra o instrumento antes de baixar o PDF.'); return; }
  if(typeof html2pdf === 'undefined'){
    mostrarToast('Não foi possível carregar o gerador de PDF (sem internet?). Use "🖨️ Imprimir" como alternativa.');
    return;
  }
  /* Antes eu clonava o instrumento e jogava esse clone pra fora da tela (left:-99999px)
     pra "fotografar" ele com o html2canvas sem o usuário ver. Só que essa técnica
     quebrou o cálculo de largura da captura e cortou o texto à esquerda no PDF.
     Agora eu capturo o elemento DE VERDADE, do jeito que ele já aparece certinho na
     tela — sem clone, sem posição negativa gigante, sem chute de largura. */
  mudarView('instrumento');
  if(btn){ btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = '⏳ Gerando PDF...'; }
  root.classList.add('pdf-export-mode');
  /* Tira a seção de Identificação do DOM (não só escondida por CSS): o html2pdf
     procura elementos ".sec" pra decidir onde forçar quebra de página, e mesmo com
     display:none ele contava essa seção e gerava uma página extra em branco logo
     depois da capa. Removendo o nó de verdade, ele nem entra nessa conta. */
  removerIdentificacaoParaExport();
  try{
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); // garante que o reflow do CSS de exportação já aconteceu antes de capturar

    const nomeCand = (document.getElementById('pNome') && document.getElementById('pNome').value) || 'candidato';
    const arquivo = `instrumento-${nomeCand.replace(/\s+/g,'-').toLowerCase()}-${codigoInstrumento()}.pdf`;

    await html2pdf().set({
      margin: [8,6,8,6],
      filename: arquivo,
      image: { type:'jpeg', quality:0.98 },
      html2canvas: { scale:2, useCORS:true, backgroundColor:'#ffffff' },
      jsPDF: { unit:'mm', format:'a4', orientation:'portrait' },
      /* Só 'css' (sem 'legacy'): o modo legacy fatia a imagem inteira em pixels e,
         por erro de arredondamento, deixava vazar 1-3px da cor da PRÓXIMA seção
         (a "aba" colorida do título) no rodapé da página anterior — o traço colorido
         que aparecia no fim de cada página do PDF. O modo 'css' corta exatamente na
         borda do elemento, sem esse vazamento. */
      pagebreak: { mode:['css'], before:'.sec', avoid:['.qitem','.stamp-grid','.sign-row','tr'] }
    }).from(root).save();

    mostrarToast('PDF baixado — sem cabeçalho/rodapé do navegador.');
  } catch(err){
    console.error(err);
    mostrarToast('Não foi possível gerar o PDF. Tente novamente ou use "🖨️ Imprimir".');
  } finally {
    root.classList.remove('pdf-export-mode');
    restaurarIdentificacaoAposExport();
    if(btn){ btn.disabled = false; btn.textContent = btn.dataset.label || '📄 Baixar PDF'; }
  }
}

function disparaDownload(blob, nome){
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 4000);
}
function importarJSON(evt){
  const file = evt.target.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{ const d = JSON.parse(e.target.result); aplicarDadosImportados(d); mostrarToast('Dados importados com sucesso.'); }
    catch(err){ mostrarToast('Arquivo JSON inválido.', true); }
  };
  reader.readAsText(file);
}
function aplicarDadosImportados(d){
  if(d.identificacao){
    document.getElementById('pNome').value = d.identificacao.candidato||'';
    document.getElementById('pVaga').value = d.identificacao.vaga||'';
    document.getElementById('pEmpresa').value = d.identificacao.empresa||'';
    document.getElementById('pEntrevistador').value = d.identificacao.entrevistador||'';
    document.getElementById('pData').value = d.identificacao.data||'';
    document.getElementById('pModEtapa').value = d.identificacao.modalidadeEtapa||'';
    document.getElementById('cfgEmpresa').value = d.identificacao.empresa||'';
    document.getElementById('cfgVaga').value = d.identificacao.vaga||'';
    document.getElementById('cfgEntrevistador').value = d.identificacao.entrevistador||'';
    document.getElementById('cfgData').value = d.identificacao.data||'';
    if(d.identificacao.area) document.getElementById('cfgArea').value = d.identificacao.area;
    if(d.identificacao.modalidade) document.getElementById('cfgModalidade').value = d.identificacao.modalidade;
    if(d.identificacao.etapa) document.getElementById('cfgEtapa').value = d.identificacao.etapa;
  }
  if(d.activeTemplateId!==undefined) ACTIVE_TEMPLATE_ID = d.activeTemplateId;
  if(d.secoesAtivas) SECOES_ATIVAS = Object.assign(SECOES_ATIVAS, d.secoesAtivas);
  if(d.sistemaPontuacao){ SISTEMA = d.sistemaPontuacao; }
  if(d.barsAncoras) BARS_ANCORAS = d.barsAncoras;
  if(d.bancos) BANKS = Object.assign(BANKS, d.bancos);
  if(d.competenciasMatriz) COMPETENCIAS = d.competenciasMatriz;
  if(d.notasMatriz) matrizNotas = d.notasMatriz;
  if(d.perfilComportamental) PERFIL_TRACOS = d.perfilComportamental;
  if(d.perfilCombo!==undefined) PERFIL_COMBO = d.perfilCombo;
  if(d.anexos) ANEXOS = d.anexos;
  if(d.respostas) RESPOSTAS = d.respostas;
  if(d.anotacoes) ANOTACOES = d.anotacoes;
  if(d.parecerFinal!==undefined) PARECER_FINAL = d.parecerFinal;
  if(d.decisao) DECISAO = d.decisao;
  initBanks();
  sincronizarCheckboxesSecoes();
  document.querySelectorAll('input[name="sistema"]').forEach(r=>{ r.checked=(r.value===SISTEMA); });
  setSistema(SISTEMA); renderWeightBuilder();
  renderActiveTemplateBanner();
  renderInstrumento();
}
function limparTudo(){
  if(!confirm('Isso vai apagar todos os dados preenchidos neste instrumento (não afeta arquivos já baixados ou o arquivo de candidatos salvos). Continuar?')) return;
  try{ localStorage.removeItem('instrumento_autosave_v1'); }catch(e){}
  RESPOSTAS = {}; ANOTACOES = {}; matrizNotas = {}; DECISAO=''; PARECER_FINAL=''; PERFIL_COMBO='';
  ANEXOS = ['Currículo', 'Documento de identidade'];
  ['pNome','pVaga','pEmpresa','pEntrevistador','pData','pModEtapa','cfgVaga','cfgEmpresa','cfgEntrevistador','cfgData'].forEach(id=>document.getElementById(id).value='');
  _instrCode = null; renderInstrumento();
  mostrarToast('Instrumento limpo.');
}

/* ═══════════════════════ ARQUIVO DE CANDIDATOS / COMPARAÇÃO ═══════════════════════ */
function salvarCandidatoArquivo(){
  const dados = coletarDadosCompletos();
  if(!dados.identificacao.candidato){ mostrarToast('Informe o nome do candidato antes de salvar.', true); return; }
  const idx = CANDIDATOS_ARQUIVO.findIndex(c=>c.codigo===dados.codigo);
  if(idx>=0) CANDIDATOS_ARQUIVO[idx] = dados; else CANDIDATOS_ARQUIVO.push(dados);
  salvarCandidatosStorage();
  mostrarToast('Candidato salvo no arquivo de comparação.');
}
function renderComparar(){
  const filtro = (document.getElementById('cmpFiltroVaga').value||'').toLowerCase();
  const lista = CANDIDATOS_ARQUIVO.filter(c=> !filtro || (c.identificacao.vaga||'').toLowerCase().includes(filtro));
  document.getElementById('cmpCount').textContent = `${lista.length} candidato${lista.length===1?'':'s'}`;
  const table = document.getElementById('cmpTable');
  if(!lista.length){ table.innerHTML = '<tr><td style="color:var(--text-dim);padding:2.5rem 1rem;text-align:center;"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:0.6rem;opacity:.6;display:block;margin-left:auto;margin-right:auto;"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></svg>Nenhum candidato salvo ainda.<div style="font-size:0.76rem;margin-top:0.2rem;opacity:.8;">Vá até o Instrumento e clique em "Salvar candidato no arquivo".</div></td></tr>'; return; }
  lista.sort((a,b)=> (b.scoreResumo.final||0)-(a.scoreResumo.final||0));
  table.innerHTML = `<thead><tr><th>Candidato</th><th>Vaga</th><th>Data</th><th>Score</th><th>Decisão</th><th></th></tr></thead>
    <tbody>${lista.map(c=>`<tr>
      <td>${escapeHTML(c.identificacao.candidato)}</td>
      <td>${escapeHTML(c.identificacao.vaga||'—')}</td>
      <td>${c.identificacao.data||'—'}</td>
      <td>${c.scoreResumo.final!==null?`<span class="score-badge">${c.scoreResumo.final.toFixed(1)}</span>`:'—'}${c.scoreResumo.eliminatoriasReprovadas?' ⚠️':''}</td>
      <td>${c.decisao?`<span class="pill-dec pill-${c.decisao}">${c.decisao}</span>`:'—'}</td>
      <td style="display:flex;gap:0.3rem;"><button class="btn sm" onclick="carregarCandidatoParaEdicao('${c.codigo}')">Ver/Editar</button>
      <button class="btn sm danger" onclick="removerCandidatoArquivo('${c.codigo}')">Remover</button></td>
    </tr>`).join('')}</tbody>`;
}
function carregarCandidatoParaEdicao(codigo){
  const d = CANDIDATOS_ARQUIVO.find(c=>c.codigo===codigo); if(!d) return;
  _instrCode = codigo;
  aplicarDadosImportados(d);
  mudarView('instrumento');
}
function removerCandidatoArquivo(codigo){
  if(!confirm('Remover este candidato do arquivo de comparação?')) return;
  CANDIDATOS_ARQUIVO = CANDIDATOS_ARQUIVO.filter(c=>c.codigo!==codigo);
  salvarCandidatosStorage(); renderComparar();
}
function baixarComparacaoCSV(){
  const filtro = (document.getElementById('cmpFiltroVaga').value||'').toLowerCase();
  const lista = CANDIDATOS_ARQUIVO.filter(c=> !filtro || (c.identificacao.vaga||'').toLowerCase().includes(filtro));
  const linhas = [['Candidato','Vaga','Empresa','Entrevistador','Data','Score Consolidado','Média Perguntas','Matriz Ponderada','Decisão','Parecer'].join(';')];
  lista.forEach(c=>{
    linhas.push([
      c.identificacao.candidato, c.identificacao.vaga, c.identificacao.empresa, c.identificacao.entrevistador, c.identificacao.data,
      c.scoreResumo.final!==null?c.scoreResumo.final.toFixed(2):'', c.scoreResumo.mediaPerguntas!==null?c.scoreResumo.mediaPerguntas.toFixed(2):'',
      c.scoreResumo.matrizScore!==null?c.scoreResumo.matrizScore.toFixed(2):'', c.decisao, (c.parecerFinal||'').replace(/[\n;]/g,' ')
    ].map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(';'));
  });
  const blob = new Blob(['\uFEFF'+linhas.join('\n')], {type:'text/csv;charset=utf-8'});
  disparaDownload(blob, 'comparacao-candidatos.csv');
  mostrarToast('Comparação baixada em CSV.');
}

/* ═══════════════════════ AUTOSAVE LOCAL ═══════════════════════ */
let _autoSaveTimer = null;
function salvarAutosaveAgora(){
  try{ localStorage.setItem('instrumento_autosave_v1', JSON.stringify(coletarDadosCompletos())); }catch(e){}
}
function autoSalvar(){
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(salvarAutosaveAgora, 600);
}
function tentarRestaurarAutosave(){
  try{
    const raw = localStorage.getItem('instrumento_autosave_v1'); if(!raw) return;
    const d = JSON.parse(raw);
    if(d && d.identificacao && (d.identificacao.candidato || d.identificacao.vaga)) aplicarDadosImportados(d);
  }catch(e){}
}

/* ═══════════════════════ TOAST ═══════════════════════ */
function mostrarToast(msg, isError){
  const t = document.getElementById('toast'); t.textContent = msg;
  t.style.borderColor = isError ? 'var(--stamp-red)' : 'var(--accent)';
  t.classList.add('show'); setTimeout(()=>t.classList.remove('show'), 2800);
}

/* ═══════════════════════ INIT ═══════════════════════ */
try{
  const veioDaURL = aplicarPayloadDaURL();
  if(!veioDaURL) tentarRestaurarAutosave();
  sincronizarCheckboxesSecoes();
  if(document.getElementById('weightBuilder')) renderWeightBuilder();
  if(document.getElementById('instrumentoBody')){ initBanks(); renderInstrumento(); }
  if(document.getElementById('activeTemplateBanner')) renderActiveTemplateBanner();
  if(veioDaURL && _modoPayloadAtual==='instrumento') mostrarToast('Modelo carregado. Preencha o nome do candidato e as respostas.');
  const bannerEV = document.getElementById('editarVagaBanner');
  if(bannerEV && _modoPayloadAtual!=='editarVaga'){
    bannerEV.textContent = 'Nenhuma vaga selecionada. Volte para "Modelos de Vaga" e clique em "✏️ Editar esta vaga" em um modelo.';
  }
}catch(e){ console.error('Erro ao iniciar módulos da página:', e); }
