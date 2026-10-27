(function () {
  "use strict";
  var D = null, Q = [], answers = {}, imp = {}, cur = 0, busy = false;
  var SHARE_BASE = /foradareta\.com\.br$|github\.io$/.test(location.hostname) ? location.origin + location.pathname : "https://foradareta.com.br/";
  var VIEWS = ["inicio", "votacoes", "politicos", "promessas", "noticias", "espectro", "apuracao", "congresso", "poder", "fenomenos", "glossario", "teste", "resultado", "candidatos", "partidos", "conceitos", "estudo", "checagem", "eleicoes", "metodo"];
  // menu enxuto: 5 abas; cada aba agrupa suas páginas num submenu
  var GROUPS = {
    inicio: { views: ["inicio"] },
    votacoes: { views: ["votacoes"] },
    politicos: { views: ["politicos", "promessas", "congresso", "poder"], sub: [["politicos", "Seus representantes"], ["promessas", "Promessas"], ["poder", "Conexões de poder"]] },
    noticias: { views: ["noticias"] },
    aprenda: { views: ["espectro", "teste", "resultado", "conceitos", "glossario", "partidos", "fenomenos", "estudo", "checagem", "eleicoes", "apuracao", "candidatos", "metodo"], sub: [["teste", "Teste"], ["espectro", "O espectro"], ["conceitos", "Conceitos"], ["glossario", "Glossário"], ["partidos", "Partidos"], ["fenomenos", "Fenômenos"], ["checagem", "Checagem"], ["eleicoes", "Eleições 2026"]] }
  };
  function groupOf(v) { for (var g in GROUPS) if (GROUPS[g].views.indexOf(v) >= 0) return g; return "inicio"; }
  var CONF_W = { alta: 1, media: 0.75, "média": 0.75, baixa: 0.5 };
  var LIKERT = { "-2": "Discorda totalmente", "-1": "Discorda", "0": "Neutro", "1": "Concorda", "2": "Concorda totalmente" };
  var LIKERT_EU = { "-2": "Discordo totalmente", "-1": "Discordo", "0": "Neutro", "1": "Concordo", "2": "Concordo totalmente" };
  var AXIS = {
    x: { nome: "Economia", neg: "Esquerda", pos: "Direita", negL: "esquerda", posL: "direita" },
    y: { nome: "Costumes", neg: "Progressista", pos: "Tradicionalista", negL: "progressista", posL: "tradicionalista" },
    z: { nome: "Instituições", neg: "Ruptura", pos: "Institucional", negL: "ruptura", posL: "institucional" },
    a: { nome: "Só afinidade" }
  };
  var QUAD = {
    xy: ["Esquerda tradicionalista", "Direita tradicionalista", "Esquerda progressista", "Direita progressista"],
    xz: ["Esquerda institucional", "Direita institucional", "Esquerda de ruptura", "Direita de ruptura"],
    yz: ["Progressismo institucional", "Conservadorismo clássico", "Progressismo de ruptura", "Tradicionalismo antissistema"]
  };
  // posição típica de cada tradição (x economia, y costumes, z instituições), derivada das definições na página Conceitos
  var TRADS = [
    { n: "Conservadorismo clássico", x: 3, y: 5, z: 8, d: "Valoriza a tradição e as instituições que resistiram ao tempo. Prefere reformas graduais a rupturas e desconfia de líderes que prometem refazer a sociedade de uma vez.", a: "Burke, Oakeshott, Scruton, Kirk" },
    { n: "Democracia cristã", x: 0, y: 4, z: 7, d: "Economia de mercado com proteção social, família no centro da vida em sociedade e compromisso com as instituições democráticas.", a: "Jacques Maritain; encíclica Rerum Novarum (1891)" },
    { n: "Liberalismo clássico", x: 7, y: -1, z: 6, d: "Liberdade individual, propriedade, mercado e governo limitado pela lei. O Estado garante regras e direitos, sem dirigir a economia.", a: "Locke, Adam Smith, Hayek" },
    { n: "Libertarianismo", x: 9, y: -6, z: 2, d: "Estado mínimo tanto na economia quanto nas escolhas pessoais. Desconfia do poder estatal em geral.", a: "Robert Nozick, Murray Rothbard" },
    { n: "Liberalismo social", x: -1, y: -4, z: 7, d: "Liberdades individuais com igualdade de oportunidades garantida pelo Estado. Mercado regulado e rede de proteção.", a: "John Stuart Mill, John Rawls" },
    { n: "Social-democracia", x: -4, y: -3, z: 7, d: "Mercado com Estado de bem-estar forte, impostos progressivos e negociação entre sindicatos e empresas, por vias democráticas e graduais.", a: "Eduard Bernstein; Anthony Giddens" },
    { n: "Socialismo democrático", x: -7, y: -5, z: 5, d: "Quer reduzir muito o papel do mercado e ampliar a propriedade coletiva, mas pelo voto e dentro das instituições.", a: "Tradição dos partidos socialistas democráticos" },
    { n: "Esquerda trabalhista e comunitária", x: -5, y: 3, z: 3, d: "Direitos trabalhistas, Estado forte e proteção social, combinados com valores tradicionais de família e religião.", a: "Doutrina social da Igreja; trabalhismo brasileiro" },
    { n: "Marxismo revolucionário", x: -9, y: -3, z: -6, d: "Vê o Estado atual como instrumento de uma classe e defende superá-lo por revolução, com os trabalhadores no poder.", a: "Marx e Engels; Lenin" },
    { n: "Populismo de esquerda", x: -6, y: 0, z: -4, d: "Divide a sociedade entre povo e elite, concentra poder em um líder e enfraquece freios institucionais em nome da redistribuição.", a: "Mudde e Rovira Kaltwasser; Laclau" },
    { n: "Direita radical populista", x: 3, y: 8, z: -5, d: "Combina nacionalismo, ênfase em ordem e autoridade e o discurso do povo contra as elites. Tende a confrontar tribunais, imprensa e instituições independentes.", a: "Cas Mudde; Levitsky e Ziblatt" }
  ];
  var compView = "xy", affMode = "real", curView = "inicio", HOT = {};
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : null; }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return "fonte"; } }
  function link(u, label) { var s = safeUrl(u); return s ? '<a href="' + esc(s) + '" target="_blank" rel="noopener">' + esc(label || host(s)) + "</a>" : ""; }
  function fmt(n) { return (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(1).replace(".", ","); }
  function pctBR(n) { return String(n).replace(".", ",") + "%"; }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k) { try { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }
  function segSet(group, attr, val) { group.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset[attr] === val)); }); }

  /* ---------------- hero ---------------- */
  (function heroPeople() {
    var g = $("heroPeople"), out = [], seed = 7;
    function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    for (var i = 0; i < 36; i++) {
      var qx = i % 2, qy = Math.floor(i / 2) % 2;
      var x = 80 + qx * 300 + rnd() * 260, y = 40 + qy * 190 + rnd() * 150;
      var r = 4 + rnd() * 3.5;
      out.push('<circle class="p" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + (i === 21 ? "var(--you)" : "var(--dot)") + '" style="--dy:' + (210 - y).toFixed(1) + "px;--i:" + i + '"' + (i === 21 ? "" : ' opacity=".85"') + "/>");
    }
    g.innerHTML = out.join("");
  })();
  $("learnLink").addEventListener("click", function (ev) { ev.preventDefault(); $("entenda").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); });

  /* ---------------- demo reta x plano ---------------- */
  var PEOPLE = [
    { k: "A", n: "Ana", x: -5.5, y: 6, t: "Defende o SUS e o Bolsa Família. É evangélica e contra o aborto." },
    { k: "B", n: "Bruno", x: -5.5, y: -6, t: "Também defende o SUS e o Bolsa Família. Apoia descriminalizar a maconha." },
    { k: "C", n: "Carla", x: 6, y: 6.5, t: "Quer privatizar estatais. Defende o acesso a armas e a família tradicional." },
    { k: "D", n: "Diego", x: 6, y: -5.5, t: "Também quer privatizar. Apoia o casamento igualitário e o fim da guerra às drogas." },
    { k: "E", n: "Elisa", x: 0.5, y: 0.5, t: "Fica no meio em quase tudo." },
    { k: "F", n: "Fábio", x: -2, y: 4, t: "Quer o fim da escala 6x1 e a redução da maioridade penal." }
  ];
  function drawDemo() {
    var W = 400, H = 300, P = 20, h = [];
    function X(x) { return P + (x + 10) / 20 * (W - 2 * P); }
    function Y(y) { return P + (10 - y) / 20 * (H - 2 * P); }
    h.push('<g class="quad"><rect x="' + P + '" y="' + P + '" width="' + (W / 2 - P) + '" height="' + (H / 2 - P) + '" rx="16" fill="var(--q-tl)"/><rect x="' + W / 2 + '" y="' + P + '" width="' + (W / 2 - P) + '" height="' + (H / 2 - P) + '" rx="16" fill="var(--q-tr)"/><rect x="' + P + '" y="' + H / 2 + '" width="' + (W / 2 - P) + '" height="' + (H / 2 - P) + '" rx="16" fill="var(--q-bl)"/><rect x="' + W / 2 + '" y="' + H / 2 + '" width="' + (W / 2 - P) + '" height="' + (H / 2 - P) + '" rx="16" fill="var(--q-br)"/></g>');
    h.push('<line class="vline" x1="' + W / 2 + '" y1="' + P + '" x2="' + W / 2 + '" y2="' + (H - P) + '" stroke="var(--muted)" stroke-dasharray="3 5"/>');
    h.push('<line x1="4" y1="' + H / 2 + '" x2="' + (W - 4) + '" y2="' + H / 2 + '" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>');
    h.push('<text x="' + (P + 2) + '" y="' + (H / 2 + 18) + '" font-size="11" font-weight="600" fill="var(--muted)">Esquerda</text><text x="' + (W - P - 2) + '" y="' + (H / 2 + 18) + '" text-anchor="end" font-size="11" font-weight="600" fill="var(--muted)">Direita</text>');
    h.push('<g class="ylab" font-size="11" font-weight="600" fill="var(--muted)"><text x="' + W / 2 + '" y="13" text-anchor="middle">Tradicionalista</text><text x="' + W / 2 + '" y="' + (H - 4) + '" text-anchor="middle">Progressista</text></g>');
    PEOPLE.forEach(function (p) {
      h.push('<g class="person" data-dy="' + (H / 2 - Y(p.y)).toFixed(1) + '"><circle cx="' + X(p.x) + '" cy="' + Y(p.y) + '" r="13" fill="var(--dot)"/><text x="' + X(p.x) + '" y="' + (Y(p.y) + 4.5) + '" text-anchor="middle" font-size="12" font-weight="700" fill="var(--bg)">' + p.k + "</text></g>");
    });
    $("demoArt").innerHTML = h.join("");
    $("peopleList").innerHTML = PEOPLE.map(function (p) { return '<div><span class="av">' + p.k + "</span><span><b>" + p.n + "</b>" + esc(p.t) + "</span></div>"; }).join("");
  }
  function setDemo(flat) {
    $("demoArt").classList.toggle("flat", flat);
    $("segLine").setAttribute("aria-pressed", String(flat));
    $("segPlane").setAttribute("aria-pressed", String(!flat));
    document.querySelectorAll("#demoArt .person").forEach(function (g) { g.style.transform = flat ? "translateY(" + g.dataset.dy + "px)" : "translateY(0px)"; });
    $("demoCaption").textContent = flat
      ? "Na reta, Ana e Bruno ocupam o mesmo ponto. Carla e Diego também. Parecem aliados."
      : "No plano, Ana e Bruno discordam em quase tudo sobre costumes. Carla e Diego também. Fábio, que parecia de centro-esquerda, é bem tradicionalista.";
  }
  drawDemo(); setDemo(false);
  $("segLine").addEventListener("click", function () { setDemo(true); });
  $("segPlane").addEventListener("click", function () { setDemo(false); });

  /* ---------------- pontuação ---------------- */
  function axisScore(ans, eixo, tema) {
    var s = 0, n = 0;
    D.perguntas.forEach(function (q) {
      if (q.eixo !== eixo || (tema && q.tema !== tema)) return;
      var a = ans[q.id]; if (a == null) return;
      s += a * q.dir; n += 2;
    });
    return n ? { v: (s / n) * 10, n: n / 2 } : { v: 0, n: 0 };
  }
  function pos(c, k) { return (c.posicoes || {})[k] || {}; }
  // "disc" = o que diz; "prat" = só o que fez; "real" = o que fez quando houver, senão o que diz
  function ansOf(c, mode) {
    var o = {};
    D.perguntas.forEach(function (q) {
      var p = pos(c, q.id);
      var v = mode === "disc" ? p.v : mode === "prat" ? p.p : (p.p != null ? p.p : p.v);
      if (v != null) o[q.id] = v;
    });
    return o;
  }
  function coords(c, mode) {
    c._c = c._c || {};
    if (!c._c[mode]) { var a = ansOf(c, mode); c._c[mode] = { x: axisScore(a, "x"), y: axisScore(a, "y"), z: axisScore(a, "z") }; }
    return c._c[mode];
  }
  function okAxes(k, axes) { return axes.every(function (ax) { return k[ax].n >= 3; }); }
  function axesOf(view) { return [view.charAt(0), view.charAt(1)]; }
  function gapOf(c) {
    var d = coords(c, "disc"), p = coords(c, "prat");
    if (!okAxes(p, ["x", "y"]) || !okAxes(d, ["x", "y"])) return null;
    return Math.sqrt(Math.pow(d.x.v - p.x.v, 2) + Math.pow(d.y.v - p.y.v, 2) + (p.z.n >= 3 && d.z.n >= 3 ? Math.pow(d.z.v - p.z.v, 2) : 0));
  }
  function nPrat(c) { var n = 0; D.perguntas.forEach(function (q) { if (pos(c, q.id).p != null) n++; }); return n; }
  function nDisc(c) { var n = 0; D.perguntas.forEach(function (q) { if (pos(c, q.id).v != null) n++; }); return n; }
  function coordText(k) {
    return ["x", "y", "z"].map(function (ax) { return k[ax].n >= 3 ? AXIS[ax].nome.toLowerCase() + " " + fmt(k[ax].v) : null; }).filter(Boolean).join(" · ") || "poucos dados";
  }
  function affinity(c, mode) {
    mode = mode || affMode;
    var sw = 0, sa = 0, rows = [];
    D.perguntas.forEach(function (q) {
      var u = answers[q.id], p = pos(c, q.id);
      if (u == null) return;
      var v, w;
      if (mode === "disc") { v = p.v; w = CONF_W[p.conf] || 0.6; }
      else if (p.p != null) { v = p.p; w = CONF_W[p.conf_p] || 0.75; }
      else { v = p.v; w = (CONF_W[p.conf] || 0.6) * 0.7; }
      if (v == null) return;
      // o que a pessoa marcou como importante pesa o dobro
      if (imp[q.id]) w *= 2;
      var ag = 1 - Math.abs(u - v) / 4;
      sw += w; sa += w * ag;
      rows.push({ q: q, u: u, c: v, diff: Math.abs(u - v), strength: Math.abs(u) + Math.abs(v), fromP: mode !== "disc" && p.p != null });
    });
    return { pct: sw ? (sa / sw) * 100 : null, n: rows.length, rows: rows };
  }
  function econLabel(x) { var ax = Math.abs(x); return ax < 1.5 ? "Centro" : ax < 4 ? "Centro-" + (x < 0 ? "esquerda" : "direita") : ax < 7 ? (x < 0 ? "Esquerda" : "Direita") : (x < 0 ? "Esquerda acentuada" : "Direita acentuada"); }
  function label(x, y) {
    var ax = Math.abs(x), ay = Math.abs(y);
    if (ax < 1.5 && ay < 1.5) return "Centro";
    var val = ay < 1.5 ? "moderado nos costumes" : ay < 5 ? (y < 0 ? "mais progressista" : "mais tradicionalista") : (y < 0 ? "muito progressista" : "muito tradicionalista");
    return econLabel(x) + " " + val;
  }
  function zLabel(z, n) {
    if (!n) return "";
    return z >= 5 ? "Nas instituições: fortemente institucionalista" : z >= 1.5 ? "Nas instituições: institucionalista" : z > -1.5 ? "Nas instituições: ambivalente" : z > -5 ? "Nas instituições: inclinado à ruptura" : "Nas instituições: fortemente inclinado à ruptura";
  }
  function verdictSub(x, y, z) {
    var t;
    if (Math.abs(x) < 1.5 && Math.abs(y) < 1.5) t = "Você ficou perto do centro em economia e costumes. Pode ser moderação ou posições fortes que se compensam. Os números abaixo mostram qual dos dois.";
    else t = "Na economia, suas respostas " + (Math.abs(x) < 1.5 ? "ficam perto do centro" : "puxam para a " + (x < 0 ? "esquerda" : "direita")) +
      ". Nos costumes, " + (Math.abs(y) < 1.5 ? "ficam perto do centro" : "puxam para o lado " + (y < 0 ? "progressista" : "tradicionalista")) + ".";
    if (y >= 1.5 && z >= 3) t += " A combinação de tradição com respeito às instituições é a marca do conservadorismo clássico.";
    else if (y >= 1.5 && z < 0) t += " Você valoriza a tradição, mas aceita romper regras institucionais, o que o afasta do conservadorismo clássico.";
    else if (x <= -4 && z < 0) t += " Você combina esquerda econômica com abertura à ruptura institucional.";
    return t;
  }
  function nAnswered() { return Object.keys(answers).length; }
  function shortName(c) { return (c.nome_urna || c.sigla || "").replace(/^Escritor\s+/i, ""); }

  /* ---------------- navegação ---------------- */
  function show(view, keepScroll) {
    if (VIEWS.indexOf(view) < 0) view = "inicio";
    VIEWS.forEach(function (v) { var el = $("v-" + v); var on = v === view; if (on && el.hidden) { el.hidden = false; el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; } else el.hidden = !on; });
    var grp = groupOf(view), G = GROUPS[grp];
    document.querySelectorAll("nav.tabs a").forEach(function (a) { a.setAttribute("aria-current", a.dataset.group === grp ? "page" : "false"); });
    $("subbar").hidden = !G.sub;
    if (G.sub) {
      var subCur = view === "resultado" ? "teste" : (view === "apuracao" || view === "candidatos") ? "eleicoes" : view === "estudo" ? "espectro" : view === "congresso" ? "politicos" : view;
      $("subnav").innerHTML = G.sub.map(function (it) { return '<a href="#' + it[0] + '" data-go="' + it[0] + '" aria-current="' + (it[0] === subCur ? "page" : "false") + '">' + it[1] + "</a>"; }).join("");
    }
    if (view === "resultado") renderResult();
    if (view === "teste") renderQ();
    if (view === "candidatos") renderCandGrid();
    if (view === "partidos") renderParties();
    if (view === "espectro") drawGapChart();
    if (ACP && ACP[view]) ACP[view]();
    if (view === "apuracao") { AP.init(HOT); AP.render(); }
    if (view === "noticias") NW.show();
    if (view === "congresso") renderCongresso();
    if (view === "poder") renderPoder();
    if (view === "fenomenos") renderFenomenos();
    if (view === "glossario") renderGlossario();
    curView = view;
    GC.view(view);
    if (!keepScroll) window.scrollTo(0, 0);
    try { history.replaceState(null, "", "#" + view); } catch (e) {}
  }
  document.addEventListener("click", function (ev) { var el = ev.target.closest("[data-go]"); if (!el) return; ev.preventDefault(); closeSheet(); show(el.dataset.go); });

  /* ---------------- teste ---------------- */
  function orderQuestions() {
    var g = { x: [], y: [], z: [], a: [] }, out = [];
    D.perguntas.forEach(function (q) { (g[q.eixo] || g.a).push(q); });
    var lists = [g.x, g.y, g.z, g.a], i = 0;
    while (lists.some(function (l) { return l.length; })) { var l = lists[i % 4]; if (l.length) out.push(l.shift()); i++; }
    return out;
  }
  function updateMini() {
    var n = nAnswered();
    var x = n ? axisScore(answers, "x").v : 0, y = n ? axisScore(answers, "y").v : 0;
    $("miniYou").style.transform = "translate(" + (100 + x * 9.2).toFixed(1) + "px," + (100 - y * 9.2).toFixed(1) + "px)";
    $("miniTxt").textContent = n ? "Até agora: " + label(x, y).toLowerCase() + "." : "Seu ponto se move a cada resposta.";
  }
  function renderQ(dir) {
    if (!Q.length) return;
    var q = Q[cur], a = answers[q.id];
    var left = Q.length - nAnswered();
    $("qCounter").textContent = (cur + 1) + " de " + Q.length + (left > 0 ? " · cerca de " + Math.max(1, Math.round(left * 9 / 60)) + " min" : "");
    $("qAnswered").textContent = nAnswered() + " respondidas";
    $("qBar").style.width = (nAnswered() / Q.length * 100) + "%";
    $("qTema").textContent = q.tema;
    $("qAxis").textContent = AXIS[q.eixo] ? AXIS[q.eixo].nome : "";
    $("qText").textContent = q.texto;
    $("argFavor").textContent = q.favor || "";
    $("argContra").textContent = q.contra || "";
    $("qArgs").hidden = !(q.favor || q.contra);
    $("qExp").hidden = !q.explica; $("qExpTxt").textContent = q.explica || "";
    $("qExp").open = !!load("fdr.explica");
    $("qArgs").open = false;
    $("chosen").textContent = a == null ? "" : "Sua resposta: " + LIKERT_EU[a].toLowerCase();
    $("impBtn").setAttribute("aria-pressed", String(!!imp[q.id]));
    document.querySelectorAll("#answers button").forEach(function (b) { b.setAttribute("aria-pressed", String(a === Number(b.dataset.v))); });
    $("prevBtn").disabled = cur === 0;
    $("finishBtn").disabled = nAnswered() < 5;
    $("finishBtn").textContent = nAnswered() >= Q.length ? "Ver resultado" : "Ver resultado · " + nAnswered() + "/" + Q.length;
    updateMini();
    if (dir) { var st = $("qStage"); st.classList.remove("out", "in", "inBack"); void st.offsetWidth; st.classList.add(dir < 0 ? "inBack" : "in"); }
  }
  function go(to) {
    if (to < 0 || to >= Q.length || busy) return;
    var dir = to > cur ? 1 : -1;
    if (reduce) { cur = to; renderQ(); return; }
    busy = true;
    var st = $("qStage"); st.classList.remove("in", "inBack"); st.classList.add("out");
    setTimeout(function () { cur = to; busy = false; renderQ(dir); }, 200);
  }
  function answer(v, btn) {
    if (busy) return;
    var q = Q[cur];
    if (v === null) delete answers[q.id]; else answers[q.id] = v;
    store("fdr.answers", answers);
    document.querySelectorAll("#answers button").forEach(function (b) { b.setAttribute("aria-pressed", String(v === Number(b.dataset.v))); });
    if (btn) { btn.classList.remove("tap"); void btn.offsetWidth; btn.classList.add("tap"); }
    updateMini();
    $("qBar").style.width = (nAnswered() / Q.length * 100) + "%";
    setTimeout(function () { if (cur < Q.length - 1) go(cur + 1); else show("resultado"); }, reduce ? 0 : 260);
  }
  $("qExp").addEventListener("toggle", function () { store("fdr.explica", $("qExp").open); });
  $("answers").addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (b) answer(Number(b.dataset.v), b); });
  $("skipBtn").addEventListener("click", function () { answer(null); });
  $("prevBtn").addEventListener("click", function () { go(cur - 1); });
  $("finishBtn").addEventListener("click", function () { show("resultado"); });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeSheet();
    if ($("v-teste").hidden || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.target && /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
    if (/^[1-5]$/.test(ev.key)) { ev.preventDefault(); answer(Number(ev.key) - 3, document.querySelector('#answers [data-v="' + (Number(ev.key) - 3) + '"]')); }
    else if (ev.key === "0") { ev.preventDefault(); answer(null); }
    else if (ev.key === "ArrowLeft") go(cur - 1);
    else if (ev.key === "ArrowRight") go(cur + 1);
  });

  /* ---------------- compartilhar ---------------- */
  // link de resultado: "s" + um caractere por pergunta (0 = sem resposta, 1-5 = resposta, a-e = resposta marcada como importante).
  // Links antigos ("r", 45 perguntas) continuam abrindo.
  var LEGACY_R = ["E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "E10", "E11", "E12", "E13", "E14", "E15", "E16", "E17", "E18", "V01", "V02", "V03", "V04", "V05", "V06", "V07", "V08", "V09", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18", "V19", "Z01", "Z02", "Z03", "Z04", "Z05", "Z06", "Z07", "Z08"];
  function encode() { return "s" + D.perguntas.map(function (q) { var a = answers[q.id]; return a == null ? "0" : imp[q.id] ? "abcde".charAt(a + 2) : String(a + 3); }).join(""); }
  function decode(code) {
    var o = {}, im = {}, ids;
    if (/^r[0-5]+$/.test(code) && code.length === LEGACY_R.length + 1) ids = LEGACY_R;
    else if (/^s[0-5a-e]+$/.test(code) && code.length === D.perguntas.length + 1) ids = D.perguntas.map(function (q) { return q.id; });
    else return null;
    ids.forEach(function (id, i) {
      var ch = code.charAt(i + 1), k = "abcde".indexOf(ch);
      if (k >= 0) { o[id] = k - 2; im[id] = 1; } else if (Number(ch)) o[id] = Number(ch) - 3;
    });
    decode.imp = im;
    return o;
  }
  $("shareBtn").addEventListener("click", function () {
    var url = (SHARE_BASE || location.href.split("#")[0]) + "#" + encode(), f = $("shareField");
    function fallback() { f.hidden = false; f.value = url; f.focus(); f.select(); toast("Copie o link no campo abaixo"); }
    try { navigator.clipboard.writeText(url).then(function () { toast("Link copiado"); }, fallback); } catch (e) { fallback(); }
  });
  $("impBtn").addEventListener("click", function () {
    var q = Q[cur]; if (!q) return;
    if (imp[q.id]) delete imp[q.id]; else imp[q.id] = 1;
    store("fdr.peso", imp); $("impBtn").setAttribute("aria-pressed", String(!!imp[q.id]));
  });
  $("resetBtn").addEventListener("click", function () { answers = {}; imp = {}; store("fdr.peso", imp); cur = 0; store("fdr.answers", answers); show("teste"); });

  /* ---------------- gráficos ---------------- */
  var S = 560, PAD = 30, PL = S - 2 * PAD;
  // valores extremos (±10) ficam um pouco para dentro da borda, para não cobrir os nomes dos eixos
  function clampV(v) { return Math.max(-9.3, Math.min(9.3, v)); }
  function px(v) { return PAD + (clampV(v) + 10) / 20 * PL; }
  function py(v) { return PAD + (10 - clampV(v)) / 20 * PL; }
  function frame(view) {
    var h = [], m = PAD + PL / 2, half = PL / 2, r = 20, ax = axesOf(view), A = AXIS[ax[0]], B = AXIS[ax[1]], ql = QUAD[view];
    h.push('<rect x="' + PAD + '" y="' + PAD + '" width="' + half + '" height="' + half + '" rx="' + r + '" fill="var(--q-tl)"/>');
    h.push('<rect x="' + m + '" y="' + PAD + '" width="' + half + '" height="' + half + '" rx="' + r + '" fill="var(--q-tr)"/>');
    h.push('<rect x="' + PAD + '" y="' + m + '" width="' + half + '" height="' + half + '" rx="' + r + '" fill="var(--q-bl)"/>');
    h.push('<rect x="' + m + '" y="' + m + '" width="' + half + '" height="' + half + '" rx="' + r + '" fill="var(--q-br)"/>');
    [-5, 5].forEach(function (t) {
      h.push('<line x1="' + px(t) + '" y1="' + (PAD + 8) + '" x2="' + px(t) + '" y2="' + (S - PAD - 8) + '" stroke="var(--bg)" stroke-width="1.5" opacity=".7"/>');
      h.push('<line x1="' + (PAD + 8) + '" y1="' + py(t) + '" x2="' + (S - PAD - 8) + '" y2="' + py(t) + '" stroke="var(--bg)" stroke-width="1.5" opacity=".7"/>');
    });
    h.push('<line x1="' + (PAD - 10) + '" y1="' + m + '" x2="' + (S - PAD + 10) + '" y2="' + m + '" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>');
    h.push('<line x1="' + m + '" y1="' + PAD + '" x2="' + m + '" y2="' + (S - PAD) + '" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="4 6"/>');
    h.push('<text x="' + m + '" y="18" text-anchor="middle" font-size="13" font-weight="600">' + B.pos + "</text>");
    h.push('<text x="' + m + '" y="' + (S - 6) + '" text-anchor="middle" font-size="13" font-weight="600">' + B.neg + "</text>");
    h.push('<text x="' + (PAD + 10) + '" y="' + (m - 9) + '" font-size="13" font-weight="600">' + A.neg + "</text>");
    h.push('<text x="' + (S - PAD - 10) + '" y="' + (m - 9) + '" text-anchor="end" font-size="13" font-weight="600">' + A.pos + "</text>");
    [[ql[0], PAD + 12, PAD + 22, "start"], [ql[1], S - PAD - 12, PAD + 22, "end"], [ql[2], PAD + 12, S - PAD - 12, "start"], [ql[3], S - PAD - 12, S - PAD - 12, "end"]].forEach(function (l) {
      h.push('<text x="' + l[1] + '" y="' + l[2] + '" text-anchor="' + l[3] + '" font-size="10.5" opacity=".75">' + l[0] + "</text>");
    });
    return h;
  }
  // rótulos sem sobreposição: primeiro bem junto do ponto; se não couber, um pouco mais longe com uma linha ligando
  // o nome ao ponto. Nome de candidato nunca some; nome de partido pode ficar de fora se não houver espaço.
  function placer() {
    var placed = [];
    function free(box) {
      if (box[0] < 2 || box[2] > S - 2 || box[1] < 2 || box[3] > S - 2) return false;
      return !placed.some(function (b) { return !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]); });
    }
    function boxOf(o, w) { var x0 = o[2] === "start" ? o[0] : o[2] === "end" ? o[0] - w : o[0] - w / 2; return [x0 - 2, o[1] - 11, x0 + w + 2, o[1] + 3]; }
    return {
      block: function (X, Y, r) { placed.push([X - r, Y - r, X + r, Y + r]); },
      rect: function (x0, y0, x1, y1) { placed.push([x0, y0, x1, y1]); },
      place: function (X, Y, w, opt) {
        opt = opt || {};
        var opts = [[X + 9, Y + 4, "start"], [X - 9, Y + 4, "end"], [X, Y - 11, "middle"], [X, Y + 19, "middle"], [X + 7, Y - 8, "start"], [X - 7, Y - 8, "end"], [X + 7, Y + 16, "start"], [X - 7, Y + 16, "end"]];
        if (opt.lead) [24, 36, 50, 66].forEach(function (d) {
          [[1, 0], [-1, 0], [0, -1], [0, 1], [0.7, -0.7], [-0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]].forEach(function (u) {
            opts.push([X + u[0] * d, Y + u[1] * d + 4, u[0] > 0.1 ? "start" : u[0] < -0.1 ? "end" : "middle", 1]);
          });
        });
        for (var j = 0; j < opts.length; j++) { var bx = boxOf(opts[j], w); if (free(bx)) { placed.push(bx); return opts[j]; } }
        if (!opt.force) return null;
        // sem espaço livre: fica na primeira posição que cabe na tela, mesmo encostando em outro nome
        for (var k = 0; k < opts.length; k++) { var b2 = boxOf(opts[k], w); if (b2[0] >= 2 && b2[2] <= S - 2 && b2[1] >= 2 && b2[3] <= S - 2) { placed.push(b2); return opts[k]; } }
        return opts[0];
      }
    };
  }
  // linha fina do ponto até o nome, quando o nome ficou afastado
  function lead(X, Y, o) {
    if (!o || !o[3]) return "";
    var tx = o[0], ty = o[1] - 4, dx = tx - X, dy = ty - Y, L = Math.hypot(dx, dy); if (L < 14) return "";
    return '<line x1="' + (X + dx / L * 7).toFixed(1) + '" y1="' + (Y + dy / L * 7).toFixed(1) + '" x2="' + (tx - dx / L * 3).toFixed(1) + '" y2="' + (ty - dy / L * 3).toFixed(1) + '" stroke="var(--muted)" stroke-width="1" opacity=".7"/>';
  }
  function txt(o, s, size, color) {
    return o ? '<text x="' + o[0].toFixed(1) + '" y="' + o[1].toFixed(1) + '" text-anchor="' + o[2] + '" font-size="' + size + '" font-weight="600" fill="' + color + '" style="paint-order:stroke;stroke:var(--bg);stroke-width:3px;stroke-linejoin:round">' + esc(s) + "</text>" : "";
  }
  // desenha candidatos: ponto cheio = prática; anel = discurso; seta do discurso até a prática
  function candMarks(view, opts, pl, animate) {
    var ax = axesOf(view), h = [], i = 0;
    var list = D.candidatos.map(function (c) {
      var d = coords(c, "disc"), p = coords(c, "prat");
      return { c: c, d: okAxes(d, ax) ? d : null, p: okAxes(p, ax) ? p : null };
    }).filter(function (r) { return r.d || r.p; });
    if (opts.onlyGap) list = list.filter(function (r) { return r.d && r.p; });
    list.forEach(function (r) { var k = r.p || r.d; pl.block(px(k[ax[0]].v), py(k[ax[1]].v), 8); if (r.d && r.p && opts.gap) pl.block(px(r.d[ax[0]].v), py(r.d[ax[1]].v), 6); });
    list.sort(function (a, b) { return ((b.c.resultado_1t || {}).votos || 0) - ((a.c.resultado_1t || {}).votos || 0); });
    list.forEach(function (r) {
      var nm = shortName(r.c), g = [];
      var delay = animate ? 0.4 + i++ * 0.05 : 0;
      if (r.p) {
        var X = px(r.p[ax[0]].v), Y = py(r.p[ax[1]].v);
        if (r.d && opts.gap) {
          var dx = px(r.d[ax[0]].v), dy = py(r.d[ax[1]].v), len = Math.hypot(X - dx, Y - dy);
          if (len > 12) {
            var ux = (X - dx) / len, uy = (Y - dy) / len, ex = X - ux * 8, ey = Y - uy * 8;
            g.push('<line x1="' + (dx + ux * 6).toFixed(1) + '" y1="' + (dy + uy * 6).toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '" stroke="var(--dot)" stroke-width="1.5" opacity=".6"/>');
            g.push('<path d="M' + ex.toFixed(1) + "," + ey.toFixed(1) + " l" + (-ux * 7 - uy * 4).toFixed(1) + "," + (-uy * 7 + ux * 4).toFixed(1) + " l" + (uy * 8).toFixed(1) + "," + (-ux * 8).toFixed(1) + 'z" fill="var(--dot)" opacity=".6"/>');
          }
          g.push('<circle cx="' + dx.toFixed(1) + '" cy="' + dy.toFixed(1) + '" r="5" fill="var(--bg)" stroke="var(--dot)" stroke-width="1.8"/>');
        }
        g.push('<circle cx="' + X.toFixed(1) + '" cy="' + Y.toFixed(1) + '" r="6.5" fill="var(--dot)"/>');
        var o1 = pl.place(X, Y, nm.length * 6.6, { lead: true, force: true });
        g.push(lead(X, Y, o1) + txt(o1, nm, 11.5, "var(--ink)"));
        h.push('<g class="cand" style="animation-delay:' + delay + 's"><title>' + esc(r.c.nome_urna + " · o que fez: " + coordText(coords(r.c, "prat")) + (r.d ? " · o que diz: " + coordText(coords(r.c, "disc")) : "")) + "</title>" + g.join("") + "</g>");
      } else {
        var X2 = px(r.d[ax[0]].v), Y2 = py(r.d[ax[1]].v);
        g.push('<circle cx="' + X2.toFixed(1) + '" cy="' + Y2.toFixed(1) + '" r="5.5" fill="var(--bg)" stroke="var(--dot)" stroke-width="2"/>');
        var o2 = pl.place(X2, Y2, nm.length * 6.6, { lead: true, force: true });
        g.push(lead(X2, Y2, o2) + txt(o2, nm, 11.5, "var(--muted)"));
        h.push('<g class="cand" style="animation-delay:' + delay + 's"><title>' + esc(r.c.nome_urna + " · só discurso (sem atos registrados): " + coordText(coords(r.c, "disc"))) + "</title>" + g.join("") + "</g>");
      }
    });
    return h;
  }
  function partyMarks(view, pl) {
    var ax = axesOf(view), h = [];
    (D.partidos || []).forEach(function (p) {
      var k = coords(p, "real"); if (!okAxes(k, ax)) return;
      var X = px(k[ax[0]].v), Y = py(k[ax[1]].v);
      pl.block(X, Y, 5);
      h.push('<g class="cand"><title>' + esc(p.sigla + " · " + coordText(k)) + '</title><circle cx="' + X.toFixed(1) + '" cy="' + Y.toFixed(1) + '" r="4.5" fill="none" stroke="var(--party)" stroke-width="1.6"/>' + txt(pl.place(X, Y, p.sigla.length * 5.8), p.sigla, 10, "var(--party)") + "</g>");
    });
    return h;
  }
  function youT() { var ax = axesOf(compView); return px(axisScore(answers, ax[0]).v).toFixed(1) + "px," + py(axisScore(answers, ax[1]).v).toFixed(1) + "px"; }
  // nomes dos eixos e dos quadrantes ficam livres de rótulos
  function blockFrame(pl) {
    var m = PAD + PL / 2;
    pl.rect(m - 70, 2, m + 70, 24); pl.rect(m - 70, S - 22, m + 70, S - 2);
    pl.rect(PAD + 4, m - 26, PAD + 92, m - 2); pl.rect(S - PAD - 92, m - 26, S - PAD - 4, m - 2);
    pl.rect(PAD + 8, PAD + 10, PAD + 160, PAD + 26); pl.rect(S - PAD - 160, PAD + 10, S - PAD - 8, PAD + 26);
    pl.rect(PAD + 8, S - PAD - 24, PAD + 160, S - PAD - 8); pl.rect(S - PAD - 160, S - PAD - 24, S - PAD - 8, S - PAD - 8);
  }
  var AXIS_NOTE = { z: "Instituições mede o apoio às regras da democracia: aceitar o resultado das urnas, cumprir decisões judiciais, respeitar a imprensa e a oposição, mudar as coisas dentro das regras. A maioria das pessoas responde a favor dessas regras, e por isso o seu ponto costuma ficar no alto. Candidatos aparecem mais abaixo quando falas ou atos registrados foram na outra direção, como contestar as urnas ou defender ocupações e bloqueios como forma de pressão." };
  function drawCompass(animate) {
    var h = frame(compView), pl = placer(), m = PAD + PL / 2, ax = axesOf(compView);
    blockFrame(pl);
    if (nAnswered()) { var ux = px(axisScore(answers, ax[0]).v), uy = py(axisScore(answers, ax[1]).v); pl.rect(ux - 24, uy - 34, ux + 24, uy + 16); }
    // candidatos escolhem o lugar do nome antes dos partidos; os partidos são desenhados por baixo
    var cm = $("lgCand").checked ? candMarks(compView, { gap: $("lgGap").checked }, pl, animate) : [];
    var pm = $("lgPart").checked ? partyMarks(compView, pl) : [];
    h = h.concat(pm, cm);
    var falta = D.candidatos.filter(function (c) { return !okAxes(coords(c, "disc"), ax) && !okAxes(coords(c, "prat"), ax); }).map(function (c) {
      var k = coords(c, "disc"), sem = ax.filter(function (a) { return k[a].n < 3; }).map(function (a) { return AXIS[a].nome.toLowerCase(); });
      return shortName(c) + " (" + sem.join(" e ") + ")";
    });
    $("compMissing").textContent = falta.length ? "Fora deste gráfico por falta de posições registradas suficientes no eixo: " + falta.join(", ") + "." : "";
    $("compAxisNote").textContent = ax.indexOf("z") >= 0 ? AXIS_NOTE.z : "";
    if (nAnswered()) h.push('<g id="youG" style="transform:translate(' + (animate ? m + "px," + m + "px" : youT()) + ')"><circle r="22" fill="var(--you)" opacity=".16"/><circle r="10" fill="var(--you)" stroke="var(--bg)" stroke-width="3"/><text y="-18" text-anchor="middle" font-size="13" font-weight="700" fill="var(--you)" style="paint-order:stroke;stroke:var(--bg);stroke-width:4px;stroke-linejoin:round">Você</text></g>');
    $("compass").innerHTML = h.join("");
    if (animate && nAnswered()) requestAnimationFrame(function () { requestAnimationFrame(function () { var g = $("youG"); if (g) g.style.transform = "translate(" + youT() + ")"; }); });
  }
  function drawGapChart() {
    if (!D) return;
    var pl = placer(); blockFrame(pl);
    var h = frame("xy").concat(candMarks("xy", { gap: true, onlyGap: true }, pl, false));
    $("gapChart").innerHTML = h.join("");
  }
  ["lgCand", "lgPart", "lgGap"].forEach(function (id) { $(id).addEventListener("change", function () { drawCompass(false); }); });
  document.querySelector(".viewSeg .seg").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-view]"); if (!b) return;
    compView = b.dataset.view; segSet(this, "view", compView); drawCompass(true);
  });
  document.querySelector(".modeSeg .seg").addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-mode]"); if (!b) return;
    affMode = b.dataset.mode; segSet(this, "mode", affMode); renderMatches();
  });

  function bars(eixo) {
    var temas = [];
    D.perguntas.forEach(function (q) { if (q.eixo === eixo && temas.indexOf(q.tema) < 0) temas.push(q.tema); });
    return temas.map(function (t) {
      var s = axisScore(answers, eixo, t);
      if (!s.n) return '<div class="bar"><span>' + esc(t) + '</span><span class="small muted">sem respostas</span></div>';
      var v = s.v, left = v < 0 ? 50 + v * 5 : 50, w = Math.max(Math.abs(v) * 5, 0.8);
      return '<div class="bar"><span>' + esc(t) + '</span><div class="track" title="' + fmt(v) + '"><span class="fill" data-l="' + left + '" data-w="' + w + '" style="left:50%;width:0"></span></div></div>';
    }).join("");
  }
  function grow(root) {
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      root.querySelectorAll(".fill[data-w]").forEach(function (f) { f.style.left = f.dataset.l + "%"; f.style.width = f.dataset.w + "%"; });
      root.querySelectorAll("[data-pw]").forEach(function (f) { f.style.width = f.dataset.pw + "%"; });
    }); });
  }
  function countUp(el, to, suffix, dec) {
    if (reduce) { el.textContent = (dec ? fmt(to) : Math.round(to)) + (suffix || ""); return; }
    var t0 = null;
    function step(t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3), v = to * e; el.textContent = (dec ? fmt(v) : Math.round(v)) + (suffix || ""); if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function stanceHTML(v) {
    if (v == null) return '<span class="stance snull">sem dado</span>';
    return '<span class="stance ' + { "2": "s2", "1": "s1", "0": "s0", "-1": "sm1", "-2": "sm2" }[String(v)] + '">' + esc(LIKERT[String(v)]) + "</span>";
  }

  function matchList(list, box, kind) {
    var rows = list.map(function (c) { return { c: c, a: affinity(c) }; }).filter(function (r) { return r.a.pct != null && r.a.n >= 5; });
    rows.sort(function (a, b) { return b.a.pct - a.a.pct; });
    if (!rows.length) { box.innerHTML = '<p class="muted">Responda a mais perguntas para comparar.</p>'; return; }
    var LIMIT = 5;
    box.innerHTML = rows.map(function (r, i) {
      var c = r.c, a = r.a, np = a.rows.filter(function (x) { return x.fromP; }).length;
      var agree = a.rows.filter(function (x) { return x.diff <= 1 && x.strength >= 2; }).sort(function (p, q) { return p.diff - q.diff || q.strength - p.strength; }).slice(0, 4);
      var dis = a.rows.filter(function (x) { return x.diff >= 2; }).sort(function (p, q) { return q.diff - p.diff; }).slice(0, 4);
      var name = kind === "cand" ? esc(shortName(c)) + ' <span class="num">' + esc(c.numero) + "</span>" : esc(c.sigla) + (c.numero ? ' <span class="num">' + esc(c.numero) + "</span>" : "");
      var sub = (kind === "cand" ? esc(c.partido) : esc(c.nome || "")) + " · " + a.n + " pautas" + (affMode === "real" ? (np ? ", " + np + " pelo que fez" : ", só discurso") : "");
      var who = kind === "cand" ? "candidato" : "partido";
      return '<div class="match"' + (i >= LIMIT ? " hidden" : "") + '><span class="rank">' + (i + 1) + '</span><div style="min-width:0"><b>' + name + '</b><div class="small muted">' + sub + '</div></div><span class="pct">' + Math.round(a.pct) + "%</span>" +
        '<div class="meterline"><i data-pw="' + a.pct.toFixed(1) + '"></i></div>' +
        "<details><summary>Onde concordam e onde discordam</summary>" +
        (agree.length ? '<p style="margin-top:10px"><b>Concordam</b></p><ul>' + agree.map(function (x) { return "<li>" + esc(x.q.texto) + "</li>"; }).join("") + "</ul>" : "") +
        (dis.length ? '<p style="margin-top:10px"><b>Discordam</b></p><ul>' + dis.map(function (x) { return "<li>" + esc(x.q.texto) + ' <span class="muted">(você: ' + esc(LIKERT_EU[x.u].toLowerCase()) + "; " + who + (x.fromP ? " na prática" : "") + ": " + esc(LIKERT[x.c].toLowerCase()) + ")</span></li>"; }).join("") + "</ul>" : "") +
        '<p style="margin-top:10px"><a href="#" data-open-' + kind + '="' + esc(c.id) + '">Abrir ficha completa ›</a></p></details></div>';
    }).join("") + (rows.length > LIMIT ? '<p style="margin-top:16px"><button class="linkbtn" type="button" data-showall>Ver todos os ' + rows.length + " ›</button></p>" : "");
    grow(box);
    var sa = box.querySelector("[data-showall]");
    if (sa) sa.addEventListener("click", function () { box.querySelectorAll(".match[hidden]").forEach(function (m) { m.hidden = false; }); sa.parentNode.remove(); grow(box); });
  }
  function renderMatches() {
    $("modeNote").textContent = affMode === "real"
      ? "Usa os atos e votos registrados de cada candidato; onde não há ato, usa o que ele diz, com peso menor."
      : "Usa só o que cada candidato diz em planos de governo e falas.";
    matchList(D.candidatos, $("matchCand"), "cand");
    matchList(D.partidos || [], $("matchPart"), "part");
  }

  function profile() {
    var all = D.perguntas.filter(function (q) { return answers[q.id] != null && q.eixo !== "a"; });
    var conv = all.length ? all.reduce(function (s, q) { return s + Math.abs(answers[q.id]); }, 0) / all.length / 2 * 100 : 0;
    function coh(eixo) {
      var s = 0, t = 0;
      D.perguntas.forEach(function (q) { var a = answers[q.id]; if (q.eixo !== eixo || a == null) return; s += a * q.dir; t += Math.abs(a); });
      return t ? Math.abs(s) / t * 100 : null;
    }
    return { conv: conv, cx: coh("x"), cy: coh("y") };
  }
  function renderProfile(x, y, z) {
    var p = profile();
    function meter(title, v, desc) {
      return '<div class="meter"><p style="font-weight:700">' + title + '</p><p class="big" data-count="' + (v == null ? "" : Math.round(v)) + '">' + (v == null ? "—" : "0%") + '</p><div class="ring"><i data-pw="' + (v || 0).toFixed(1) + '"></i></div><p class="small">' + desc + "</p></div>";
    }
    var convTxt = p.conv >= 70 ? "Você tem opiniões firmes na maioria das pautas." : p.conv >= 40 ? "Você tem convicção em parte das pautas e dúvidas em outras." : "Você ficou perto do neutro em muitas pautas, o que é normal para quem ainda está formando opinião.";
    function cohTxt(v, a, b) { if (v == null) return "Sem respostas firmes neste eixo."; return v >= 70 ? "Suas respostas firmes apontam quase todas para o mesmo lado (" + a + ")." : v >= 35 ? "Você pende para um lado, mas concorda com o outro em várias pautas." : "Você mistura " + b + " de forma equilibrada."; }
    $("meters").innerHTML =
      meter("Convicção", p.conv, convTxt + " Mede o quanto você se afastou do neutro.") +
      meter("Coerência na economia", p.cx, cohTxt(p.cx, x < 0 ? "esquerda" : "direita", "posições de esquerda e de direita")) +
      meter("Coerência nos costumes", p.cy, cohTxt(p.cy, y < 0 ? "progressista" : "tradicionalista", "posições progressistas e tradicionalistas"));
    $("meters").querySelectorAll("[data-count]").forEach(function (el) { if (el.dataset.count !== "") countUp(el, Number(el.dataset.count), "%"); });
    grow($("meters"));
    var side = { x: x, y: y, z: z }, esc_ = [];
    D.perguntas.forEach(function (q) {
      var a = answers[q.id], s = side[q.eixo];
      if (a == null || s == null || Math.abs(a) < 1 || Math.abs(s) < 1) return;
      if (Math.sign(a * q.dir) !== Math.sign(s)) esc_.push({ q: q, a: a, w: Math.abs(a) });
    });
    esc_.sort(function (p, q) { return q.w - p.w; });
    $("escapes").innerHTML = esc_.slice(0, 6).map(function (e) {
      var A = AXIS[e.q.eixo], opp = side[e.q.eixo] < 0 ? A.posL : A.negL;
      return "<li>" + esc(e.q.texto) + '<span class="small muted">Você: ' + esc(LIKERT_EU[e.a].toLowerCase()) + ". Aqui você pende para " + opp + " (" + A.nome.toLowerCase() + ").</span></li>";
    }).join("") || '<li class="muted">Nenhuma pauta firme na direção oposta. Suas posições são bem alinhadas.</li>';
    var dbt = D.perguntas.filter(function (q) { return answers[q.id] == null || answers[q.id] === 0; });
    $("doubts").innerHTML = (dbt.slice(0, 6).map(function (q) {
      return "<li>" + esc(q.texto) + '<span class="small muted">' + (answers[q.id] == null ? "Pulada" : "Neutro") + " · " + esc(q.tema) + "</span></li>";
    }).join("") + (dbt.length > 6 ? '<li class="small muted">E mais ' + (dbt.length - 6) + " pautas.</li>" : "")) || '<li class="muted">Você tomou posição em todas as pautas.</li>';
  }
  function renderTrads(x, y, z, hasZ) {
    var r = TRADS.map(function (t) {
      var d = Math.sqrt(Math.pow(t.x - x, 2) + Math.pow(t.y - y, 2) + (hasZ ? Math.pow(t.z - z, 2) : 0));
      return { t: t, d: d };
    }).sort(function (a, b) { return a.d - b.d; }).slice(0, 3);
    $("trads").innerHTML = r.map(function (o, i) {
      return '<div class="trad"><p class="rank">' + (i === 0 ? "Mais próxima" : (i + 1) + "ª mais próxima") + '</p><h3>' + esc(o.t.n) + "</h3><p>" + esc(o.t.d) + '</p><p class="authors">' + esc(o.t.a) + "</p></div>";
    }).join("");
  }

  function renderResult() {
    if (!D) return;
    var n = nAnswered();
    drawCompass(true);
    if (!n) {
      $("resEyebrow").textContent = "Seu resultado";
      $("verdict").textContent = "Você ainda não respondeu.";
      $("zline").textContent = "";
      $("verdictSub").textContent = "Faça o teste para ver seu ponto. Enquanto isso, o mapa mostra onde ficam os candidatos.";
      $("coords").innerHTML = ""; $("profileSec").hidden = true; $("tradSec").hidden = true;
      $("barsX").innerHTML = ""; $("barsY").innerHTML = ""; $("barsZ").innerHTML = "";
      $("matchCand").innerHTML = '<button class="pill" type="button" data-go="teste">Fazer o teste</button>';
      $("matchPart").innerHTML = "";
      return;
    }
    $("profileSec").hidden = false; $("tradSec").hidden = false;
    var x = axisScore(answers, "x"), y = axisScore(answers, "y"), z = axisScore(answers, "z");
    $("resEyebrow").textContent = "Seu resultado · " + n + " de " + D.perguntas.length + " pautas";
    $("verdict").textContent = label(x.v, y.v);
    $("zline").textContent = zLabel(z.v, z.n);
    $("verdictSub").textContent = verdictSub(x.v, y.v, z.n ? z.v : 0);
    $("coords").innerHTML = ["x", "y", "z"].map(function (ax) {
      var A = AXIS[ax];
      return '<div><p class="v" id="c' + ax + '">0</p><p class="k">' + A.nome + "<br>−10 " + A.negL + " · +10 " + A.posL + "</p></div>";
    }).join("");
    countUp($("cx"), x.v, "", true); countUp($("cy"), y.v, "", true);
    if (z.n) countUp($("cz"), z.v, "", true); else $("cz").textContent = "—";
    renderTrads(x.v, y.v, z.v, z.n > 0);
    renderProfile(x.v, y.v, z.n ? z.v : null);
    $("barsX").innerHTML = bars("x"); $("barsY").innerHTML = bars("y"); $("barsZ").innerHTML = bars("z");
    grow($("barsX")); grow($("barsY")); grow($("barsZ"));
    renderMatches();
  }

  document.addEventListener("click", function (ev) {
    var a = ev.target.closest("[data-open-cand]"); if (a) { ev.preventDefault(); openCand(a.dataset.openCand); return; }
    var p = ev.target.closest("[data-open-part]"); if (p) { ev.preventDefault(); openPart(p.dataset.openPart); }
  });

  /* ---------------- candidatos ---------------- */
  function renderCandGrid() {
    if (!D) return;
    var term = $("candSearch").value.trim().toLowerCase(), sort = $("candSort").value;
    var list = D.candidatos.filter(function (c) { return !term || [c.nome_urna, c.nome_completo, c.partido, String(c.numero)].join(" ").toLowerCase().indexOf(term) >= 0; });
    list.sort(function (a, b) {
      if (sort === "x" || sort === "y" || sort === "z") return coords(a, "real")[sort].v - coords(b, "real")[sort].v;
      if (sort === "gap") return (gapOf(b) || -1) - (gapOf(a) || -1);
      if (sort === "afinidade") return (affinity(b).pct || -1) - (affinity(a).pct || -1);
      return ((b.resultado_1t || {}).votos || 0) - ((a.resultado_1t || {}).votos || 0);
    });
    $("candGrid").innerHTML = list.map(function (c) {
      var af = nAnswered() ? affinity(c).pct : null, r = c.resultado_1t || {}, np = nPrat(c), g = gapOf(c);
      return '<button class="ccard" type="button" data-open-cand="' + esc(c.id) + '"><div class="top">' + (c.foto ? '<span class="candPh"><img src="' + esc(c.foto) + '" alt="" loading="lazy"></span>' : "") + '<div style="min-width:0;flex:1"><div class="row"><span class="nm">' + esc(shortName(c)) + '</span><span class="num">' + esc(c.numero) + "</span></div>" +
        '<div class="small muted">' + esc(c.partido) + (c.situacao ? " · " + esc(c.situacao) : "") + "</div></div></div>" +
        '<div class="small tab">' + (r.pct != null ? pctBR(r.pct) : "—") + " no 1º turno</div>" +
        '<div class="small muted">' + (np ? np + " pautas com atos registrados" : "Sem cargo ou atos registrados: só discurso") + "</div>" +
        (g != null ? '<div class="small muted tab">Distância discurso × prática: ' + g.toFixed(1).replace(".", ",") + "</div>" : "") +
        (af != null ? '<div class="aff">' + Math.round(af) + "% de afinidade com você</div>" : "") + "</button>";
    }).join("") || '<p class="muted">Nenhum candidato encontrado.</p>';
  }
  $("candSearch").addEventListener("input", renderCandGrid);
  $("candSort").addEventListener("change", renderCandGrid);

  function verdClass(v) { v = (v || "").toLowerCase(); if (/falso|fake|enganoso|insustent/.test(v)) return "falso"; if (/verdadeir|correto|confirmad/.test(v)) return "verdadeiro"; return "meio"; }
  function checkItem(ch, who) {
    return '<li class="' + verdClass(ch.veredito) + '"><span class="verd">' + esc(ch.veredito || "") + "</span>" + (who ? ' <span class="badge">· ' + esc(who) + "</span>" : "") +
      "<div>" + esc(ch.afirmacao) + '</div><div class="small muted">' + esc(ch.agencia || "") + (ch.data ? " · " + esc(ch.data) : "") + " · " + link(ch.url, "ler checagem") + "</div></li>";
  }
  function positionsTable(ent) {
    var groups = [["x", "Economia"], ["y", "Costumes"], ["z", "Instituições"], ["a", "Outras pautas (só afinidade)"]];
    return groups.map(function (g) {
      var qs = D.perguntas.filter(function (q) { return q.eixo === g[0]; });
      return '<h4 style="margin-top:22px">' + g[1] + '</h4><div class="scroll"><table class="ptable"><thead><tr><th>Afirmação</th><th>Diz</th><th>Faz</th><th>Base e fonte</th></tr></thead><tbody>' +
        qs.map(function (q) {
          var p = pos(ent, q.id), u = answers[q.id];
          var base = (p.base ? '<span class="lbl">O que diz</span>' + esc(p.base) + (p.fonte ? " " + link(p.fonte) : "") : "") +
            (p.base_p ? '<span class="lbl">O que fez</span>' + esc(p.base_p) + (p.fonte_p ? " " + link(p.fonte_p) : "") : "");
          return '<tr><td><span class="badge">' + esc(q.tema) + "</span><div>" + esc(q.texto) + "</div>" + (u != null ? '<div class="small muted">Você: ' + esc(LIKERT_EU[u].toLowerCase()) + "</div>" : "") + '</td><td class="both">' + stanceHTML(p.v) +
            '</td><td class="both">' + (p.p != null ? stanceHTML(p.p) : '<span class="stance snull">sem ato</span>') + '</td><td class="small">' + base + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }).join("");
  }
  var lastFocus = null;
  function openSheet(html) {
    closeSheet();
    lastFocus = document.activeElement;
    var back = document.createElement("div"); back.className = "sheetBack"; back.id = "sheetBack";
    var sh = document.createElement("div"); sh.className = "sheet"; sh.id = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true");
    sh.innerHTML = '<button class="close" type="button" aria-label="Fechar" id="sheetClose">×</button>' + html;
    document.body.appendChild(back); document.body.appendChild(sh);
    document.body.style.overflow = "hidden";
    back.addEventListener("click", closeSheet);
    $("sheetClose").addEventListener("click", closeSheet);
    $("sheetClose").focus();
  }
  function closeSheet() {
    var s = $("sheet"), b = $("sheetBack");
    if (s) s.remove(); if (b) b.remove();
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} lastFocus = null; }
  }
  function axisFacts(c) {
    var d = coords(c, "disc"), p = coords(c, "prat");
    return ["x", "y", "z"].map(function (ax) {
      var A = AXIS[ax];
      return '<div><p class="k">' + A.nome + '</p><p class="v tab">Diz ' + (d[ax].n >= 3 ? fmt(d[ax].v) : "—") + "<br>Faz " + (p[ax].n >= 3 ? fmt(p[ax].v) : "—") + '</p><p class="small muted">−10 ' + A.negL + " · +10 " + A.posL + "</p></div>";
    }).join("");
  }
  function openCand(id) {
    var c = D.candidatos.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    var af = nAnswered() ? affinity(c) : null, r = c.resultado_1t || {};
    var h = (c.foto ? '<span class="sheetPh"><img src="' + esc(c.foto) + '" alt="Foto oficial de ' + esc(c.nome_urna) + ' (TSE)"></span>' : "") + '<p class="eyebrow">' + esc(c.partido) + " · " + esc(c.numero) + "</p><h2>" + esc(c.nome_urna) + '</h2><p class="muted">' + esc(c.nome_completo || "") + "</p>" +
      '<p style="margin-top:16px;max-width:68ch">' + esc(c.resumo || "") + "</p>" +
      '<div class="facts"><div><p class="k">Vice</p><p class="v">' + esc(c.vice || "—") + "</p></div>" +
      '<div><p class="k">Coligação</p><p class="v">' + esc(c.coligacao || "—") + "</p></div>" +
      '<div><p class="k">1º turno</p><p class="v tab">' + (r.pct != null ? pctBR(r.pct) : "—") + (r.votos ? '</p><p class="small muted tab">' + Number(r.votos).toLocaleString("pt-BR") + " votos" : "") + "</p></div>" +
      (af && af.pct != null ? '<div><p class="k">Afinidade com você</p><p class="v tab">' + Math.round(af.pct) + "%</p></div>" : "") + "</div>" +
      "<h3>Discurso e prática</h3>" +
      '<div class="facts">' + axisFacts(c) + "</div>" +
      '<div class="gapBox"><p>' + esc(c.pratica_resumo || (nPrat(c) ? "" : "Não exerceu cargo com atos registrados nas pautas do teste. A posição vem só do que diz.")) + "</p>" +
      (c.autodeclaracao ? '<p class="small muted"><b>Como se define:</b> ' + esc(c.autodeclaracao) + " A autodeclaração não entra no cálculo.</p>" : "") + "</div>";
    h = h.replace("<h3>Discurso e prática</h3>", '<div id="cohBox"></div><h3>Discurso e prática</h3>');
    if ((c.atos || []).length) h += '<h3>Atos registrados</h3><ul class="atos">' + c.atos.map(function (a) { return '<li><span class="d">' + esc(a.data || "") + "</span><span>" + esc(a.ato) + (a.fonte ? ' <span class="small">' + link(a.fonte) + "</span>" : "") + "</span></li>"; }).join("") + "</ul>";
    if ((c.propostas || []).length) h += '<h3>Principais propostas</h3><ul class="list">' + c.propostas.map(function (p) { return '<li><span class="badge">' + esc(p.tema) + "</span><div>" + esc(p.texto) + (p.fonte ? ' <span class="small">' + link(p.fonte) + "</span>" : "") + "</div></li>"; }).join("") + "</ul>";
    if (c.plano_governo_url) h += '<p class="small" style="margin-top:10px">' + link(c.plano_governo_url, "Plano de governo no TSE") + "</p>";
    h += '<h3>Posição em cada pauta</h3><p class="small muted" style="margin-top:6px">"Diz" vem de planos e falas; "Faz" vem de atos, leis e votos. "Sem dado" ou "sem ato" quando não há registro confiável.</p>' + positionsTable(c);
    if ((c.checagens || []).length) h += '<h3>Checagens</h3><ul class="list">' + c.checagens.map(function (ch) { return checkItem(ch); }).join("") + "</ul>";
    if ((c.fontes || []).length) h += '<h3>Fontes</h3><ul class="small" style="padding-left:18px;margin-top:10px">' + c.fontes.map(function (u) { return safeUrl(u) ? "<li>" + link(u, u) + "</li>" : ""; }).join("") + "</ul>";
    h += '<div id="tlBox"></div><p class="small muted" style="margin-top:22px">Atualizado em ' + esc(c.atualizado_em || D.atualizado_em) + "</p>";
    openSheet(h);
    loadConteudo().then(function (d) {
      var box = $("tlBox"), cb = $("cohBox"), tl = d.linhas && d.linhas[c.id];
      if (cb && d.coerencia && d.coerencia[c.id]) cb.innerHTML = cohHTML(d.coerencia[c.id]);
      // a linha do tempo completa é longa: fica recolhida, depois do resumo das principais ações
      if (box && tl) box.innerHTML = '<details class="tlFull"><summary><span class="h">Linha do tempo completa</span><span class="small muted">' + (tl.eventos || []).length + " fatos com data e fonte</span></summary>" + timelineHTML(tl) + "</details>";
    });
  }
  function renderParties() {
    if (!D) return;
    var ps = (D.partidos || []).slice().sort(function (a, b) { return coords(a, "real").x.v - coords(b, "real").x.v; });
    function cell(k, ax) { return k[ax].n >= 3 ? fmt(k[ax].v) : "—"; }
    $("partTable").innerHTML = "<thead><tr><th>Partido</th><th>Economia</th><th>Costumes</th><th>Instituições</th><th>Pesquisa acadêmica</th><th></th></tr></thead><tbody>" +
      ps.map(function (p) {
        var k = coords(p, "real"), af = nAnswered() ? affinity(p).pct : null;
        return "<tr><td><b>" + esc(p.sigla) + "</b>" + (p.numero ? ' <span class="num">' + esc(p.numero) + "</span>" : "") + '<div class="small muted">' + esc(p.nome || "") + '</div></td><td class="tab">' + cell(k, "x") + '</td><td class="tab">' + cell(k, "y") + '</td><td class="tab">' + cell(k, "z") + '</td><td class="small" style="max-width:26em">' + esc(p.classificacao_academica || "—") + '</td><td><button class="pill soft" style="min-height:36px;padding:0 14px;font-size:.88rem" type="button" data-open-part="' + esc(p.id) + '">' + (af != null ? Math.round(af) + "% · " : "") + "Abrir</button></td></tr>";
      }).join("") + "</tbody>";
  }
  function openPart(id) {
    var p = (D.partidos || []).filter(function (x) { return x.id === id; })[0]; if (!p) return;
    openSheet('<p class="eyebrow">Partido' + (p.numero ? " · " + esc(p.numero) : "") + "</p><h2>" + esc(p.sigla) + '</h2><p class="muted">' + esc(p.nome || "") + "</p>" +
      '<p style="margin-top:16px;max-width:68ch">' + esc(p.resumo || "") + "</p>" +
      '<h3>Programa e votos</h3><div class="facts">' + axisFacts(p) + "</div>" +
      (p.classificacao_academica ? '<p class="small muted" style="margin-top:12px"><b>Pesquisa acadêmica:</b> ' + esc(p.classificacao_academica) + "</p>" : "") +
      (p.vparty_txt ? '<p class="small muted" style="margin-top:6px"><b>V-Party (V-Dem):</b> ' + esc(p.vparty_txt) + "</p>" : "") +
      '<h3>Posição em cada pauta</h3><p class="small muted" style="margin-top:6px">"Diz" vem do programa e de notas oficiais; "Faz" vem de votações nominais e orientação de bancada.</p>' + positionsTable(p) +
      ((p.fontes || []).length ? '<h3>Fontes</h3><ul class="small" style="padding-left:18px;margin-top:10px">' + p.fontes.map(function (u) { return safeUrl(u) ? "<li>" + link(u, u) + "</li>" : ""; }).join("") + "</ul>" : ""));
  }

/*EXTRA*/
/*APURACAO*/
/*ACOMP*/
  /* ---------------- checagens, estudo, status ---------------- */
  function renderStatic() {
    var all = [];
    D.candidatos.forEach(function (c) { (c.checagens || []).forEach(function (ch) { all.push({ ch: ch, who: shortName(c) }); }); });
    all.sort(function (a, b) { return String(b.ch.data || "").localeCompare(String(a.ch.data || "")); });
    $("checkList").innerHTML = all.map(function (x) { return checkItem(x.ch, x.who); }).join("") || '<li class="muted">Nenhuma checagem reunida ainda.</li>';
    var e = D.eleicao || {};
    if (e.pill) $("electionPill").innerHTML = "<i></i><span>" + esc(e.pill) + "</span>";
    $("footUpdated").innerHTML = "Dados atualizados em " + esc(D.atualizado_em) + ". " + esc(e.status || "") + (e.resultado_url ? " " + link(e.resultado_url, "Apuração oficial no TSE") + "." : "");
    $("estudo").innerHTML = D.estudo_html || '<p class="muted">Estudo indisponível.</p>';
    $("nCandBig").textContent = D.candidatos.length;
    $("nPerg").textContent = D.perguntas.length;
    var nGap = D.candidatos.filter(function (c) { return gapOf(c) != null; }).length;
    $("gapNote").textContent = nGap + " de " + D.candidatos.length + " candidatos têm atos registrados em pautas suficientes para aparecer aqui. Os demais nunca exerceram cargo com atos sobre estes temas.";
  }

  function boot(data) {
    D = data;
    var argMap = D.argumentos || {};
    D.perguntas.forEach(function (q) { var a = argMap[q.id]; if (a) { q.favor = a.favor; q.contra = a.contra; } q.explica = (D.explicacoes || {})[q.id]; });
    Q = orderQuestions();
    var saved = load("fdr.answers"); imp = load("fdr.peso") || {};
    if (saved && typeof saved === "object") Object.keys(saved).forEach(function (k) { if (D.perguntas.some(function (q) { return q.id === k; })) answers[k] = saved[k]; });
    var h = (location.hash || "").slice(1), shared = /^[rs]/.test(h) ? decode(h) : null;
    renderStatic();
    // abas de conteúdo só aparecem quando o conteúdo existe
    loadConteudo().then(function (d) {
      var has = { poder: !!(d.poder && d.poder.conexoes), fenomenos: !!(d.fenomenos && d.fenomenos.length), glossario: !!(d.glossario && d.glossario.length) };
      document.querySelectorAll('[data-go="poder"],[data-go="fenomenos"],[data-go="glossario"]').forEach(function (a) { a.hidden = !has[a.dataset.go]; });
    });
    if (shared) { answers = shared; imp = decode.imp || {}; store("fdr.answers", answers); store("fdr.peso", imp); show("resultado"); return; }
    cur = 0; for (var i = 0; i < Q.length; i++) { if (answers[Q[i].id] == null) { cur = i; break; } cur = Q.length - 1; }
    var first = HOT.view || (VIEWS.indexOf(h) >= 0 ? h : "inicio");
    show(first, true);
  }
  // atualizações publicadas chegam com a página recarregada; preserva a aba e o estado escolhido
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) { try { hot.snapshot(function () { var s = AP.state(); return { view: curView, turno: s.turno, mode: s.mode, uf: s.uf, aptab: s.aptab, gov: s.gov }; }); } catch (e) {} }
  function start(data) {
    HOT = data || {};
    fetch("dados.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(boot).catch(function () {
      $("electionPill").innerHTML = "<span>Não foi possível carregar os dados. Recarregue a página.</span>";
    });
  }
  if (hot && hot.ready) { try { hot.ready(start); } catch (e) { start({}); } } else start((hot && hot.data) || {});
})();
