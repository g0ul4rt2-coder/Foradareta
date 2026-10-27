import sys
sys.path.insert(0, "/tmp/claude-0/-home-user-gelato-paradiso/bccbadb1-94fa-50d4-9a03-5366ba381e06/scratchpad/bussola/linhas_src")
from gen1 import E, save, WIKI_ELEICAO

W_SAM = "https://pt.wikipedia.org/wiki/Samara_Martins"
CNN_SAM = "https://www.cnnbrasil.com.br/eleicoes/quem-e-samara-martins-unica-pre-candidata-mulher-a-presidencia/"
DN_SAM = "https://diariodonordeste.verdesmares.com.br/pontopoder/quem-e-samara-martins-candidata-da-up-a-presidencia-da-republica-em-2026-1.3779598"
NAO_HA = "Não há processos conhecidos: não localizei inquérito, denúncia, ação judicial ou decisão da Justiça Eleitoral contra {n}. Nunca exerceu mandato eletivo nem cargo de governo."

save({"id": "samara-martins", "nome": "Samara Martins", "eventos": [
 E("1987-08-31", "origem", "Nasce em Belo Horizonte",
   "Samara Martins nasce em Belo Horizonte (MG). Começa a militar ainda na escola, na associação de estudantes secundaristas da Grande BH (AMES-BH).", W_SAM),
 E("2016-06-16", "cargo", "Vice-presidente nacional da UP",
   "Torna-se vice-presidente nacional da Unidade Popular (UP), partido socialista. Também foi diretora de mulheres da UNE e coordena a Frente Negra Revolucionária.", W_SAM),
 E("2017", "carreira", "Dentista do SUS no RN",
   "Formada em Odontologia pela UFRN, passa a trabalhar como dentista no SUS no Rio Grande do Norte.", W_SAM),
 E("2020", "eleicao", "Candidata a vereadora em Natal",
   "Primeira eleição: recebe 515 votos (0,14%) e não é eleita.", W_SAM),
 E("2022", "eleicao", "Vice na chapa de Léo Péricles",
   "Candidata a vice-presidente na chapa de Léo Péricles (UP), a única chapa formada só por pessoas negras naquela eleição; 53.519 votos (0,05%).", W_SAM, pessoas=["leo-pericles"]),
 E("2026-02", "eleicao", "UP lança sua pré-candidatura",
   "O Diretório Nacional da UP decide lançá-la à Presidência; aos 38 anos, é a única mulher entre os pré-candidatos naquele momento.", CNN_SAM),
 E("2026-07-26", "eleicao", "Chapa 100% feminina",
   "Convenção oficializa a candidatura com a sindicalista Raquel Brício, guarda portuária e cofundadora do Movimento de Mulheres Olga Benário, como vice.", DN_SAM, pessoas=["raquel-bricio"]),
 E("2026-10-04", "eleicao", "7º lugar no 1º turno",
   "Recebe 122.911 votos (0,10%).", W_SAM),
 E("2026-10", "alianca", "Apoia Lula no 2º turno",
   "A Wikipédia registra a candidata entre os que apoiam Lula (PT) contra Flávio Bolsonaro no 2º turno; não localizei a data da nota oficial.", WIKI_ELEICAO, pessoas=["lula"]),
], "resumo_juridico": NAO_HA.format(n="Samara Martins")})

W_HERTZ = "https://pt.wikipedia.org/wiki/Hertz_Dias"
DN_HERTZ = "https://diariodonordeste.verdesmares.com.br/pontopoder/quem-e-hertz-dias-candidato-a-presidente-da-republica-pelo-pstu-em-2026-1.3781043"
save({"id": "hertz-dias", "nome": "Hertz Dias", "eventos": [
 E("1970-10-20", "origem", "Nasce em São José de Ribamar (MA)",
   "Hertz Dias nasce em São José de Ribamar, Maranhão. Forma-se em História, faz mestrado em Educação e vira professor das redes estadual e municipal. É rapper do grupo Gíria Vermelha e cofundador do Movimento Quilombo Urbano, de hip-hop e combate ao racismo.", W_HERTZ),
 E("2010", "eleicao", "Candidato a vice-governador do Maranhão",
   "Primeira disputa, pelo PSTU, como candidato a vice-governador; não eleito.", DN_HERTZ),
 E("2018", "eleicao", "Vice na chapa de Vera Lúcia",
   "Candidato a vice-presidente na chapa de Vera Lúcia (PSTU); não eleito.", W_HERTZ, pessoas=["vera-lucia"]),
 E("2020", "eleicao", "Candidato a prefeito de São Luís",
   "Recebe 2.173 votos (0,42%) e não é eleito.", W_HERTZ),
 E("2022", "eleicao", "Candidato a governador do Maranhão",
   "Recebe 5.191 votos (0,15%) e não é eleito.", W_HERTZ),
 E("2026-03-02", "eleicao", "Lança pré-candidatura à Presidência",
   "O PSTU anuncia sua pré-candidatura; ele defende o fim da escala 6x1, a ruptura com o capitalismo e critica o governo Lula por 'governar para a burguesia'.",
   "https://oimparcial.com.br/noticias/2026/03/hertz-dias-lanca-pre-candidatura-a-presidencia-e-defende-fim-da-escala-6x1-e-ruptura-com-o-capitalismo/", pessoas=["lula"]),
 E("2026-07-31", "eleicao", "Convenção confirma a candidatura",
   "Convenção do PSTU oficializa a chapa com a professora mineira Vanessa Portugal, sindicalista da CSP-Conlutas, como vice. É sua quinta eleição.", DN_HERTZ, pessoas=["vanessa-portugal"]),
 E("2026-10-04", "eleicao", "8º lugar no 1º turno",
   "Recebe 43.103 votos (0,04%).", W_HERTZ),
 E("2026-10", "alianca", "Apoia Lula no 2º turno",
   "A Wikipédia registra o candidato entre os que apoiam Lula contra Flávio Bolsonaro no 2º turno; não localizei a data da nota oficial do PSTU.", WIKI_ELEICAO, pessoas=["lula"]),
], "resumo_juridico": NAO_HA.format(n="Hertz Dias")})

W_CLA = "https://pt.wikipedia.org/wiki/Clariana_Bar%C3%A3o"
save({"id": "clariana-barao", "nome": "Clariana Barão", "eventos": [
 E("1987-04-03", "origem", "Nasce em Cuiabá (MT)",
   "Clariana Zacarkim Barão nasce em Cuiabá. Forma-se em Direito pelo Centro Universitário de Várzea Grande (Univag) e atua em direito administrativo e gestão pública.", W_CLA),
 E("2023", "carreira", "Trabalho assistencial em Várzea Grande",
   "É homenageada no prêmio Top Empresarial pelo trabalho assistencial com crianças de comunidades de Várzea Grande. Também presidiu a Comissão de Solidariedade e Assistência Social da OAB local.", W_CLA),
 E("2024", "carreira", "Voluntários para enchentes no RS",
   "Coordena voluntários que ajudaram vítimas das enchentes no Rio Grande do Sul.", W_CLA),
 E("2026", "cargo", "Preside o DC em Mato Grosso",
   "Assume a presidência do diretório estadual do Democracia Cristã (DC) em Mato Grosso (cargo partidário, não público).", W_CLA),
 E("2026-07-17", "alianca", "Joaquim Barbosa desiste pelo DC",
   "O ex-presidente do STF Joaquim Barbosa, que substituíra Aldo Rebelo como nome do DC, desiste da candidatura; o presidente do partido cita falta de estrutura.", WIKI_ELEICAO, pessoas=["joaquim-barbosa", "aldo-rebelo"]),
 E("2026-07-24", "eleicao", "DC lança Clariana ao Planalto",
   "O DC anuncia Clariana como candidata; ela diz querer ser 'a voz de milhares de mulheres'. É a primeira vez desde 1995 que o partido não lança José Maria Eymael.",
   "https://www.poder360.com.br/poder-eleicoes-2026/com-saida-de-barbosa-dc-lanca-clariana-ao-planalto/", pessoas=["jose-maria-eymael"]),
 E("2026-08", "eleicao", "Candidatura oficializada",
   "Convenção nacional do DC, em São Paulo, confirma a chapa com Fabiana Torquato como vice.", W_CLA, pessoas=["fabiana-torquato"]),
 E("2026-10-04", "eleicao", "9º lugar no 1º turno",
   "Em sua primeira eleição, recebe 40.043 votos (0,03%).",
   "https://www.otempo.com.br/eleicoes/2026/presidentes/2026/10/7/clariana-barao-candidata-derrotada-do-dc-a-presidente-declara-apoio-a-flavio-bolsonaro"),
 E("2026-10-07", "alianca", "Declara apoio a Flávio Bolsonaro",
   "Em vídeo ao lado de Valdemar Costa Neto (PL), diz que não havia alternativa para o DC além de apoiar Flávio Bolsonaro e cita a proteção a mulheres e crianças.",
   "https://www.otempo.com.br/eleicoes/2026/presidentes/2026/10/7/clariana-barao-candidata-derrotada-do-dc-a-presidente-declara-apoio-a-flavio-bolsonaro", pessoas=["flavio-bolsonaro", "valdemar-costa-neto"]),
], "resumo_juridico": NAO_HA.format(n="Clariana Barão")})

W_EDM = "https://pt.wikipedia.org/wiki/Edmilson_Costa"
ITA_EDM = "https://www.itatiaia.com.br/politica/eleicoes/conheca-a-carreira-politica-de-edmilson-costa-pre-candidato-a-presidencia/"
save({"id": "edmilson-costa", "nome": "Edmilson Costa", "eventos": [
 E("1950-04-08", "origem", "Nasce em Pedreiras (MA)",
   "Edmilson Silva Costa nasce em Pedreiras, Maranhão. Foi dirigente estudantil e diz ter sido perseguido na ditadura militar.", W_EDM),
 E("1970", "alianca", "Entra no PCB",
   "Filia-se ao Partido Comunista Brasileiro na década de 1970; nos anos 1980 escreve para a 'Voz da Unidade', jornal do partido.", W_EDM),
 E("1974", "carreira", "Forma-se em Comunicação",
   "Gradua-se em Comunicação Social pela UFMA e trabalha como jornalista.", W_EDM),
 E("1992", "carreira", "Doutor em Economia e reorganização do PCB",
   "Conclui doutorado em Economia na Unicamp, com tese sobre política salarial no Brasil (1964–1985). No mesmo ano, após o racha do partido, destaca-se na chamada 'Reconstrução Revolucionária' do PCB.", W_EDM),
 E("2008", "eleicao", "Candidato a prefeito de São Paulo",
   "Recebe 4.300 votos (0,07%) e não é eleito.", W_EDM),
 E("2010", "eleicao", "Vice na chapa de Ivan Pinheiro",
   "Candidato a vice-presidente com Ivan Pinheiro (PCB); a chapa recebe 39.136 votos (0,04%).", W_EDM, pessoas=["ivan-pinheiro"]),
 E("2016-10-17", "cargo", "Secretário-geral do PCB",
   "Sucede Ivan Pinheiro como secretário-geral (principal dirigente) do PCB, cargo que mantém.", W_EDM, pessoas=["ivan-pinheiro"]),
 E("2026-02", "eleicao", "PCB lança pré-candidatura",
   "O Comitê Central do PCB lança o nome de Edmilson à Presidência.", ITA_EDM),
 E("2026-08-01", "eleicao", "Convenção oficializa a chapa",
   "Na Câmara Municipal de São Paulo, o PCB confirma a candidatura, com a professora aposentada da UFRJ Cleusa Santos como vice. Propostas incluem estatizar o sistema financeiro e extinguir o Senado.",
   "https://www.opovo.com.br/noticias/politica/2026/08/01/amp/pcb-oficializa-candidatura-de-edmilson-costa-a-presidencia.html", pessoas=["cleusa-santos"]),
 E("2026-10-04", "eleicao", "10º lugar no 1º turno",
   "Recebe 22.693 votos (0,02%).", WIKI_ELEICAO),
 E("2026-10", "alianca", "Apoia Lula no 2º turno",
   "A Wikipédia registra o candidato entre os que apoiam Lula contra Flávio Bolsonaro no 2º turno; não localizei a data da nota oficial do PCB.", WIKI_ELEICAO, pessoas=["lula"]),
], "resumo_juridico": NAO_HA.format(n="Edmilson Costa")})

W_GRA = "https://pt.wikipedia.org/wiki/Wilson_Grassi"
save({"id": "wilson-grassi", "nome": "Wilson Grassi", "eventos": [
 E("1970-03-13", "origem", "Nasce em São Paulo",
   "Wilson Grassi Junior nasce em São Paulo. Começa como office-boy, cursa Medicina Veterinária e abre clínica na zona leste, com programas de castração de cães e gatos.", W_GRA),
 E("2006", "eleicao", "Candidato a deputado estadual",
   "Pelo PFL, recebe 4.517 votos e não é eleito.", W_GRA),
 E("2012", "carreira", "Hospital público para cães e gatos",
   "Participa das discussões sobre o hospital público veterinário do Tatuapé, em São Paulo; foi conselheiro da Anclivepa-SP, associação de clínicos veterinários.", W_GRA),
 E("2024", "eleicao", "Candidato a vereador em São Paulo",
   "Pelo PRTB, recebe 2.777 votos e não é eleito.", W_GRA),
 E("2025-12", "alianca", "Partido muda de nome para Democrata",
   "A Justiça Eleitoral aprova a troca de nome do Partido da Mulher Brasileira (PMB) para Democrata, legenda pela qual ele disputa a Presidência.", WIKI_ELEICAO),
 E("2026-08-02", "eleicao", "Candidatura oficializada no Rio",
   "Convenção do Democrata confirma a chapa com Suêd Haidar, fundadora e presidente do partido, como vice.", W_GRA, pessoas=["sued-haidar"]),
 E("2026-08-29", "declaracao", "Propõe 'Meu Botox, Minha Vida'",
   "Em entrevista, propõe aplicação gratuita de toxina botulínica para mulheres de baixa renda, financiada por imposto sobre cosméticos e corte no financiamento de campanhas; diz que a ideia não está no programa porque o partido não permitiria.",
   "https://www.poder360.com.br/poder-eleicoes-2026/candidato-ao-planalto-quer-criar-meu-botox-minha-vida/"),
 E("2026-08-30", "decisao", "TSE suspende campanha digital",
   "O ministro Dias Toffoli suspende, por cautela, a propaganda em oito perfis declarados ao TSE 17 dias após o registro, além de repasses do Fundo Eleitoral e participação em debates.",
   "https://www.cnnbrasil.com.br/eleicoes/toffoli-suspende-campanha-de-wilson-grassi/",
   status="Medida cautelar; restrições vigoraram de 31/08 a 03/09/2026 e depois foram retiradas", pessoas=["dias-toffoli"]),
 E("2026-09-03", "decisao", "Restrições são retiradas",
   "As limitações à campanha digital, ao Fundo Eleitoral e a entrevistas e debates deixam de valer.", WIKI_ELEICAO,
   status="Medida cautelar encerrada; não localizei registro de descumprimento"),
 E("2026-10-04", "eleicao", "11º lugar no 1º turno",
   "Recebe 16.881 votos (0,01%). No 2º turno, fica neutro, segundo a Wikipédia.", WIKI_ELEICAO),
], "resumo_juridico": "Não há processos criminais ou de improbidade conhecidos contra Wilson Grassi. O único caso judicial localizado é eleitoral: em 30/08/2026, o ministro Dias Toffoli (TSE) suspendeu por cautela parte da campanha (perfis declarados com atraso, Fundo Eleitoral e debates); as restrições valeram de 31/08 a 03/09/2026 e foram retiradas. Não localizei registro de descumprimento. Nunca exerceu mandato eletivo nem cargo de governo."})

W_RUI = "https://pt.wikipedia.org/wiki/Rui_Costa_Pimenta"
save({"id": "rui-costa-pimenta", "nome": "Rui Costa Pimenta", "eventos": [
 E("1957-06-25", "origem", "Nasce em São Paulo",
   "Rui Costa Pimenta nasce em São Paulo. Forma-se pela Faculdade Cásper Líbero e começa a militar em 1976, durante a ditadura.", W_RUI),
 E("1980", "alianca", "Ajuda a fundar o PT",
   "Participa da fundação do PT e da tendência trotskista Causa Operária, dentro do partido.", W_RUI),
 E("1985", "cargo", "Diretor da CUT",
   "É eleito diretor da Central Única dos Trabalhadores na Grande São Paulo.", W_RUI),
 E("1992", "ruptura", "Causa Operária rompe com o PT",
   "Os militantes da Causa Operária anunciam a ruptura com o PT.", W_RUI),
 E("1995-12-07", "cargo", "Funda e preside o PCO",
   "Lança o Partido da Causa Operária (PCO) e torna-se seu presidente nacional; o registro definitivo vem em 1996.", W_RUI),
 E("2002", "eleicao", "Candidato a presidente",
   "Recebe 38.619 votos (0,05%).", W_RUI),
 E("2006", "decisao", "TSE barra candidatura",
   "O TSE indefere o registro da candidatura presidencial alegando erro na prestação de contas da campanha de 2002; o PCO protesta.", W_RUI,
   status="Registro indeferido em 2006 (questão de prestação de contas do partido/campanha)"),
 E("2014", "eleicao", "Volta a disputar a Presidência",
   "Recebe 12.324 votos (0,01%); em 2010, recebera 12.206. Em 2018 e 2022, o PCO apoia Lula.", W_RUI, pessoas=["lula"]),
 E("2022-06-02", "investigacao", "Moraes manda bloquear perfis do PCO",
   "No inquérito das fake news, Alexandre de Moraes abre investigação contra o PCO após publicação que o chamou de 'skinhead de toga' e pediu a dissolução do STF; manda bloquear os perfis do partido e ouvir Rui na PF em cinco dias, citando 'relevantes indícios' de uso ilícito de dinheiro público. O PCO reage com críticas ao STF e acusa censura.",
   "https://www.poder360.com.br/justica/moraes-manda-bloquear-perfis-do-pco-nas-redes-sociais/",
   status="Inquérito contra o partido aberto em 2022; não localizei denúncia, arquivamento ou desfecho", pessoas=["alexandre-de-moraes"]),
 E("2024-03", "declaracao", "Encontro com líder do Hamas",
   "Encontra-se no Catar com Ismail Haniyeh, então líder político do Hamas.", W_RUI),
 E("2026-10-04", "eleicao", "12º lugar no 1º turno",
   "Recebe 15.024 votos (0,01%), na disputa oficializada em 01/08/2026 com Antônio Carlos Silva como vice.", WIKI_ELEICAO, pessoas=["antonio-carlos-silva"]),
 E("2026-10-12", "ruptura", "PCO orienta voto nulo",
   "Depois de apoiar Lula em 2018 e 2022, orienta voto nulo: 'O PT não é alternativa em nenhum sentido'; diz que Flávio Bolsonaro expressa 'tendências reacionárias'.",
   "https://metropoles.com/brasil/pco-orienta-voto-nulo-para-2o-turno-entre-lula-e-flavio", pessoas=["lula", "flavio-bolsonaro"]),
], "resumo_juridico": "Rui Costa Pimenta não tem condenação conhecida e não é réu em ação penal conhecida. Em 02/06/2022, Alexandre de Moraes abriu investigação contra o PCO no inquérito das fake news, mandou bloquear os perfis do partido e determinou que Rui depusesse à PF, mencionando indícios de uso ilícito de dinheiro público; não localizei denúncia, arquivamento ou outro desfecho. O PCO classificou a medida como censura. Em 2006, o TSE indeferiu seu registro de candidatura por problema na prestação de contas da campanha de 2002 (decisão eleitoral, não criminal). Nunca exerceu mandato eletivo nem cargo de governo."})
