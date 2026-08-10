/* My Performance — seed data. Generated from GSA Quest v7 + Strategy + personal/career goals. */
var QUEST_SEED=[];
var DEFAULT_REWARDS=[
  {id:'rw-game',title:'1 hora extra de game/série',cost:80,icon:'🎮'},
  {id:'rw-free',title:'Noite livre sem backlog',cost:140,icon:'🌙'},
  {id:'rw-food',title:'Refeição especial / rodízio',cost:250,icon:'🍣'},
  {id:'rw-day',title:'Meio período totalmente livre',cost:400,icon:'🏖️'}
];
var DOMAIN_META={Pessoal:{icon:'♥',attribute:'Vitalidade'},GSA:{icon:'◆',attribute:'Negócios'},Estudos:{icon:'⌘',attribute:'Intelecto'},Carreira:{icon:'↗',attribute:'Carreira'}};
var RANKS=[[0,'Novato'],[500,'Aprendiz'],[1400,'Aventureiro'],[2800,'Executor'],[4800,'Estrategista'],[7500,'Veterano'],[11000,'Mestre'],[15500,'Lenda'],[21000,'Ascendente'],[28000,'My Performance']];
var GSA_TARGETS={revenue:61400,breakEven:50400,result:3823,clients:11,diagnostics:25,productHours:166,months:[['Agosto',10000],['Setembro',11400],['Outubro',12500],['Novembro',13500],['Dezembro',14000]]};
function Q(o){QUEST_SEED.push(Object.assign({description:'',domain:'Pessoal',category:'Geral',questType:'side',cadence:'once',weekdays:[],xp:30,difficulty:2,source:'My Performance',owner:'Vitor',dependencies:[],correlations:[],tags:[]},o))}
function GM(r){Q({id:'gsa-'+r[0],title:r[1],description:r[2],domain:'GSA',category:r[3],owner:r[4],startDate:r[5],dueDate:r[6],xp:r[7],difficulty:r[8]?4:3,questType:r[8]?'main':'side',dependencies:(r[9]||[]).map(x=>'gsa-'+x),externalDate:!!r[10],source:'GSA Quest',tags:['gsa',r[3].toLowerCase()].concat(r[8]?['crítico']:[])})}
function GR(r){Q({id:'gsa-r-'+r[0],title:r[1],description:r[2],domain:'GSA',category:r[3],owner:r[4],cadence:r[5],weekdays:r[6]||[],xp:r[7],startDate:r[8]||'',dueDate:r[9]||'',rule:r[10]||'',difficulty:r[5]==='daily'?2:3,source:'GSA Quest',tags:['gsa','recorrente']})}

/* PESSOAL */
Q({id:'personal-wake',title:'Acordar no horário planejado',description:'Começar o dia no horário definido. Ajuste este horário à sua rotina.',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'07:00',xp:20,difficulty:1,tags:['manhã']});
Q({id:'personal-breakfast',title:'Tomar café da manhã',description:'Não pular a primeira refeição do dia.',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'08:00',xp:15,difficulty:1,dependencies:['personal-wake'],tags:['alimentação']});
Q({id:'personal-lunch',title:'Almoçar',description:'Parar para almoçar e proteger o básico da rotina.',domain:'Pessoal',category:'Rotina',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'12:30',xp:15,difficulty:1,tags:['alimentação']});
Q({id:'personal-gym',title:'Academia / treino do dia',description:'Cumprir o treino planejado. Dias e horário são totalmente editáveis.',domain:'Pessoal',category:'Corpo',cadence:'daily',weekdays:[1,2,4,6],timeStart:'18:30',xp:40,difficulty:2,tags:['treino']});
Q({id:'personal-leisure',title:'Tempo de lazer sem culpa',description:'Bloco protegido para jogo, série, amigos, música ou simplesmente descansar.',domain:'Pessoal',category:'Equilíbrio',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'21:00',timeEnd:'22:00',xp:20,difficulty:1,tags:['lazer']});
Q({id:'personal-sleep',title:'Encerrar o dia e dormir no horário',description:'Iniciar a rotina de sono no horário definido.',domain:'Pessoal',category:'Rotina',questType:'main',cadence:'daily',weekdays:[0,1,2,3,4,5,6],timeStart:'23:30',xp:30,difficulty:2,dependencies:['personal-leisure'],tags:['sono']});
Q({id:'personal-week-review',title:'Revisão pessoal da semana',description:'Revisar a semana e escolher três prioridades reais para a próxima.',domain:'Pessoal',category:'Disciplina',questType:'main',cadence:'weekly',weekdays:[0],timeStart:'19:00',xp:80,difficulty:2,tags:['revisão']});

/* CARREIRA */
Q({id:'career-impact',title:'1 ação de carreira de alto impacto',description:'Candidatura dirigida, follow-up decisivo, entrevista ou entrega que aumente empregabilidade.',domain:'Carreira',category:'Profissional',cadence:'daily',weekdays:[1,2,3,4,5],timeStart:'10:00',xp:30,difficulty:2,tags:['carreira']});
Q({id:'career-network',title:'Networking de valor',description:'Contato útil e específico com alguém da rede, sem mensagem genérica.',domain:'Carreira',category:'Networking',cadence:'daily',weekdays:[2,4],timeStart:'17:00',xp:25,difficulty:2,tags:['networking']});
Q({id:'career-pipeline',title:'Revisar pipeline de oportunidades',description:'Atualizar processos, próximos passos, follow-ups e foco.',domain:'Carreira',category:'Planejamento',questType:'main',cadence:'weekly',weekdays:[1],timeStart:'09:00',xp:70,difficulty:2,tags:['pipeline']});
Q({id:'career-assets',title:'Atualizar ativos de carreira',description:'CV, LinkedIn, portfólio e provas de resultado refletindo o melhor trabalho do mês.',domain:'Carreira',category:'Posicionamento',cadence:'monthly',monthDay:1,xp:120,difficulty:3,tags:['cv','linkedin']});

/* STRATEGY — missões recorrentes */
Q({id:'study-focus',title:'Sessão foco — específicos',description:'90 min: memória, teoria focada, questões, correção e síntese.',domain:'Estudos',category:'Transpetro',questType:'main',cadence:'daily',weekdays:[1,2,3,4,5],timeStart:'19:00',xp:80,difficulty:3,source:'Strategy',tags:['transpetro']});
Q({id:'study-q25',title:'Questões específicas — 25',description:'Volume diário com correção obrigatória.',domain:'Estudos',category:'Transpetro',cadence:'daily',weekdays:[1,2,3,4,5],timeStart:'19:00',xp:50,difficulty:2,source:'Strategy',tags:['transpetro']});
Q({id:'study-errors',title:'Caderno de erros — manutenção diária',description:'Refazer erros antigos, registrar causa e regra anti-erro.',domain:'Estudos',category:'Transpetro',cadence:'daily',weekdays:[1,2,3,4,5],timeStart:'20:30',xp:35,difficulty:2,source:'Strategy',tags:['transpetro']});
Q({id:'study-basic',title:'Básicos — Português / Inglês',description:'Manutenção curta e objetiva do bloco básico.',domain:'Estudos',category:'Transpetro',cadence:'daily',weekdays:[1,2,3,4,5],timeStart:'20:45',xp:35,difficulty:2,source:'Strategy',tags:['transpetro']});
Q({id:'study-boss',title:'Boss semanal — 50 específicas',description:'Simulado técnico cronometrado, sem consulta.',domain:'Estudos',category:'Transpetro',questType:'main',cadence:'daily',weekdays:[6],timeStart:'09:00',xp:100,difficulty:5,source:'Strategy',tags:['transpetro','boss']});
Q({id:'study-postboss',title:'Pós-boss — transformar erro em ponto',description:'Correção ativa imediatamente após o boss.',domain:'Estudos',category:'Transpetro',cadence:'daily',weekdays:[6],timeStart:'11:00',xp:50,difficulty:3,source:'Strategy',dependencies:['study-boss'],tags:['transpetro']});
Q({id:'study-sunday',title:'Revisão de domingo — síntese semanal',description:'Refazer erros, revisar fórmulas e planejar a semana.',domain:'Estudos',category:'Transpetro',cadence:'daily',weekdays:[0],timeStart:'17:00',xp:70,difficulty:3,source:'Strategy',tags:['transpetro']});
Q({id:'study-basicmix',title:'Básicos — bloco misto de domingo',description:'10 questões de Português + 10 de Inglês, com correção.',domain:'Estudos',category:'Transpetro',cadence:'daily',weekdays:[0],timeStart:'18:00',xp:40,difficulty:2,source:'Strategy',tags:['transpetro']});
[['study-w-hours','12 horas líquidas de estudo','Carga-base semanal da campanha.',120],['study-w-q250','250 questões corrigidas','Questão + correção, não apenas clique.',150],['study-w-bosses','2 bosses técnicos','Dois blocos de 50 específicas na semana.',120],['study-w-errors','Revisar 20 erros','Eliminar reincidência antes de adicionar conteúdo.',80],['study-w-topics','Atualizar mapa de domínio','Transformar sensação em percentual por tópico.',50]].forEach(r=>Q({id:r[0],title:r[1],description:r[2],domain:'Estudos',category:'Transpetro',questType:'main',cadence:'weekly',weekdays:[0],xp:r[3],difficulty:3,source:'Strategy',tags:['transpetro','semanal']}));
function SM(id,title,desc,due,xp,dep){Q({id,title,description:desc,domain:'Estudos',category:'Transpetro',questType:'main',cadence:'monthly',startDate:due.slice(0,7)+'-01',dueDate:due,monthDay:Number(due.slice(8)),xp,difficulty:4,source:'Strategy',dependencies:dep?[dep]:[],tags:['transpetro','mensal']})}
SM('study-aug-diag','Fechar os 3 diagnósticos','Mecânica, Comércio/Suprimentos e Transporte Marítimo.','2026-08-16',180);
SM('study-aug-build','Congelar a build principal','Escolher uma trilha e parar de dispersar preparação.','2026-08-20',80,'study-aug-diag');
SM('study-aug-volume','600 questões no mês','Construir base real de incidência e erros.','2026-08-31',200);
SM('study-aug-score','Boss de agosto — 30/50','Fechar o mês acima de 60% nas específicas.','2026-08-31',160,'study-aug-diag');
SM('study-aug-material','Fechar infraestrutura de estudo','Prova 2023, teoria, banco de questões, erros e rotina.','2026-08-31',70);
SM('study-sep-syllabus','Fechar 80% do conteúdo prioritário','Cobertura com foco em incidência e fraqueza.','2026-09-30',220,'study-aug-build');
SM('study-sep-volume','1.000 questões em setembro','Acelerar aprendizado por exposição e correção.','2026-09-30',240);
SM('study-sep-boss','4 bosses no mês','Um teste robusto por semana.','2026-09-30',180);
SM('study-sep-score','Boss de setembro — 35/50','Atingir 70% nas específicas.','2026-09-30',180,'study-aug-score');
SM('study-sep-errors','Reduzir reincidência de erros','Reincidência abaixo de 25%.','2026-09-30',100);
SM('study-oct-volume','1.200 questões em outubro','Mês de raids: treino e pouca passividade.','2026-10-31',260);
SM('study-oct-bosses','8 bosses técnicos','Dois bosses por semana.','2026-10-31',240);
SM('study-oct-score','Atingir 39/50','Entrar na faixa competitiva antes do endgame.','2026-10-15',220,'study-sep-score');
SM('study-oct-full','3 simulados completos de 70 questões','Treinar tempo, básicos e fadiga.','2026-10-31',180,'study-oct-score');
SM('study-oct-weak','Eliminar tópicos críticos','Nenhum tópico central abaixo de 50% de domínio.','2026-10-31',140);
SM('study-nov-trinca','Trinca 42+','Três simulados consecutivos com 42/50 ou mais.','2026-11-20',300,'study-oct-full');
SM('study-nov-basic','Básicos 16/20','Português e Inglês sem perda barata de pontos.','2026-11-20',120);
SM('study-nov-errors','Zerar erros reincidentes graves','Última limpeza do caderno.','2026-11-23',140);
SM('study-nov-final','Buff final','Documentos, rota, materiais, sono e redução de carga.','2026-11-29',120,'study-nov-trinca');
SM('study-final-boss','Final Boss — prova','Executar a prova com estratégia de tempo, marcação e revisão.','2026-11-30',300,'study-nov-final');

/* GSA QUEST v7 — 43 marcos */
[
['c1','RIW 04–07/08 — inscrição IoT + Software House','30 conversas qualificadas e 5 indústrias do RJ candidatas.','Captação','Vitor','2026-08-05','2026-08-07',120,1,[],1],
['c2','Cadastro no SisFAPERJ','Login = CPF do proponente. Só Firefox ou Chrome em Windows. Leva dias.','Captação','Vitor','2026-08-05','2026-08-10',60,1,[],0],
['c3','Lattes do proponente e da equipe','Produção dos últimos 5 anos. Se não existe, criar agora.','Captação','Ambos','2026-08-10','2026-08-17',60,0,[],0],
['c4','Carta de Interesse da indústria assinada','Anexo 7. Empresa sediada no RJ, com CNPJ, CNAE e município.','Captação','Vitor','2026-08-07','2026-08-22',220,1,['c1'],0],
['c5','Protocolar pedido de R$10.000 de giro','Niterói Empreendedora (juro 0%) ou AgeRio.','Captação','Vitor','2026-08-12','2026-08-20',70,0,[],0],
['c6','Proformas de todos os fornecedores','Proposta orçamentária de cada firma, para todos os itens.','Captação','Fábio','2026-08-25','2026-09-07',90,0,[],0],
['c7','Hacktown 03–08/09 — estande e investidores','Apresentação, PIXEL TI e primeiras conversas de investimento.','Captação','Ambos','2026-09-03','2026-09-08',140,0,[],1],
['c8','TRL 6 demonstrado e gravado','Funções críticas em ambiente relevante. Declarar 6, nunca 7.','Captação','Fábio','2026-08-20','2026-09-14',200,1,['p2'],0],
['c9','Vídeo de 4 minutos no YouTube','Proposta, equipe, escopo, protótipo e plano.','Captação','Vitor','2026-09-08','2026-09-21',110,0,['c8'],0],
['c10','FAPERJ 15/2026 submetido','R$200.000 por R$10.000 de contrapartida. Limite interno 22/09.','Captação','Vitor','2026-09-15','2026-09-22',400,1,['c2','c3','c4','c6','c8','c9'],1],
['c11','R$10.000 de capital de giro contratados','Contrapartida do FAPERJ e cobertura do pico de caixa.','Captação','Vitor','2026-08-20','2026-09-30',120,0,['c5'],0],
['c12','10 investidores-alvo mapeados','Anjos e fundos do RJ com tese, ticket e contato.','Captação','Vitor','2026-09-08','2026-09-30',80,0,[],0],
['c13','Resultado FAPERJ — preliminar 16/10, final 29/10','Se recomendado, reunir certidões negativas.','Captação','Vitor','2026-10-16','2026-10-29',60,0,[],1],
['c14','Material de rodada pronto','Tração real: obras no Parwati, retenção e take rate.','Captação','Vitor','2026-11-01','2026-11-30',140,0,['p11'],0],
['s1','Publicar tabela dos portes e nova proposta','Projeto = 12% do investimento, piso R$2.200. Preparação R$260/h. Execução R$1.500/dia.','Serviço','Vitor','2026-08-05','2026-08-08',90,1,[],0],
['s2','Consultar o CREA-RJ sobre atribuição','Validar atribuição de projeto de automação.','Serviço','Vitor','2026-08-05','2026-08-12',80,1,[],0],
['s3','Kit do parceiro + 10 arquitetos listados','Arquitetos de imóveis 120 m²+ como canal do porte Integrado.','Serviço','Vitor','2026-08-12','2026-08-31',90,0,[],0],
['s4','Catálogo homologado v1 + processo de bancada','Máximo 2 marcas por categoria.','Serviço','Fábio','2026-08-10','2026-08-31',100,0,[],0],
['s5','1º job costing — formato de dado do Parwati','Resolve premissa de margem e já nasce como esquema do app.','Serviço','Vitor','2026-08-20','2026-08-31',150,1,[],0],
['s6','4 checklists em 100% das entregas','Levantamento · material · instalação · entrega/aceite.','Serviço','Fábio','2026-09-01','2026-09-01',70,0,['s4'],0],
['s7','Template de projeto executivo v1','Pré-requisito para terceirizar projeto.','Serviço','Fábio','2026-09-05','2026-09-30',130,1,[],0],
['s8','Primeira venda de porte Integrado','R$6.000 de projeto. Marco binário.','Serviço','Vitor','2026-09-01','2026-09-30',200,1,['s1','s3','e2'],0],
['s9','Dossiê de cliente em 100% da base','Base do suporte e da fronteira de responsabilidade.','Serviço','Fábio','2026-10-01','2026-10-31',90,0,[],0],
['s10','Case Integrado completo em vídeo','Sem case desse porte, não se vende esse porte novamente.','Serviço','Vitor','2026-11-01','2026-11-30',110,0,['s8'],0],
['s11','12 parceiros ativos, 4 arquitetos','Ativo = 1 indicação nos últimos 90 dias.','Serviço','Vitor','2026-08-05','2026-12-31',180,0,[],0],
['s12','R$61.400 faturados no período','Pró-labore coberto pela operação nos cinco meses.','Serviço','Vitor','2026-08-05','2026-12-31',500,1,[],1],
['p1','Arquitetura e modelo de dados dos 3 apps','Lakshimi, Parwati e Saraswati num só esquema.','Produto','Fábio','2026-08-10','2026-08-31',180,1,[],0],
['p2','Protótipo da EVA demonstrável','Roteamento local do determinístico. IA ≤ R$10/casa/mês.','Produto','Fábio','2026-08-05','2026-08-31',150,0,[],0],
['p3','Matriz de proficiências — Saraswati v0','Planilha, não software; modelo de dados dos técnicos.','Produto','Fábio','2026-09-01','2026-09-15',90,0,['p1'],0],
['p4','10 técnicos cadastrados','Oferta inicial do Parwati.','Produto','Fábio','2026-09-01','2026-09-30',220,1,['e1','p3'],0],
['p5','PARWATI v1 rodando nas obras da GSA','Login, solicitação, aceite, checklist, foto/série e horas por obra.','Produto','Fábio','2026-09-15','2026-10-31',350,1,['p1','p4','s7'],0],
['p6','Take rate testado em 2 obras','15% a 20% do serviço, com pagamento pela plataforma.','Produto','Vitor','2026-10-10','2026-10-31',120,0,['p5'],0],
['p7','LAKSHIMI v1 no ar','Solicitação, acompanhamento, histórico do imóvel e avaliação.','Produto','Fábio','2026-11-01','2026-11-30',300,1,['p5'],0],
['p8','Integração EVA ↔ Lakshimi desenhada','A EVA é o motivo de frequência do app.','Produto','Fábio','2026-11-05','2026-11-30',130,0,['p7'],0],
['p9','Soft launch fechado — 5 casas','Convite direto e acompanhamento próximo.','Produto','Vitor','2026-11-15','2026-11-30',160,0,['p7'],0],
['p10','Primeiros 10 usuários reais no Lakshimi','Usuário solicita e é atendido.','Produto','Vitor','2026-12-01','2026-12-20',250,1,['p9'],0],
['p11','20 obras registradas ponta a ponta','Cada obra é uma linha de dado do Tridevi.','Produto','Fábio','2026-10-01','2026-12-31',280,1,['p5'],0],
['p12','11 assinaturas EVA ativas','R$99,90/mês, hub comprado pelo cliente e preparado na bancada.','Produto','Vitor','2026-08-05','2026-12-31',200,0,[],0],
['e1','Contrato-padrão PJ + termo de adesão','Dois documentos separados; objeto por obra, sem exclusividade.','Estrutura','Vitor','2026-08-10','2026-08-31',170,1,[],0],
['e2','Engenheiro eletricista PJ contratado','Assina a ART do Integrado antes da primeira venda.','Estrutura','Vitor','2026-09-01','2026-09-25',150,1,['e1','s2'],0],
['e3','Instalador PJ ativo — sob gatilho','Gatilho: 3 obras/mês ou fila acima de 21 dias.','Estrutura','Fábio','2026-10-01','2026-10-31',110,0,['e1'],0],
['e4','Avaliar gatilho do desenvolvedor PJ','Contrata em novembro só se outubro > R$14.000 ou FAPERJ aprovado.','Estrutura','Vitor','2026-10-25','2026-10-31',70,0,[],0],
['e5','Material de pitch para investidor','Deck + protótipo demonstrável antes do Hacktown.','Estrutura','Ambos','2026-08-15','2026-08-31',110,0,['p2'],0]
].forEach(GM);

/* GSA QUEST v7 — 21 cadências */
[
['check','Check diário (15 min)','Obras do dia, chamados e leads sem resposta >24h.','Cadência','Ambos','daily',[1,2,3,4,5],10],
['lead','Zerar leads sem resposta','Nenhum lead passa de 24h sem retorno.','Vendas','Vitor','daily',[1,2,3,4,5],10],
['prosp','1 contato novo de prospecção','Arquiteto, decorador, construtora ou administradora.','Vendas','Vitor','daily',[1,2,3,4,5],14],
['chamado','Triagem de chamados e SLA','Triagem remota primeiro; suporte fora de contrato é cobrado.','Operações','Fábio','daily',[1,2,3,4,5],10],
['parwreg','Registrar a obra do dia no Parwati','A partir de outubro toda obra roda dentro do app.','Tridevi','Fábio','daily',[1,2,3,4,5],18,'2026-10-01','2026-12-31'],
['placar','Placar semanal (45 min)','Realizado × meta, funil, obras no Parwati e UMA decisão corretiva.','Cadência','Ambos','weekly',[1],40],
['funil','Revisar o funil por etapa','Diagnóstico → proposta → fechamento; conversão por porte.','Vendas','Vitor','weekly',[1],20],
['um11','1 Um-a-Um do BNI','A conversa que gera a referência.','BNI','Vitor','weekly',[2],25],
['bni','Reunião semanal do BNI','Pedido de 30s específico e rotativo por mês.','BNI','Vitor','weekly',[4],30],
['evaia','Medir custo de IA por casa da EVA','Alvo ≤ R$10/casa/mês.','EVA','Fábio','weekly',[3],30],
['sprint','Sprint de produto (45 min)','Escopo entregue × planejado; dívida técnica declarada.','Tridevi','Fábio','weekly',[5],40],
['checkl','Checklists e dossiê das obras','4 checklists em 100% das entregas.','Operações','Fábio','weekly',[5],28],
['catal','Revisar catálogo e preço de compra','2 marcas por categoria; preço é alavanca de margem.','Operações','Fábio','weekly',[3],22],
['tecrec','Recrutar 1 técnico para o Parwati','Meta de 10 cadastrados até 30/09.','Tridevi','Fábio','daily',[2,4],35,'2026-09-01','2026-09-30'],
['faperj','Bloco FAPERJ (2h)','Dossiê, anexos e orçamento.','Captação','Fábio','daily',[2,4],45,'2026-08-05','2026-09-22'],
['post','Publicar conteúdo','8 por mês; demonstração de cena em vídeo.','Marketing','Vitor','daily',[1,4],16],
['diag','Diagnóstico com lead','25 no período, ~5/mês.','Vendas','Vitor','weekly',[3],45],
['reuparc','Reunião de parceria','Arquiteto de 120 m²+ é o canal do porte Integrado.','Vendas','Vitor','weekly',[2],30],
['fecha','Fechamento mensal (5º dia útil)','DRE, margem por porte, caixa e gatilhos.','Cadência','Ambos','monthly',[],80,'','', 'fifthBusinessDay'],
['jobc','Job costing de todas as obras do mês','Margem real por serviço e por porte.','Operações','Vitor','monthly',[],60,'','', 'fifthBusinessDay'],
['socios','Reunião de sócios (1h)','Sociedade, incômodos e visão — separada da operação.','Cadência','Ambos','monthly',[],40,'','', 'weekday15']
].forEach(GR);

var ACHIEVEMENTS=[
{id:'first',icon:'⚔️',title:'Primeiro Passo',desc:'Conclua sua primeira quest.',test:s=>s.totalDone>=1},
{id:'streak3',icon:'🔥',title:'Combo x3',desc:'3 dias seguidos com atividade.',test:s=>s.streak>=3},
{id:'streak7',icon:'🔥',title:'Semana Perfeita',desc:'7 dias seguidos com atividade.',test:s=>s.streak>=7},
{id:'xp1k',icon:'✨',title:'Leveling',desc:'Alcance 1.000 XP.',test:s=>s.xp>=1000},
{id:'main5',icon:'👑',title:'Boss Hunter',desc:'Conclua 5 Main Quests.',test:s=>s.mainDone>=5},
{id:'domains',icon:'🧭',title:'Vida Integrada',desc:'Ganhe XP nos quatro domínios.',test:s=>Object.values(s.domainXp).every(x=>x>0)},
{id:'gsa',icon:'◆',title:'Founder Mode',desc:'Conclua 10 quests da GSA.',test:s=>(s.domainDone.GSA||0)>=10},
{id:'study',icon:'📚',title:'Grinding',desc:'Conclua 20 quests de estudo.',test:s=>(s.domainDone.Estudos||0)>=20},
{id:'legend',icon:'🏆',title:'Lenda',desc:'Alcance 15.500 XP.',test:s=>s.xp>=15500}
];
