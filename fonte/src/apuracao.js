  /* ---------------- apuração ao vivo ---------------- */
  var AP = (function () {
    var UFN = { ac: "Acre", al: "Alagoas", ap: "Amapá", am: "Amazonas", ba: "Bahia", ce: "Ceará", df: "Distrito Federal", es: "Espírito Santo", go: "Goiás", ma: "Maranhão", mt: "Mato Grosso", ms: "Mato Grosso do Sul", mg: "Minas Gerais", pa: "Pará", pb: "Paraíba", pr: "Paraná", pe: "Pernambuco", pi: "Piauí", rj: "Rio de Janeiro", rn: "Rio Grande do Norte", rs: "Rio Grande do Sul", ro: "Rondônia", rr: "Roraima", sc: "Santa Catarina", sp: "São Paulo", se: "Sergipe", to: "Tocantins", zz: "Exterior", br: "Brasil" };
    var REG = [["Norte", ["ac", "am", "ap", "pa", "ro", "rr", "to"]], ["Nordeste", ["al", "ba", "ce", "ma", "pb", "pe", "pi", "rn", "se"]], ["Centro-Oeste", ["df", "go", "ms", "mt"]], ["Sudeste", ["es", "mg", "rj", "sp"]], ["Sul", ["pr", "rs", "sc"]], ["Exterior", ["zz"]]];
    var START = Date.UTC(2026, 9, 25, 20, 0, 0); // 17h em Brasília
    var A = { tab: "mapa", gov: null, painted: false, live: null, t1: null, map: null, turno: "2", turnoAuto: true, cargo: "pres", mode: "votos", uf: null, lastColl: null, sort: "uf", sortDir: 1, built: false, started: false };

    function n2(v) { return Number(v || 0).toLocaleString("pt-BR"); }
    function pc(v, d) { return (v || 0).toFixed(d == null ? 2 : d).replace(".", ",") + "%"; }
    function dataT() { return A.turno === "2" ? A.live : A.t1; }
    function order1T() { var c = (A.t1 && A.t1.br.c) || []; return [c[0] && c[0].n, c[1] && c[1].n]; }
    // cores dos partidos (paleta de sistema); quem não tem cor própria fica em cinza
    var PCOL = { PL: "--kPL", PT: "--kPT", NOVO: "--kNOVO", PSD: "--kPSD", AVANTE: "--kAVANTE", "MISSÃO": "--kMISSAO", MISSAO: "--kMISSAO", REPUBLICANOS: "--kREP", PP: "--kPP", MDB: "--kMDB", "UNIÃO": "--kUNIAO", UNIAO: "--kUNIAO", PSDB: "--kPSDB", PSB: "--kPSB", PDT: "--kPDT", PSOL: "--kPSOL" };
    var SG_BY_N = {};
    function sgColor(sg) { var k = PCOL[String(sg || "").toUpperCase()]; return k ? "var(" + k + ")" : "var(--cO)"; }
    function colorOf(n, sg) {
      if (sg) return sgColor(sg);
      if (!SG_BY_N[n]) { [A.t1, A.live].forEach(function (d) { if (d) d.br.c.forEach(function (c) { SG_BY_N[c.n] = c.sg; }); }); }
      return sgColor(SG_BY_N[n]);
    }
    function candInfo(n) {
      var c = (D && D.candidatos || []).filter(function (x) { return String(x.numero) === String(n); })[0];
      return c ? { nome: shortName(c), id: c.id, partido: c.partido } : null;
    }
    function displayName(c, gov) { var i = gov ? null : candInfo(c.n); return i ? i.nome : titleCase(c.nm || ""); }
    function titleCase(s) { return s.toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, function (w) { return w.toLowerCase(); }); }
    function photo(sq, cls) { return '<span class="' + (cls || "ph") + '"><img src="fotos/' + esc(sq) + '.jpeg" alt="" loading="lazy" onerror="this.remove()"></span>'; }
    function sorted2T(cs) { var o = order1T(); return cs.slice().sort(function (a, b) { return o.indexOf(a.n) - o.indexOf(b.n); }); }
    function region(uf) { var d = dataT(); return !d ? null : uf === "br" || !uf ? d.br : d.ufs[uf]; }

    /* ---- cabeçalho, duelo e números gerais ---- */
    function renderHeader() {
      var d = dataT(), br = d && d.br, pill = $("livePill"), now = Date.now(), t = "", live = false;
      $("apTitle").innerHTML = A.turno === "2" ? '2º turno<span class="apDate"> · 25 de outubro</span>' : '1º turno<span class="apDate"> · 4 de outubro</span>';
      segSet($("turnoSeg"), "turno", A.turno);
      if (!br) t = "Carregando dados do TSE…";
      else if (A.turno === "1") t = "Resultado final do 1º turno, totalizado pelo TSE";
      else if (br.s.a === 0 && now < START) {
        var m = Math.max(0, Math.round((START - now) / 60000));
        t = "A votação termina às 17h (Brasília). A apuração começa em seguida, em " + (m >= 60 ? Math.floor(m / 60) + "h" + String(m % 60).padStart(2, "0") : m + " min") + ".";
      } else if (br.s.a === 0) t = "Urnas fechadas. Aguardando os primeiros boletins do TSE.";
      else if (br.s.p >= 100) t = "Apuração encerrada · 100% das seções · TSE às " + br.ht;
      else { live = true; t = "Ao vivo · " + pc(br.s.p) + " das seções apuradas · TSE às " + br.ht; }
      pill.classList.toggle("idle", !live);
      pill.innerHTML = "<i></i><span>" + esc(t) + "</span>";
      var note = "";
      if (A.turno === "2" && A.live && A.live.coletado) note = (A.live.direto ? "Seu navegador leu os arquivos oficiais do TSE às " : "Lido do TSE às ") + A.live.coletado.slice(11, 19) + " (horário de Brasília)." + (A.live.direto ? " Atualiza sozinho a cada poucos segundos." : "");
      if (A.turno === "1" && A.live && A.live.br.s.a === 0) note = "Ainda não há votos apurados no 2º turno; enquanto isso, veja como foi o 1º turno.";
      $("apNote").textContent = note;
      $("cargoBar").hidden = !(A.turno === "2" && A.live && A.live.gov && Object.keys(A.live.gov).length);
      segSet($("cargoSeg"), "cargo", govMode() ? "gov" : "pres");
      $("apEyebrow").textContent = govMode() ? "Apuração · Governador" : "Apuração · Presidente da República";
      if (govMode()) {
        var g = A.live.gov[A.gov] || A.live.gov[Object.keys(A.live.gov)[0]];
        $("apTitle").innerHTML = "2º turno" + '<span class="apDate"> · governador</span>';
        var gl = g && g.s.a > 0;
        pill.classList.toggle("idle", !gl || g.s.p >= 100);
        pill.innerHTML = "<i></i><span>" + esc(!g ? "Carregando…" : !g.s.a ? (Date.now() < START ? "A apuração começa às 17h (Brasília)" : "Urnas fechadas. Aguardando os primeiros números do TSE.") : g.s.p >= 100 ? "Apuração encerrada · 100% das seções" : "Ao vivo · " + pc(g.s.p) + " das seções apuradas · TSE às " + g.ht) + "</span>";
      }
    }
    function govMode() { return A.cargo === "gov" && A.turno === "2" && A.live && A.live.gov && Object.keys(A.live.gov).length > 0; }
    function renderDuel() {
      var d = dataT(); if (!d) return;
      var br = d.br, cs = A.turno === "2" ? sorted2T(br.c) : br.c.slice(0, 2);
      $("duel").innerHTML = cs.map(function (c, i) {
        var info = candInfo(c.n), win = /eleito/i.test(c.st) && !/não/i.test(c.st);
        return '<div class="duelCard' + (i ? " right" : "") + '" style="--c:' + colorOf(c.n) + '">' + photo(c.sq) +
          '<div style="min-width:0"><p class="nm">' + esc(displayName(c)) + ' <span class="num">' + esc(c.n) + "</span></p>" +
          '<p class="small muted">' + esc(c.sg || (info && info.partido) || "") + "</p>" +
          '<p class="pc">' + pc(c.p) + '</p><p class="vt">' + n2(c.v) + " votos</p>" +
          (win ? '<span class="badgeWin">' + esc(c.st) + "</span>" : A.turno === "1" && c.st ? '<span class="small muted">' + esc(c.st) + "</span>" : "") +
          (info && nAnswered() >= 5 ? (function () { var cc = D.candidatos.filter(function (x) { return x.id === info.id; })[0], af = cc && affinity(cc); return af && af.pct != null ? '<p class="small" style="margin-top:6px;font-weight:600;color:var(--you)">Sua afinidade no teste: ' + Math.round(af.pct) + "%</p>" : ""; })() : "") +
          (info ? '<p class="small" style="margin-top:6px"><a href="#" data-open-cand="' + esc(info.id) + '">Ver ficha ›</a></p>' : "") + "</div></div>";
      }).join("");
      var others = A.turno === "1" ? br.c.slice(2) : [];
      var oth = others.reduce(function (s, c) { return s + c.p; }, 0);
      $("splitBar").innerHTML = cs.map(function (c) { return '<span style="width:' + c.p + "%;background:" + colorOf(c.n) + '"></span>'; }).join("").replace(/(<span[^>]*><\/span>)$/, (others.length ? '<span style="width:' + oth + '%;background:var(--cO)"></span>' : "") + "$1");
      var diff = cs.length > 1 ? Math.abs(cs[0].v - cs[1].v) : 0;
      $("splitMeta").innerHTML = "<span>" + (br.s.a ? "Diferença: " + n2(diff) + " votos (" + pc(Math.abs(cs[0].p - cs[1].p)) + ")" : "Ainda sem votos apurados") + "</span>" +
        (others.length ? "<span>Outros " + others.length + " candidatos: " + pc(oth) + "</span>" : "<span>A linha marca 50% dos votos válidos</span>");
    }
    function stat(k, v, s, prog) { return '<div><p class="k">' + k + '</p><p class="v">' + v + '</p><p class="s">' + s + "</p>" + (prog != null ? '<div class="progRing"><i style="width:' + prog + '%"></i></div>' : "") + "</div>"; }
    function renderStats() {
      var d = dataT(); if (!d) return; var b = d.br;
      $("apStats").innerHTML =
        stat("Seções apuradas", pc(b.s.p), n2(b.s.a) + " de " + n2(b.s.t), b.s.p) +
        stat("Comparecimento", pc(b.pcomp), n2(b.comp) + " eleitores") +
        stat("Abstenção", pc(b.pabst), n2(b.abst) + " eleitores") +
        stat("Brancos", pc(b.pvb), n2(b.vb) + " votos") +
        stat("Nulos", pc(b.pvn), n2(b.vn) + " votos");
    }
    // quanto o segundo colocado precisaria dos votos ainda não apurados (estimativa, não previsão)
    function renderNeed() {
      var box = $("needBox"), d = dataT();
      if (A.turno !== "2" || !d || !d.br.s.a || d.br.s.p >= 100 || d.br.c.length < 2) { box.hidden = true; return; }
      var b = d.br, lead = b.c[0], sec = b.c[1];
      var restEl = Math.max(0, b.el - b.el_ap), compRate = b.el_ap ? b.comp / b.el_ap : 0, valRate = b.tv ? b.vv / b.tv : 0;
      var R = restEl * compRate * valRate, diff = lead.v - sec.v;
      if (R <= 0) { box.hidden = true; return; }
      var need = (diff + R) / (2 * R) * 100;
      box.hidden = false;
      box.innerHTML = "<b>Conta de quanto falta.</b> Mantido o comparecimento visto até agora, ainda faltam cerca de <b>" + n2(Math.round(R)) + "</b> votos válidos para apurar. " +
        (need > 100 ? "Mesmo com todos eles, " + esc(displayName(sec)) + " não alcançaria " + esc(displayName(lead)) + " por esta estimativa." :
          "Para passar à frente, " + esc(displayName(sec)) + " precisaria de <b>" + pc(need, 1) + "</b> deles; até agora tem " + pc(sec.p, 1) + " do total.") +
        ' <span class="muted">Estimativa aritmética a partir dos dados do TSE, não é projeção. Os votos que faltam não são uma amostra aleatória: dependem de quais cidades ainda não terminaram.</span>';
    }

    /* ---- mapa ---- */
    /* ---- mapa "população": microbolinhas em canvas que se mexem devagar ----
       Cada estado é uma malha de pontos. Os pontos acendem conforme as seções são apuradas e assumem a cor
       do partido na proporção dos votos (modo Votos). As cores mudam com transição suave; os pontos oscilam
       levemente, como uma multidão. O SVG por cima guarda só as áreas clicáveis dos estados. */
    var M = null;
    function rgba(css) {
      var el = $("colorProbe"); el.style.color = ""; el.style.color = css;
      var c = getComputedStyle(el).color, m = c.match(/-?[\d.]+/g) || ["128", "128", "128"];
      if (/^color\(/.test(c)) return [m[0] * 255, m[1] * 255, m[2] * 255, m[3] != null ? +m[3] : 1];
      return [+m[0], +m[1], +m[2], m[3] != null ? +m[3] : 1];
    }
    var BAYER = (function () { var m = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21]; return m; })();
    function buildMap() {
      if (A.built || !A.map || !A.dots) return;
      var svg = $("brMap"), h = ['<g id="mapHits">'];
      Object.keys(A.map.uf).forEach(function (uf) {
        h.push('<path d="' + A.map.uf[uf].d + '" data-uf="' + uf + '" tabindex="0" role="button" aria-label="' + esc(UFN[uf] || uf) + '"></path>');
      });
      svg.innerHTML = h.join("") + "</g>";
      var ds = A.dots.dots, n = ds.length, seed = 7;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      M = { n: n, sp: A.dots.sp, x: new Float32Array(n), y: new Float32Array(n), uf: [], r1: new Float32Array(n), r2: new Float32Array(n),
        ph1: new Float32Array(n), ph2: new Float32Array(n), f1: new Float32Array(n), f2: new Float32Array(n), delay: new Float64Array(n),
        cur: new Float32Array(n * 4), minor: new Uint8Array(n), lit: new Uint8Array(n), pop: new Uint8Array(n), dn: new Float32Array(n), ra: new Float32Array(n), dg: new Float32Array(n), ufLit: {}, flash: {}, from: new Float32Array(n * 4), to: new Float32Array(n * 4), t0: 0, hover: null, colors: {}, running: false, clip: {} };
      // cada estado vira uma máscara: nenhum ponto atravessa a divisa nem sai do mapa
      if (window.Path2D) Object.keys(A.map.uf).forEach(function (uf) { M.clip[uf] = new Path2D(A.map.uf[uf].d); });
      for (var i = 0; i < n; i++) {
        M.x[i] = ds[i][0]; M.y[i] = ds[i][1]; M.uf[i] = A.dots.ufs[ds[i][2]];
        M.r1[i] = rnd(); M.r2[i] = rnd(); M.ph1[i] = rnd() * 6.283; M.ph2[i] = rnd() * 6.283;
        M.f1[i] = 0.35 + rnd() * 0.55; M.f2[i] = 0.3 + rnd() * 0.5; M.delay[i] = rnd() * 900;
      }
      // ordem de preenchimento de cada estado: do centro para as bordas, com um pouco de acaso,
      // como uma gota de tinta se espalhando. r1 vira a posição do ponto nessa fila (0 a 1), então "lit" = fração exata acesa
      var byUf = {};
      for (i = 0; i < n; i++) (byUf[M.uf[i]] = byUf[M.uf[i]] || []).push(i);
      Object.keys(byUf).forEach(function (uf) {
        var ids = byUf[uf], cx = 0, cy = 0, md = 0;
        ids.forEach(function (k) { cx += M.x[k]; cy += M.y[k]; }); cx /= ids.length; cy /= ids.length;
        var dist = ids.map(function (k) { var d = Math.hypot(M.x[k] - cx, M.y[k] - cy); if (d > md) md = d; return d; });
        // frente de preenchimento limpa e orgânica: distância ao centro + uma ondulação suave + quase nada de acaso
        var ph = rnd() * 6.283;
        var key = ids.map(function (k, q) { var an = Math.atan2(M.y[k] - cy, M.x[k] - cx); return [k, dist[q] / (md || 1) + 0.07 * Math.sin(3 * an + ph) + 0.04 * Math.sin(5 * an - ph) + 0.035 * rnd()]; }).sort(function (a, b) { return a[1] - b[1]; });
        key.forEach(function (kv, q) { M.r1[kv[0]] = (q + 0.5) / ids.length; });
        ids.forEach(function (k, q) { M.dn[k] = dist[q] / (md || 1); });
        // retícula (dither ordenado 8x8, como impressão em meio-tom): as cores se misturam de forma uniforme,
        // sem manchas ao acaso e sem sugerir onde, dentro do estado, cada um teve voto. Depois vira posição na fila (0 a 1)
        // para a fração de pontos de cada candidato ser exata.
        ids.map(function (k) { var cx8 = Math.round(M.x[k] / M.sp) & 7, cy8 = Math.round(M.y[k] / M.sp) & 7; return [k, BAYER[cy8 * 8 + cx8] + rnd() * 0.5]; })
          .sort(function (a, b) { return a[1] - b[1]; }).forEach(function (kv, q) { M.ra[kv[0]] = (q + 0.5) / ids.length; });
      });
      // coordenada diagonal (para a luz que atravessa o mapa)
      for (i = 0; i < n; i++) M.dg[i] = (M.x[i] * 0.8 + M.y[i] * 0.6) / (613 * 0.8 + 639 * 0.6);
      var tip = $("mapTip"), box = svg.parentNode;
      svg.addEventListener("pointermove", function (ev) {
        var p = ev.target.closest("path[data-uf]");
        if (!p) { tip.hidden = true; if (M.hover) M.dirty = true; M.hover = null; return; }
        if (M.hover !== p.dataset.uf) M.dirty = true;
        M.hover = p.dataset.uf;
        var r = box.getBoundingClientRect();
        tip.innerHTML = tipHTML(p.dataset.uf); tip.hidden = false;
        var x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
        if (x + 220 > r.width) x = ev.clientX - r.left - 234;
        tip.style.transform = "translate(" + x + "px," + y + "px)";
      });
      svg.addEventListener("pointerleave", function () { tip.hidden = true; M.hover = null; M.dirty = true; });
      svg.addEventListener("click", function (ev) { var p = ev.target.closest("path[data-uf]"); if (p) select(p.dataset.uf); });
      svg.addEventListener("keydown", function (ev) { if ((ev.key === "Enter" || ev.key === " ") && ev.target.dataset && ev.target.dataset.uf) { ev.preventDefault(); select(ev.target.dataset.uf); } });
      if (window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { M.colors = {}; renderMap(); });
      A.built = true;
      startLoop();
    }
    function col(css) { if (!M.colors[css]) M.colors[css] = rgba(css); return M.colors[css]; }
    function tipHTML(uf) {
      var d = dataT(), r = d && d.ufs[uf]; if (!r) return "<b>" + esc(UFN[uf]) + "</b>";
      var cs = A.turno === "2" ? sorted2T(r.c) : r.c.slice(0, 3);
      return "<b>" + esc(UFN[uf]) + '</b><span class="tipSub">' + pc(r.s.p, 1) + " apurado</span>" + (r.s.a ? cs.map(function (c) {
        return '<span class="tipRow"><i style="background:' + colorOf(c.n, c.sg) + '"></i>' + esc(displayName(c)) + "<b>" + pc(c.p, 1) + "</b></span>";
      }).join("") : '<span class="tipSub">Sem votos apurados</span>');
    }
    function share2(cs, n) { var a = 0, t = 0; cs.forEach(function (c) { var o = order1T(); if (c.n === o[0] || c.n === o[1]) { t += c.v; if (c.n === n) a = c.v; } }); return t ? a / t * 100 : null; }
    // cor-alvo de cada ponto conforme o modo do mapa
    function targetsFor() {
      var d = dataT(), OFF = col("var(--dotOff)"), INK = col("var(--ink)"), n = M.n, now = performance.now();
      var cache = {};
      function info(uf) {
        if (cache[uf]) return cache[uf];
        var r = d && d.ufs[uf], o = { r: r, lit: r ? r.s.p / 100 : 0, cum: [] };
        if (r && r.s.a) {
          if (A.mode === "votos") { var nat = (d.br && d.br.c) || r.c, cs = nat.slice(0, A.turno === "2" ? 2 : 4).map(function (cn) { return r.c.filter(function (x) { return x.n === cn.n; })[0] || { n: cn.n, sg: cn.sg, p: 0 }; }), acc = 0, tot = cs.reduce(function (s, c) { return s + c.p; }, 0) || 1; cs.forEach(function (c) { acc += c.p / tot; o.cum.push([acc, col(colorOf(c.n, c.sg))]); }); o.lead = col(colorOf(r.c[0].n, r.c[0].sg)); }
          else if (A.mode === "lider") o.cum.push([1, col(colorOf(r.c[0].n, r.c[0].sg))]);
          else if (A.mode === "comp") { o.lit = r.pcomp / 100; o.cum.push([1, INK]); }
          else if (A.mode === "mud") { var p1 = A.t1 && A.t1.ufs[uf], oo = order1T(); var dl = p1 ? share2(r.c, oo[0]) - share2(p1.c, oo[0]) : 0; o.lit = Math.min(1, Math.abs(dl) / 10); o.cum.push([1, col(colorOf(dl >= 0 ? oo[0] : oo[1]))]); }
          else o.cum.push([1, INK]);
        }
        if (A.mode === "apurado" && r) o.cum = [[1, INK]];
        return (cache[uf] = o);
      }
      for (var i = 0; i < n; i++) {
        var o = info(M.uf[i]), c = OFF;
        M.minor[i] = 0;
        if (o.cum.length && M.r1[i] < o.lit) {
          c = o.cum[o.cum.length - 1][1];
          var rk = M.ra[i];
          for (var k = 0; k < o.cum.length; k++) if (rk <= o.cum[k][0]) { c = o.cum[k][1]; break; }
          // quem não lidera no estado aparece em pontos um pouco menores e mais suaves; o líder salta aos olhos
          if (A.mode === "votos" && o.lead && c !== o.lead) M.minor[i] = 1;
        }
        var j = i * 4, on = c !== OFF ? 1 : 0, u0 = M.uf[i], prev = M.ufLit[u0] || 0;
        if (!A.painted) { M.cur[j] = OFF[0]; M.cur[j + 1] = OFF[1]; M.cur[j + 2] = OFF[2]; M.cur[j + 3] = OFF[3]; }
        // ponto que acaba de acender "nasce" numa onda que sai do centro do estado; os demais só trocam de cor
        // M.delay guarda o instante (absoluto) em que a transição do ponto começa
        if (on && M.pop[i] && M.delay[i] + 650 > now) {
          // ainda na fila da onda anterior: mantém a vez dele, só atualiza a cor de destino
          M.to[j] = c[0]; M.to[j + 1] = c[1]; M.to[j + 2] = c[2]; M.to[j + 3] = c[3];
          continue;
        }
        M.pop[i] = on && !M.lit[i] ? 1 : 0;
        M.delay[i] = now + (M.pop[i] ? Math.max(0, (M.r1[i] - prev) / Math.max(0.02, o.lit - prev)) * (A.painted ? 1300 : 2000) : M.r2[i] * 500);
        M.lit[i] = on;
        M.from[j] = M.cur[j]; M.from[j + 1] = M.cur[j + 1]; M.from[j + 2] = M.cur[j + 2]; M.from[j + 3] = M.cur[j + 3];
        M.to[j] = c[0]; M.to[j + 1] = c[1]; M.to[j + 2] = c[2]; M.to[j + 3] = c[3];
      }
      Object.keys(cache).forEach(function (uf) {
        var o2 = cache[uf], before = M.ufLit[uf] || 0;
        if (A.painted && o2.lit > before + 0.0005) M.flash[uf] = { t: now, c: o2.lead || (o2.cum.length ? o2.cum[0][1] : INK) };
        M.ufLit[uf] = o2.lit;
      });
      // o mapa só é redesenhado enquanto há algo se mexendo; parado, não gasta nada do aparelho
      var endT = now;
      for (var q2 = 0; q2 < n; q2++) if (M.delay[q2] > endT) endT = M.delay[q2];
      M.animUntil = Math.max(M.animUntil || 0, endT + 800, Object.keys(M.flash).length ? now + 1900 : 0); M.dirty = true;
      M.t0 = now; A.painted = true;
    }
    function startLoop() {
      var cv = $("mapCanvas"), ctx = cv.getContext("2d"), last = 0;
      function size() {
        var r = $("brMap").getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.style.width = r.width + "px"; cv.style.height = r.height + "px";
        // posiciona a tela exatamente sobre o SVG (medindo na tela, sem depender de margens do layout)
        var op = cv.offsetParent || document.body, pr = op.getBoundingClientRect();
        cv.style.left = (r.left - pr.left - op.clientLeft) + "px"; cv.style.top = (r.top - pr.top - op.clientTop) + "px";
        cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
        // mesma conta do SVG (preserveAspectRatio "meet", centralizado): a tela e o contorno ficam sempre alinhados
        var vb = svgBox(), sc = Math.min(r.width / vb[2], r.height / vb[3]);
        M.scale = sc * dpr; M.dpr = dpr;
        M.ox = ((r.width - vb[2] * sc) / 2 - vb[0] * sc) * dpr; M.oy = ((r.height - vb[3] * sc) / 2 - vb[1] * sc) * dpr;
        M.sizedW = r.width; M.sizedH = r.height; M.dirty = true;
      }
      function svgBox() { var v = ($("brMap").getAttribute("viewBox") || "0 0 613 639").split(/[\s,]+/).map(Number); return v.length === 4 && v[2] ? v : [0, 0, 613, 639]; }
      size(); window.addEventListener("resize", size);
      if (window.ResizeObserver) new ResizeObserver(function () { size(); }).observe($("brMap"));
      function frame(t) {
        requestAnimationFrame(frame);
        if (document.hidden || $("v-apuracao").hidden || !cv.offsetParent) return;
        if (t - last < (reduce ? 1000 : 33)) return; // ~30 quadros por segundo
        last = t;
        if (cv.width === 0) size(); else { var rb = $("brMap").getBoundingClientRect(); var rc = cv.getBoundingClientRect(); if (Math.abs(rb.width - M.sizedW) > 0.5 || Math.abs(rb.height - M.sizedH) > 0.5 || Math.abs(rb.top - rc.top) > 0.5 || Math.abs(rb.left - rc.left) > 0.5) size(); }
        if (!M.dirty && t > (M.animUntil || 0)) return;
        M.dirty = false;
        var s = M.scale, n = M.n, rad = Math.max(0.55, M.sp * 0.28 * s), amp = 0, tt = t / 1000, el = t - M.t0;
        var pings = [];
        for (var pu in M.flash) if (t - M.flash[pu].t < 1100) pings.push(pu);
        ctx.clearRect(0, 0, cv.width, cv.height);
        var hov = M.hover, sel = A.uf, byUf = {}, ufList = [];
        for (var i = 0; i < n; i++) {
          var j = i * 4, tq = t - M.delay[i], k = reduce ? 1 : Math.max(0, Math.min(1, tq / 700)), sc = 1;
          k = k * k * (3 - 2 * k);
          if (M.pop[i] && !reduce) {
            // nasce pequeno, passa um pouco do tamanho e assenta (easeOutBack)
            if (tq < 0) k = 0; else { var qq = Math.min(1, tq / 620) - 1; k = 1; sc = 0.2 + 0.8 * (1 + 3.2 * qq * qq * qq + 2.2 * qq * qq); }
          }
          if (!reduce) {
            if (pings.length && M.flash[M.uf[i]] && t - M.flash[M.uf[i]].t < 1100) {
              // onda que sai do centro do estado quando chegam votos novos
              var ag = t - M.flash[M.uf[i]].t, dd = Math.abs(M.dn[i] - ag / 950);
              if (dd < 0.1) sc *= 1 + 1.1 * (1 - dd / 0.1) * (1 - ag / 1100);
            }
          }
          var r = M.from[j] + (M.to[j] - M.from[j]) * k, g = M.from[j + 1] + (M.to[j + 1] - M.from[j + 1]) * k, b = M.from[j + 2] + (M.to[j + 2] - M.from[j + 2]) * k, a = M.from[j + 3] + (M.to[j + 3] - M.from[j + 3]) * k;
          M.cur[j] = r; M.cur[j + 1] = g; M.cur[j + 2] = b; M.cur[j + 3] = a;
          var u = M.uf[i], dim = ((hov && u !== hov) || (sel && sel !== "zz" && u !== sel && !hov) ? 0.35 : 1) * (M.minor[i] ? 0.78 : 1);
          // cores agrupadas (levemente arredondadas): um único preenchimento por cor deixa o mapa leve mesmo com milhares de pontos
          var key = "rgba(" + ((r / 6 | 0) * 6) + "," + ((g / 6 | 0) * 6) + "," + ((b / 6 | 0) * 6) + "," + (Math.round(Math.min(1, a) * dim * 20) / 20) + ")" + "@" + Math.round(sc * 10) + (u === hov ? "h" : M.minor[i] ? "m" : "");
          var ub = byUf[u]; if (!ub) { ub = byUf[u] = { b: {}, k: [] }; ufList.push(u); }
          var bk = ub.b[key]; if (!bk) { bk = ub.b[key] = []; ub.k.push(key); }
          bk.push(i);
        }
        for (var e = 0; e < ufList.length; e++) {
          var ufe = ufList[e], ub2 = byUf[ufe], cp = M.clip[ufe];
          ctx.save();
          if (cp) { ctx.setTransform(s, 0, 0, s, M.ox, M.oy); ctx.clip(cp); ctx.setTransform(1, 0, 0, 1, 0, 0); }
          for (var q = 0; q < ub2.k.length; q++) {
            var key2 = ub2.k[q], list = ub2.b[key2], last1 = key2.charAt(key2.length - 1), at = key2.indexOf("@"), rr = rad * (last1 === "h" ? 1.25 : last1 === "m" ? 0.86 : 1) * parseInt(key2.slice(at + 1), 10) / 10;
            ctx.fillStyle = key2.slice(0, at);
            ctx.beginPath();
            for (var z = 0; z < list.length; z++) {
              var w = list[z], x = M.ox + M.x[w] * s + amp * Math.sin(tt * M.f1[w] + M.ph1[w]), y = M.oy + M.y[w] * s + amp * Math.cos(tt * M.f2[w] + M.ph2[w]);
              ctx.moveTo(x + rr, y); ctx.arc(x, y, rr, 0, 6.2832);
            }
            ctx.fill();
          }
          ctx.restore();
        }
        // clarão no contorno do estado que acabou de receber votos
        for (var fu in M.flash) {
          var fl = M.flash[fu], age = t - fl.t;
          if (age > 1800 || !M.clip[fu]) { delete M.flash[fu]; continue; }
          var al = 0.85 * (1 - age / 1800);
          ctx.save(); ctx.setTransform(s, 0, 0, s, M.ox, M.oy);
          ctx.strokeStyle = "rgba(" + (fl.c[0] | 0) + "," + (fl.c[1] | 0) + "," + (fl.c[2] | 0) + "," + al.toFixed(3) + ")";
          ctx.lineWidth = (1.2 + 2.2 * (1 - age / 1800)) * M.dpr / s; ctx.lineJoin = "round";
          ctx.stroke(M.clip[fu]); ctx.restore();
        }
      }
      requestAnimationFrame(frame);
    }
    function renderMap() {
      buildMap(); if (!A.built) return;
      $("mapModes").querySelector('[data-mode="mud"]').hidden = A.turno !== "2";
      if (A.turno !== "2" && A.mode === "mud") A.mode = "votos";
      segSet($("mapModes"), "mode", A.mode);
      targetsFor();
      $("brMap").querySelectorAll("#mapHits path").forEach(function (p) { p.classList.toggle("sel", A.uf === p.dataset.uf); });
      $("zzBtn").setAttribute("aria-pressed", String(A.uf === "zz"));
      var o = order1T(), lg = "";
      function nm(n) { var c = (A.t1.br.c.filter(function (x) { return x.n === n; })[0]) || { n: n, nm: "" }; return esc(displayName(c)); }
      var two = [o[0], o[1]].map(function (n) { return '<span><span class="sw" style="background:' + colorOf(n) + '"></span>' + nm(n) + "</span>"; }).join("");
      if (A.mode === "votos") lg = two + "<span>Cada ponto é um pedaço da população. Cada estado se acende do centro para as bordas conforme as urnas são apuradas, e as cores se misturam na proporção exata dos votos de cada candidato ali.</span>";
      else if (A.mode === "lider") lg = two + "<span>Os pontos acesos ficam na cor de quem lidera no estado.</span>";
      else if (A.mode === "apurado") lg = "<span>Pontos acesos = proporção das seções já apuradas em cada estado.</span>";
      else if (A.mode === "comp") lg = "<span>Pontos acesos = proporção dos eleitores que foram votar.</span>";
      else lg = '<span><span class="sw" style="background:' + colorOf(o[0]) + '"></span>Melhorou para ' + nm(o[0]) + '</span><span><span class="sw" style="background:' + colorOf(o[1]) + '"></span>Melhorou para ' + nm(o[1]) + "</span><span>Mais pontos acesos, maior a mudança desde o 1º turno.</span>";
      $("mapLegend").innerHTML = lg;
    }
    function select(uf) {
      A.uf = A.uf === uf ? null : uf;
      renderMap(); renderPanel();
      if (window.innerWidth < 900 && A.uf) $("statePanel").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }

    /* ---- painel do estado ---- */
    function cRows(cs, colorFn, limit, gov) {
      return cs.slice(0, limit || cs.length).map(function (c) {
        return '<div class="cRow" style="--c:' + colorFn(c) + '">' + photo(c.sq) + '<div style="min-width:0"><b>' + esc(displayName(c, gov)) + '</b> <span class="num">' + esc(c.n) + '</span><div class="small muted">' + n2(c.v) + " votos</div></div>" +
          '<span class="p">' + pc(c.p) + '</span><div class="bar"><i style="width:' + c.p + '%"></i></div></div>';
      }).join("");
    }
    function renderPanel() {
      var d = dataT(); if (!d) return;
      var uf = A.uf || "br", r = uf === "br" ? d.br : d.ufs[uf];
      if (!r) { $("statePanel").innerHTML = '<p class="muted">Sem dados para este local.</p>'; return; }
      var cs = A.turno === "2" ? sorted2T(r.c) : r.c;
      var mine = load("fdr.uf");
      var h = '<p class="eyebrow">' + (uf === "br" ? "Brasil inteiro · toque em um estado" : uf === mine ? "Seu estado" : "Estado selecionado") + "</p><h3>" + esc(UFN[uf]) + "</h3>" +
        (uf !== "br" ? '<p style="margin-top:6px"><button type="button" class="linkbtn" data-mine="' + uf + '" style="padding:2px 0">' + (uf === mine ? "Deixar de fixar como meu estado" : "Fixar como meu estado") + "</button></p>" : "") +
        '<p class="small muted" style="margin-top:4px">' + pc(r.s.p) + " das seções apuradas (" + n2(r.s.a) + " de " + n2(r.s.t) + ")" + (r.ht ? " · TSE às " + esc(r.ht) : "") + '</p><div class="progRing"><i style="width:' + r.s.p + '%"></i></div>' +
        cRows(cs, function (c) { return colorOf(c.n); }, A.turno === "1" ? 5 : 2);
      if (A.turno === "1" && r.c.length > 5) h += '<p class="small muted" style="margin-top:10px">Outros ' + (r.c.length - 5) + " candidatos: " + pc(r.c.slice(5).reduce(function (s, c) { return s + c.p; }, 0)) + "</p>";
      h += '<div class="kv"><span>Eleitorado</span><span>' + n2(r.el) + "</span><span>Comparecimento</span><span>" + pc(r.pcomp) + "</span><span>Abstenção</span><span>" + pc(r.pabst) + "</span><span>Brancos</span><span>" + pc(r.pvb) + "</span><span>Nulos</span><span>" + pc(r.pvn) + "</span></div>";
      if (A.turno === "2" && A.t1) {
        var t1 = uf === "br" ? A.t1.br : A.t1.ufs[uf], o = order1T();
        if (t1) {
          var a = t1.c.filter(function (c) { return c.n === o[0]; })[0], b = t1.c.filter(function (c) { return c.n === o[1]; })[0];
          if (a && b) h += '<p class="small" style="margin-top:16px"><b>No 1º turno aqui:</b> ' + esc(displayName(a)) + " " + pc(a.p, 1) + " · " + esc(displayName(b)) + " " + pc(b.p, 1) + " · outros " + pc(Math.max(0, 100 - a.p - b.p), 1) + "</p>";
        }
      }
      if (A.turno === "2" && A.live && A.live.gov && A.live.gov[uf]) {
        var g = A.live.gov[uf], gc = g.c.slice().sort(function (x, y) { return Number(x.n) - Number(y.n); });
        h += '<p style="margin-top:18px"><button type="button" class="linkbtn" data-gotogov="' + uf + '">Ver o 2º turno para governador ›</button></p>';
      }
      $("statePanel").innerHTML = h;
    }

    /* ---- regiões, evolução, tabela, governadores, checagens ---- */
    function renderRegions() {
      var d = dataT(); if (!d) return; var o = order1T();
      $("regions").innerHTML = REG.map(function (rg) {
        var tot = {}, vv = 0, sa = 0, st = 0;
        rg[1].forEach(function (uf) { var r = d.ufs[uf]; if (!r) return; vv += r.vv; sa += r.s.a; st += r.s.t; r.c.forEach(function (c) { tot[c.n] = (tot[c.n] || 0) + c.v; }); });
        var a = vv ? (tot[o[0]] || 0) / vv * 100 : 0, b = vv ? (tot[o[1]] || 0) / vv * 100 : 0, rest = vv ? Math.max(0, 100 - a - b) : 0;
        return '<div class="region"><b>' + rg[0] + '</b><span class="small muted"> · ' + (st ? pc(sa / st * 100, 1) : "0%") + ' apurado</span><div class="bar2"><span style="width:' + a + '%;background:' + colorOf(o[0]) + '"></span><span style="width:' + rest + '%;background:var(--cO)"></span><span style="width:' + b + '%;background:' + colorOf(o[1]) + '"></span></div>' +
          '<div class="nums"><span>' + esc(displayName({ n: o[0], nm: "" })) + " " + pc(a, 1) + "</span><span>" + esc(displayName({ n: o[1], nm: "" })) + " " + pc(b, 1) + "</span></div></div>";
      }).join("");
    }
    /* ---- gráfico da evolução na tela principal ---- */
    A.tlx = "s";
    function histAll() {
      // junta o histórico desta sessão com o publicado pelo robô (mais completo), sem repetir boletins
      var by = {};
      [(A.fileHist || []), ((A.live && A.live.hist) || [])].forEach(function (hs) { hs.forEach(function (p) { if (p && p.c && p.s > 0) by[p.h + "|" + p.s.toFixed(3)] = p; }); });
      return Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return a.s - b.s || (a.h < b.h ? -1 : 1); });
    }
    function hsec(h) { var m = /^(\d+):(\d+):?(\d+)?/.exec(h || ""); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+(m[3] || 0)) : 0; }
    function renderTimelineMain() {
      var sec = $("tlMain"), svg = $("tlSvg"); if (!sec) return;
      var hs = histAll(), show = A.turno === "2" && !govMode() && hs.length >= 2;
      sec.hidden = !show; if (!show) return;
      var o = order1T(), W = 760, H = 320, L = 46, Rr = 54, T = 16, B = 36, byTime = A.tlx === "h";
      if (byTime) hs = hs.slice().sort(function (a, b) { return hsec(a.h) - hsec(b.h); });
      var vals = []; hs.forEach(function (p) { o.forEach(function (n) { if (p.c[n] != null) vals.push(p.c[n]); }); });
      var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
      var lo = Math.floor(Math.min(47, mn - 1)), hi = Math.ceil(Math.max(53, mx + 1));
      var t0 = hsec(hs[0].h), t1 = Math.max(t0 + 600, hsec(hs[hs.length - 1].h));
      function X(p) { return byTime ? L + (hsec(p.h) - t0) / (t1 - t0) * (W - L - Rr) : L + p.s / 100 * (W - L - Rr); }
      function Y(v) { return T + (hi - v) / (hi - lo) * (H - T - B); }
      function Ys(v) { return T + (100 - v) / 100 * (H - T - B); }
      var g = ['<g class="tlGrid">'];
      if (byTime) {
        for (var t = Math.ceil(t0 / 1800) * 1800; t <= t1; t += 1800) { var x = L + (t - t0) / (t1 - t0) * (W - L - Rr); g.push('<line x1="' + x + '" y1="' + T + '" x2="' + x + '" y2="' + (H - B) + '"/><text x="' + x + '" y="' + (H - B + 20) + '" text-anchor="middle">' + Math.floor(t / 3600) + "h" + String(Math.floor(t % 3600 / 60)).padStart(2, "0") + "</text>"); }
        // seções apuradas ao longo do tempo (área clara, eixo da direita)
        g.push('<path class="tlArea" d="M' + X(hs[0]).toFixed(1) + "," + Ys(0) + hs.map(function (p) { return "L" + X(p).toFixed(1) + "," + Ys(p.s).toFixed(1); }).join("") + "L" + X(hs[hs.length - 1]).toFixed(1) + "," + Ys(0) + 'Z"/>');
        for (var q = 0; q <= 100; q += 100) g.push('<text class="tlR" x="' + (W - Rr + 8) + '" y="' + (Ys(q) + 4) + '">' + q + "%</text>");
      } else {
        for (var sx = 0; sx <= 100; sx += 25) { var xx = L + sx / 100 * (W - L - Rr); g.push('<line x1="' + xx + '" y1="' + T + '" x2="' + xx + '" y2="' + (H - B) + '"/><text x="' + xx + '" y="' + (H - B + 20) + '" text-anchor="middle">' + sx + "%</text>"); }
      }
      var step = hi - lo > 16 ? 5 : hi - lo > 8 ? 2 : 1;
      for (var v = Math.ceil(lo / step) * step; v <= hi; v += step) g.push('<text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + "%</text>");
      g.push('<line class="tl50" x1="' + L + '" y1="' + Y(50) + '" x2="' + (W - Rr) + '" y2="' + Y(50) + '"/>');
      g.push('<text x="' + (W - Rr) + '" y="' + (H - 4) + '" text-anchor="end">' + (byTime ? "horário de Brasília · área cinza: seções apuradas" : "seções apuradas") + "</text></g>");
      var last = hs[hs.length - 1];
      // no eixo de horário, intervalos longos sem boletim (ex.: contagem suspensa) não são ligados por linha
      var gaps = [];
      if (byTime) for (var k = 1; k < hs.length; k++) if (hsec(hs[k].h) - hsec(hs[k - 1].h) > 900) gaps.push(k);
      gaps.forEach(function (k) { var x0 = X(hs[k - 1]), x1 = X(hs[k]); g.push('<rect class="tlGap" x="' + x0.toFixed(1) + '" y="' + T + '" width="' + (x1 - x0).toFixed(1) + '" height="' + (H - T - B) + '"/><text class="tlGapT" x="' + ((x0 + x1) / 2).toFixed(1) + '" y="' + (T + 16) + '" text-anchor="middle">sem boletins</text>'); });
      var labs = [];
      o.forEach(function (n) {
        var col = colorOf(n), segs = [[]];
        hs.forEach(function (p, k) { if (gaps.indexOf(k) >= 0) segs.push([]); if (p.c[n] != null) segs[segs.length - 1].push(X(p).toFixed(1) + "," + Y(p.c[n]).toFixed(1)); });
        segs.forEach(function (pts) { if (pts.length) g.push('<polyline class="tlLine" points="' + pts.join(" ") + '" stroke="' + col + '"/>'); });
        if (last.c[n] != null) { g.push('<circle cx="' + X(last).toFixed(1) + '" cy="' + Y(last.c[n]).toFixed(1) + '" r="5" fill="' + col + '" class="tlDot"/>'); labs.push({ y: Y(last.c[n]), v: last.c[n], col: col }); }
      });
      // rótulos finais afastados para não se sobreporem
      labs.sort(function (a, b) { return a.y - b.y; });
      for (var li = 1; li < labs.length; li++) if (labs[li].y - labs[li - 1].y < 16) { var mid = (labs[li].y + labs[li - 1].y) / 2; labs[li - 1].y = mid - 8; labs[li].y = mid + 8; }
      labs.forEach(function (lb) { g.push('<text class="tlVal" x="' + Math.min(X(last) + 9, W - Rr + 4) + '" y="' + (lb.y + 4).toFixed(1) + '" fill="' + lb.col + '">' + lb.v.toFixed(1).replace(".", ",") + "%</text>"); });
      g.push('<line class="tlCross" id="tlCross" x1="0" y1="' + T + '" x2="0" y2="' + (H - B) + '" visibility="hidden"/>');
      svg.innerHTML = g.join("");
      svg._tl = { hs: hs, X: X, Y: Y, o: o, W: W };
    }
    function tlPointer(ev) {
      var svg = $("tlSvg"), st = svg._tl, tip = $("tlTip"); if (!st) return;
      var r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * st.W, best = null, bd = 1e9;
      st.hs.forEach(function (p) { var d = Math.abs(st.X(p) - x); if (d < bd) { bd = d; best = p; } });
      if (!best) return;
      var cr = $("tlCross"); cr.setAttribute("x1", st.X(best)); cr.setAttribute("x2", st.X(best)); cr.setAttribute("visibility", "visible");
      tip.innerHTML = "<b>" + esc(best.h) + '</b> · <span class="muted">' + pc(best.s, 1) + " apurado</span>" + st.o.map(function (n) {
        var c = (A.live.br.c.filter(function (y) { return y.n === n; })[0]) || { n: n };
        return best.c[n] == null ? "" : '<div class="tipRow"><i style="background:' + colorOf(n) + '"></i>' + esc(displayName(c)) + "<span>" + pc(best.c[n]) + "</span></div>";
      }).join("");
      tip.hidden = false;
      var px = st.X(best) / st.W * r.width, w = tip.offsetWidth || 180;
      tip.style.transform = "translate(" + Math.max(0, Math.min(r.width - w, px - w / 2)) + "px,0)";
    }
    $("tlSvg").addEventListener("pointermove", tlPointer);
    $("tlSvg").addEventListener("pointerdown", tlPointer);
    $("tlSvg").addEventListener("pointerleave", function () { $("tlTip").hidden = true; var cr = $("tlCross"); if (cr) cr.setAttribute("visibility", "hidden"); });
    // o histórico publicado pelo robô (mais completo) é relido a cada 2 minutos
    setInterval(function () { if (!document.hidden && A.turno === "2") pullFile().then(function (j) { if (j && j.hist && j.hist.length) { A.fileHist = j.hist; renderTimelineMain(); renderTimeline(); } }).catch(function () {}); }, 120000);

    function renderTimeline() {
      var sec = $("timelineSec"), svg = $("timeline");
      sec.hidden = A.turno !== "2";
      if (A.turno !== "2") return;
      var hs = histAll(), o = order1T();
      var W = 720, H = 300, L = 44, R = 16, T = 14, B = 34;
      if (hs.length < 2) { svg.innerHTML = '<text x="' + W / 2 + '" y="' + H / 2 + '" text-anchor="middle" style="font-size:14px">O gráfico aparece quando os primeiros votos forem apurados.</text>'; return; }
      var vals = []; hs.forEach(function (p) { o.forEach(function (n) { if (p.c[n] != null) vals.push(p.c[n]); }); });
      var lo = Math.min(45, Math.floor(Math.min.apply(null, vals) - 1)), hi = Math.max(55, Math.ceil(Math.max.apply(null, vals) + 1));
      function X(s) { return L + s / 100 * (W - L - R); }
      function Y(v) { return T + (hi - v) / (hi - lo) * (H - T - B); }
      var g = [];
      for (var s = 0; s <= 100; s += 25) g.push('<line x1="' + X(s) + '" y1="' + T + '" x2="' + X(s) + '" y2="' + (H - B) + '" stroke="var(--hair)"/><text x="' + X(s) + '" y="' + (H - B + 18) + '" text-anchor="middle">' + s + "%</text>");
      var step = hi - lo > 20 ? 10 : 5;
      for (var v = Math.ceil(lo / step) * step; v <= hi; v += step) g.push('<text x="' + (L - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + v + "%</text>");
      g.push('<line x1="' + L + '" y1="' + Y(50) + '" x2="' + (W - R) + '" y2="' + Y(50) + '" stroke="var(--muted)" stroke-dasharray="4 5"/>');
      g.push('<text x="' + (W - R) + '" y="' + (H - 4) + '" text-anchor="end">seções apuradas</text>');
      o.forEach(function (n, i) {
        var pts = hs.filter(function (p) { return p.c[n] != null; }).map(function (p) { return X(p.s).toFixed(1) + "," + Y(p.c[n]).toFixed(1); });
        var col = colorOf(n), last = hs[hs.length - 1];
        g.push('<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + col + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>');
        if (last.c[n] != null) g.push('<circle cx="' + X(last.s) + '" cy="' + Y(last.c[n]) + '" r="4.5" fill="' + col + '"/><text x="' + Math.min(X(last.s) + 8, W - R - 60) + '" y="' + (Y(last.c[n]) - 8) + '" style="font-weight:700;fill:' + col + '">' + pc(last.c[n], 1) + "</text>");
      });
      svg.innerHTML = g.join("");
    }
    function renderTable() {
      var d = dataT(); if (!d) return; var o = order1T();
      var rows = Object.keys(d.ufs).map(function (uf) {
        var r = d.ufs[uf], a = r.c.filter(function (c) { return c.n === o[0]; })[0] || { p: 0 }, b = r.c.filter(function (c) { return c.n === o[1]; })[0] || { p: 0 };
        return { uf: uf, nome: UFN[uf], ap: r.s.p, a: a.p, b: b.p, m: a.p - b.p, comp: r.pcomp, lead: r.s.a ? r.c[0] : null };
      });
      var k = A.sort, dir = A.sortDir;
      rows.sort(function (x, y) { var p = x[k], q = y[k]; return (typeof p === "string" ? p.localeCompare(q) : p - q) * dir; });
      var nA = esc(displayName({ n: o[0], nm: "" })), nB = esc(displayName({ n: o[1], nm: "" }));
      function th(key, label) { return '<th><button type="button" data-sort="' + key + '">' + label + (A.sort === key ? (A.sortDir > 0 ? " ↑" : " ↓") : "") + "</button></th>"; }
      $("ufTable").innerHTML = "<thead><tr>" + th("nome", "Estado") + th("ap", "Apurado") + th("a", nA) + th("b", nB) + th("m", "Margem") + th("comp", "Comparecimento") + "</tr></thead><tbody>" +
        rows.map(function (r) {
          return '<tr data-uf="' + r.uf + '"><td><b>' + esc(r.nome) + '</b></td><td class="tab"><span class="mini"><i style="width:' + r.ap + '%"></i></span>' + pc(r.ap, 1) + '</td><td class="tab" style="color:' + colorOf(o[0]) + ';font-weight:600">' + pc(r.a, 1) + '</td><td class="tab" style="color:' + colorOf(o[1]) + ';font-weight:600">' + pc(r.b, 1) + '</td><td class="tab">' + (r.lead ? (r.m >= 0 ? nA : nB) + " +" + pc(Math.abs(r.m), 1) : "—") + '</td><td class="tab">' + pc(r.comp, 1) + "</td></tr>";
        }).join("") + "</tbody>";
    }
    function renderGov() {
      var sec = $("govSec"), ok = A.turno === "2" && A.live && A.live.gov && Object.keys(A.live.gov).length;
      $("apTabs").querySelector('[data-aptab="governadores"]').hidden = !ok;
      if (!ok) { if (A.tab === "governadores") setTab("mapa"); return; }
      var ufs = Object.keys(A.live.gov).sort(function (a, b) { return UFN[a].localeCompare(UFN[b]); });
      if (!A.gov || ufs.indexOf(A.gov) < 0) A.gov = ufs.indexOf(A.uf) >= 0 ? A.uf : ufs[0];
      $("govChips").innerHTML = ufs.map(function (uf) { return '<button type="button" data-gov="' + uf + '" aria-pressed="' + (uf === A.gov) + '">' + UFN[uf] + "</button>"; }).join("");
      var g = A.live.gov[A.gov], gc = g.c.slice().sort(function (x, y) { return Number(x.n) - Number(y.n); });
      if (govMode()) { GV.render(A.gov, g); return; }
      if (g.s.a > 0) gc.sort(function (x, y) { return y.v - x.v; });
      var extra = g.s.a > 0 && g.pcomp != null ? '<p class="small muted govStats">Comparecimento ' + pc(g.pcomp) + (g.pvb != null ? " · brancos " + pc(g.pvb) : "") + (g.pvn != null ? " · nulos " + pc(g.pvn) : "") + "</p>" : "";
      $("govGrid").innerHTML = '<div class="govCard govOne"><p class="eyebrow">' + esc(UFN[A.gov]) + '</p><p class="small muted">' + (g.s.a > 0 ? pc(g.s.p, 1) + " das seções apuradas" + (g.ht ? " · TSE às " + esc(g.ht) : "") : "Nenhuma seção apurada ainda. Os números aparecem aqui assim que o TSE publicar.") + '</p><div class="progRing"><i style="width:' + g.s.p + '%"></i></div>' +
        cRows(gc, function (c) { return sgColor(c.sg); }, 0, true) + extra + "</div>";
    }
    function renderChecks() {
      var d = dataT(); if (!d) return;
      $("checksList").innerHTML = (d.checks || []).map(function (c) { return "<li><span class=\"" + (c.ok ? "ok" : "no") + '">' + (c.ok ? "✓" : "✗") + "</span><span>" + esc(c.txt) + "</span></li>"; }).join("") || '<li class="muted">Sem dados.</li>';
    }
    function setTab(t) {
      A.tab = t;
      $("apTabs").querySelectorAll("[data-aptab]").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.aptab === t)); });
      document.querySelectorAll("#v-apuracao .apPanel").forEach(function (p) { p.hidden = p.dataset.panel !== t; });
    }
    /* ---- tela de espera (2º turno antes da primeira seção apurada) ---- */
    var OPEN = Date.UTC(2026, 9, 25, 11, 0, 0); // 8h em Brasília
    function isWaiting() { return A.turno === "2" && (!A.live || !A.live.br || !A.live.br.s.a); }
    function digits(el, v) {
      var str = String(v).padStart(2, "0");
      if (el.dataset.v === str) return;
      var old = el.dataset.v || "", h = "";
      for (var i = 0; i < str.length; i++) h += '<span' + (old && old.charAt(i) !== str.charAt(i) ? ' class="in"' : "") + ">" + str.charAt(i) + "</span>";
      el.innerHTML = h; el.dataset.v = str;
    }
    function tickWait() {
      if (!isWaiting()) return;
      var now = Date.now(), left = Math.max(0, START - now), closed = left <= 0;
      $("awClock").hidden = closed; $("awLead").textContent = closed ? "Urnas fechadas" : "A apuração começa em";
      $("awWaiting").hidden = !closed;
      $("awSub").textContent = closed ? "Assim que o TSE publicar o primeiro boletim, o placar e o mapa aparecem aqui sozinhos. Não precisa recarregar a página." : "Todas as urnas do país fecham às 17h, horário de Brasília. Os números começam a chegar logo depois, direto dos arquivos oficiais do TSE.";
      var st = $("awStatus"); st.classList.toggle("closed", closed);
      st.lastChild.textContent = closed ? "Votação encerrada às 17h" : now < OPEN ? "As urnas abrem às 8h" : "Votação em andamento";
      if (!closed) {
        var sec = Math.floor(left / 1000);
        digits($("awH"), Math.floor(sec / 3600)); digits($("awM"), Math.floor(sec / 60) % 60); digits($("awS"), sec % 60);
      } else {
        $("awWaitTxt").textContent = A.lastCheck ? "Última verificação às " + new Date(A.lastCheck).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" }) + " · verifica a cada 5 segundos" : "";
      }
      var f = Math.max(0, Math.min(1, (now - OPEN) / (START - OPEN)));
      $("awFill").style.width = (f * 100).toFixed(2) + "%"; $("awNow").style.left = (f * 100).toFixed(2) + "%";
    }
    function renderWait() {
      var t1 = A.t1 && A.t1.br; if (!t1) return;
      var o = order1T(), cs = o.map(function (n) { return t1.c.filter(function (c) { return c.n === n; })[0]; }).filter(Boolean);
      function card(c) {
        var info = candInfo(c.n), sg = c.sg || (info && info.partido) || "";
        return '<div class="awCand" style="--c:' + colorOf(c.n, c.sg) + '"><span class="awPh"><img src="fotos/' + esc(c.sq) + '.jpeg" alt="" onerror="this.remove()"></span>' +
          "<h3>" + esc(displayName(c)) + '</h3><span class="awParty">' + esc((sg ? sg + " · " : "") + c.n) + '</span><span class="awT1">1º turno: ' + pc(c.p) + "</span></div>";
      }
      if (cs.length >= 2) $("awDuel").innerHTML = card(cs[0]) + '<span class="awVs" aria-label="contra">×</span>' + card(cs[1]);
      var gov = A.live && A.live.gov ? Object.keys(A.live.gov) : [];
      var dif = cs.length >= 2 ? Math.abs(cs[0].p - cs[1].p) : 0;
      function fact(b, sp) { return '<div class="awFact"><b>' + b + "</b><span>" + sp + "</span></div>"; }
      $("awFacts").innerHTML = fact(n2(t1.el), "eleitores aptos a votar") + fact(n2(t1.s.t), "seções eleitorais") +
        fact(String(dif.toFixed(2)).replace(".", ",") + " pontos", "de diferença no 1º turno") +
        fact(gov.length + " estados", "também escolhem governador: " + gov.map(function (u) { return u.toUpperCase(); }).join(" · "));
      var gl = A.live && A.live.gov ? Object.keys(A.live.gov).sort(function (a, b) { return UFN[a].localeCompare(UFN[b]); }) : [];
      $("awGov").hidden = !gl.length;
      $("awGovList").innerHTML = gl.map(function (uf) {
        var cs = A.live.gov[uf].c.slice().sort(function (x, y) { return Number(x.n) - Number(y.n); });
        return '<li data-govgo="' + uf + '" role="button" tabindex="0"><b>' + esc(UFN[uf]) + "</b><span>" + cs.map(function (c) { return '<span class="gc"><i style="--c:' + sgColor(c.sg) + '"></i>' + esc(displayName(c, true)) + ' <small>' + esc(c.n) + "</small></span>"; }).join('<em>×</em>') + "</span></li>";
      }).join("");
      tickWait();
    }
    function render() {
      if (!A.live && !A.t1) return;
      if (!A.t1) { A.t1 = A.live; }
      var gm = govMode(), waiting = !gm && isWaiting(), v = $("v-apuracao"), was = v.classList.contains("apWaiting");
      v.classList.toggle("apGovMode", gm);
      if (gm && A.tab !== "governadores") setTab("governadores");
      if (!gm && A.tab === "governadores" && A.cargoWas === "gov") setTab("mapa");
      A.cargoWas = A.cargo;
      v.classList.toggle("apWaiting", waiting); $("apWait").hidden = !waiting;
      if (was && !waiting) { v.classList.remove("apGoLive"); void v.offsetWidth; v.classList.add("apGoLive"); }
      if (waiting) renderWait();
      renderHeader(); renderDuel(); renderStats(); renderNeed(); renderMap(); renderPanel(); renderRegions(); renderTimeline(); renderTimelineMain(); renderTable(); renderGov(); renderChecks();
    }
    $("awCal").addEventListener("click", function () {
      var url = "https://foradareta.com.br/";
      var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fora da Reta//PT-BR", "BEGIN:VEVENT", "UID:apuracao-2t-2026@foradareta.com.br", "DTSTAMP:20261025T120000Z",
        "DTSTART:20261025T200000Z", "DTEND:20261025T230000Z", "SUMMARY:Apuração do 2º turno (Fora da Reta)", "DESCRIPTION:Acompanhe a apuração ao vivo: " + url, "URL:" + url,
        "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:A apuração começa em 10 minutos", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" })); a.download = "apuracao-2-turno.ics";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    });
    $("awShare").addEventListener("click", function () {
      var url = "https://foradareta.com.br/", b = $("awShare");
      var data = { title: "Fora da Reta · Apuração ao vivo", text: "Apuração do 2º turno ao vivo, com mapa e dados oficiais do TSE.", url: url };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = "Link copiado"; setTimeout(function () { b.textContent = "Compartilhar"; }, 2200); }, function () { prompt("Copie o link:", url); });
    });
    setInterval(function () { if (!$("v-apuracao").hidden) tickWait(); }, 1000);

    /* ---- governador: tela detalhada do estado, com mapa e votação por município ---- */
    var GV = (function () {
      var S = { uf: null, maps: {}, mun: null, res: {}, st: {}, sel: null, q: "", sort: "lead", busy: false, last: 0 };
      function jget(u) { return fetch(u, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
      function munList(uf) { var m = S.mun && S.mun.abr.filter(function (a) { return a.cd === uf; })[0]; return m ? m.mu : []; }
      function nome(mu) { var mp = S.maps[S.uf]; return (mp && mp.mun[mu.cdi] && mp.mun[mu.cdi].n) || titleCase(mu.nm); }
      function ensure(uf) {
        var ps = [];
        if (!S.mun) ps.push(jget("mun_gov.json").then(function (j) { S.mun = j; }));
        if (!S.maps[uf]) ps.push(jget("mapas/gov-" + uf + ".json").then(function (j) { S.maps[uf] = j; }));
        return Promise.all(ps);
      }
      // lê o resumo do estado (andamento por município) e só baixa de novo os municípios que mudaram
      function poll(force) {
        var uf = S.uf; if (!uf || S.busy || !A.live || !A.live.direto && A.direct === false) return;
        if (!force && Date.now() - S.last < 9000) return;
        S.busy = true; S.last = Date.now();
        var t = "?t=" + Math.floor(Date.now() / 5000);
        jget(TSE + "6260/dados/" + uf + "/" + uf + "-e006260-ab.json" + t).then(function (ab) {
          var need = [], st = S.st[uf] = S.st[uf] || {}, res = S.res[uf] = S.res[uf] || {};
          (ab.abr || []).forEach(function (a) { var k = a.cdabr, n = Number(a.s && a.s.st || 0); if (n > 0 && (st[k] !== n || !res[k])) need.push([k, n]); });
          var i = 0;
          function worker() {
            if (i >= need.length) return Promise.resolve();
            var it = need[i++];
            return jget(TSE + "6260/dados/" + uf + "/" + uf + it[0] + "-c0003-e006260-u.json" + t).then(function (j) { res[it[0]] = compactTSE(j); st[it[0]] = it[1]; }, function () {}).then(worker);
          }
          return Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]).then(function () { if (need.length && S.uf === uf) paint(); });
        }).catch(function () {}).then(function () { S.busy = false; });
      }
      function cands(g) { return g.c.slice().sort(function (x, y) { return Number(x.n) - Number(y.n); }); }
      function shell(uf, g) {
        var mp = S.maps[uf], box = $("govGrid");
        var paths = mp ? Object.keys(mp.mun).map(function (id) { return '<path d="' + mp.mun[id].d + '" data-mi="' + id + '"></path>'; }).join("") : "";
        box.innerHTML = '<div class="gvDuel" id="gvDuel"></div><div class="splitBar" id="gvBar" aria-hidden="true"></div><div class="splitMeta" id="gvMeta"></div><div class="gvStats" id="gvStats"></div>' +
          '<div class="gvMain"><div class="gvMapBox"><p class="eyebrow">Mapa por município</p><p class="small muted" id="gvLegend"></p>' +
          '<div class="gvMapWrap"><svg id="gvMap" viewBox="' + (mp ? mp.vb : "0 0 600 400") + '" role="img" aria-label="Mapa de ' + esc(UFN[uf]) + ' por município">' + paths + '</svg><div class="mapTip" id="gvTip" hidden></div></div>' +
          '<p class="small muted" style="margin-top:8px">Cor de quem lidera em cada município; quanto mais forte, maior a vantagem. Cinza: ainda sem votos apurados.</p></div>' +
          '<div class="gvSide"><div class="gvMunPanel" id="gvMunPanel"></div><div class="gvCount" id="gvCount"></div></div></div>' +
          '<div class="sec" style="padding-top:36px"><p class="eyebrow">Município por município</p><div class="gvTools"><input type="search" id="gvSearch" placeholder="Buscar município" aria-label="Buscar município"><select id="gvSort" aria-label="Ordenar"><option value="lead">Maior vantagem</option><option value="nome">Nome</option><option value="ap">Mais apurados</option><option value="el">Mais eleitores</option></select></div>' +
          '<div class="scroll"><table class="ptable ufTable" id="gvTable"></table></div></div>';
        var svg = $("gvMap"), tip = $("gvTip");
        svg.addEventListener("pointermove", function (ev) {
          var p = ev.target.closest("path[data-mi]"); if (!p) { tip.hidden = true; return; }
          var r = svg.parentNode.getBoundingClientRect(); tip.innerHTML = tipMun(p.dataset.mi); tip.hidden = false;
          var x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14; if (x + 220 > r.width) x = ev.clientX - r.left - 234;
          tip.style.transform = "translate(" + x + "px," + y + "px)";
        });
        svg.addEventListener("pointerleave", function () { tip.hidden = true; });
        svg.addEventListener("click", function (ev) { var p = ev.target.closest("path[data-mi]"); if (p) { S.sel = S.sel === p.dataset.mi ? null : p.dataset.mi; paint(); } });
        $("gvSearch").addEventListener("input", function (ev) { S.q = ev.target.value; table(); });
        $("gvSort").addEventListener("change", function (ev) { S.sort = ev.target.value; table(); });
        $("gvTable").addEventListener("click", function (ev) { var tr = ev.target.closest("[data-mi]"); if (tr) { S.sel = tr.dataset.mi; paint(); $("gvMap").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); } });
      }
      function byIbge(id) { var mu = munList(S.uf).filter(function (m) { return m.cdi === id; })[0]; return mu; }
      function resOf(mu) { return mu && S.res[S.uf] && S.res[S.uf][mu.cd]; }
      function tipMun(id) {
        var mu = byIbge(id), r = resOf(mu), h = "<b>" + esc(mu ? nome(mu) : id) + "</b>";
        if (!r || !r.s.a) return h + '<div class="small muted">Ainda sem votos apurados</div>';
        return h + '<div class="small muted">' + pc(r.s.p, 1) + " das seções</div>" + cands(r).sort(function (a, b) { return b.v - a.v; }).map(function (c) { return '<div class="tipRow"><i style="background:' + sgColor(c.sg) + '"></i>' + esc(displayName(c, true)) + "<span>" + pc(c.p, 1) + "</span></div>"; }).join("");
      }
      function lead(r) { if (!r || !r.s.a) return null; var cs = r.c.slice().sort(function (a, b) { return b.v - a.v; }); return { c: cs[0], m: cs.length > 1 ? cs[0].p - cs[1].p : 100 }; }
      function paint() {
        var uf = S.uf, g = A.live && A.live.gov && A.live.gov[uf]; if (!g || !$("gvMap")) return;
        var cs = cands(g), count = {}, sem = 0;
        $("gvMap").querySelectorAll("path[data-mi]").forEach(function (p) {
          var mu = byIbge(p.dataset.mi), L = lead(resOf(mu));
          if (!L) { p.style.fill = ""; p.style.fillOpacity = ""; sem++; }
          else { p.style.fill = sgColor(L.c.sg); p.style.fillOpacity = (0.28 + 0.72 * Math.min(1, L.m / 40)).toFixed(2); count[L.c.n] = (count[L.c.n] || 0) + 1; }
          p.classList.toggle("sel", p.dataset.mi === S.sel);
        });
        $("gvCount").innerHTML = '<p class="eyebrow">Onde cada um lidera</p>' + cs.map(function (c) { return '<div class="gvCountRow"><i style="background:' + sgColor(c.sg) + '"></i><b>' + esc(displayName(c, true)) + "</b><span>" + (count[c.n] || 0) + " municípios</span></div>"; }).join("") +
          (sem ? '<div class="gvCountRow"><i style="background:var(--dotOff)"></i><b>Sem votos apurados</b><span>' + sem + "</span></div>" : "");
        $("gvLegend").textContent = UFN[uf] + " · " + Object.keys(S.maps[uf] ? S.maps[uf].mun : {}).length + " municípios";
        panel(); table();
      }
      function panel() {
        var box = $("gvMunPanel"); if (!box) return;
        if (!S.sel) { box.innerHTML = '<p class="small muted">Toque em um município no mapa ou na lista para ver o resultado dele.</p>'; return; }
        var mu = byIbge(S.sel), r = resOf(mu);
        box.innerHTML = '<p class="eyebrow">' + esc(mu ? nome(mu) : "") + '</p>' + (!r || !r.s.a ? '<p class="small muted">Ainda sem votos apurados neste município.</p>' :
          '<p class="small muted">' + pc(r.s.p, 1) + " das seções apuradas" + (r.pcomp != null ? " · comparecimento " + pc(r.pcomp, 1) : "") + "</p>" + cRows(r.c.slice().sort(function (a, b) { return b.v - a.v; }), function (c) { return sgColor(c.sg); }, 0, true));
      }
      function table() {
        var t = $("gvTable"); if (!t) return;
        var q = S.q.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        var rows = munList(S.uf).map(function (mu) { var r = resOf(mu), L = lead(r); return { mu: mu, r: r, L: L, nm: nome(mu) }; })
          .filter(function (x) { return !q || x.nm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").indexOf(q) >= 0; });
        rows.sort(function (a, b) {
          if (S.sort === "nome") return a.nm.localeCompare(b.nm);
          if (S.sort === "ap") return ((b.r && b.r.s.p) || 0) - ((a.r && a.r.s.p) || 0);
          if (S.sort === "el") return ((b.r && b.r.el) || 0) - ((a.r && a.r.el) || 0);
          return ((b.L && b.L.m) || -1) - ((a.L && a.L.m) || -1);
        });
        var g = A.live.gov[S.uf], cs = cands(g);
        t.innerHTML = "<thead><tr><th>Município</th>" + cs.map(function (c) { return "<th>" + esc(displayName(c, true)) + "</th>"; }).join("") + "<th>Apurado</th></tr></thead><tbody>" +
          rows.map(function (x) {
            return '<tr data-mi="' + x.mu.cdi + '"' + (x.mu.cdi === S.sel ? ' class="sel"' : "") + "><td><b>" + esc(x.nm) + "</b></td>" + cs.map(function (c) {
              var v = x.r && x.r.c.filter(function (y) { return y.n === c.n; })[0], isL = x.L && x.L.c.n === c.n;
              return "<td" + (isL ? ' style="font-weight:700;color:' + sgColor(c.sg) + '"' : "") + ">" + (v && x.r.s.a ? pc(v.p, 1) : "–") + "</td>";
            }).join("") + "<td>" + (x.r ? pc(x.r.s.p, 0) : "0%") + "</td></tr>";
          }).join("") + "</tbody>";
      }
      function head(g) {
        var cs = cands(g); if (g.s.a > 0) cs.sort(function (a, b) { return b.v - a.v; });
        $("gvDuel").innerHTML = cs.map(function (c, i) {
          return '<div class="duelCard' + (i ? " right" : "") + '" style="--c:' + sgColor(c.sg) + '">' + photo(c.sq) + '<div style="min-width:0"><p class="nm">' + esc(displayName(c, true)) + ' <span class="num">' + esc(c.n) + '</span></p><p class="small muted">' + esc(c.sg || "") + '</p><p class="pc">' + pc(c.p) + '</p><p class="vt">' + n2(c.v) + " votos</p></div></div>";
        }).join("");
        $("gvBar").innerHTML = cs.map(function (c) { return '<span style="width:' + (g.s.a ? c.p : 50) + "%;background:" + sgColor(c.sg) + (g.s.a ? "" : ";opacity:.25") + '"></span>'; }).join("");
        $("gvMeta").innerHTML = "<span>" + (g.s.a && cs.length > 1 ? "Diferença: " + n2(Math.abs(cs[0].v - cs[1].v)) + " votos (" + pc(Math.abs(cs[0].p - cs[1].p)) + ")" : "Ainda sem votos apurados") + "</span><span>A linha marca 50% dos votos válidos</span>";
        $("gvStats").innerHTML = stat("Seções apuradas", pc(g.s.p), n2(g.s.a) + " de " + n2(g.s.t), g.s.p) +
          (g.s.a ? stat("Comparecimento", pc(g.pcomp), n2(g.comp) + " eleitores") + stat("Brancos", pc(g.pvb), n2(g.vb) + " votos") + stat("Nulos", pc(g.pvn), n2(g.vn) + " votos") : stat("Eleitores", n2(g.el), "aptos a votar"));
      }
      function render(uf, g) {
        if (S.uf !== uf || !$("gvMap")) {
          S.uf = uf; S.sel = null; S.q = "";
          $("govGrid").innerHTML = '<p class="small muted" style="text-align:center;margin-top:24px">Carregando o mapa de ' + esc(UFN[uf]) + "…</p>";
          ensure(uf).then(function () { if (S.uf !== uf) return; shell(uf, g); head(A.live.gov[uf]); paint(); poll(true); });
          return;
        }
        head(g); paint(); poll(false);
      }
      setInterval(function () { if (!document.hidden && govMode() && !$("v-apuracao").hidden) poll(false); }, 10000);
      return { render: render };
    })();

    /* ---- aviso oficial (ex.: prorrogação do horário), lido de aviso.json a cada minuto ---- */
    function pullAviso() {
      fetch("aviso.json?t=" + Math.floor(Date.now() / 30000), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (a) {
        var box = $("apAviso"); if (!box) return;
        if (!a || !a.ativo) { box.hidden = true; return; }
        box.hidden = false;
        box.innerHTML = '<p class="apAvisoT"><i></i>' + esc(a.titulo || "Aviso") + '</p><p>' + esc(a.texto || "") + "</p>" +
          (a.fontes && a.fontes.length ? '<p class="apAvisoF">Fontes: ' + a.fontes.map(function (f) { return '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.nome) + "</a>"; }).join(" · ") + "</p>" : "");
      }).catch(function () {});
    }
    pullAviso(); setInterval(function () { if (!document.hidden) pullAviso(); }, 60000);

    /* ---- eventos e atualização ---- */
    $("apTabs").addEventListener("click", function (ev) { var b = ev.target.closest("[data-aptab]"); if (b) setTab(b.dataset.aptab); });
    $("govGrid").parentNode.addEventListener("click", function (ev) { var b = ev.target.closest("[data-gov]"); if (b) { A.gov = b.dataset.gov; renderGov(); renderHeader(); } });
    $("cargoSeg").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-cargo]"); if (!b) return;
      A.cargo = b.dataset.cargo; render();
    });
    $("awGovList").addEventListener("click", function (ev) {
      var li = ev.target.closest("[data-govgo]"); if (!li) return;
      A.cargo = "gov"; A.gov = li.dataset.govgo; render();
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    $("turnoSeg").addEventListener("click", function (ev) { var b = ev.target.closest("[data-turno]"); if (!b) return; A.turno = b.dataset.turno; A.turnoAuto = false; render(); });
    $("mapModes").addEventListener("click", function (ev) { var b = ev.target.closest("[data-mode]"); if (!b) return; A.mode = b.dataset.mode; renderMap(); });
    $("zzBtn").addEventListener("click", function () { select("zz"); });
    $("statePanel").addEventListener("click", function (ev) {
      var gg = ev.target.closest("[data-gotogov]"); if (gg) { A.gov = gg.dataset.gotogov; setTab("governadores"); renderGov(); $("apTabs").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); return; }
      var b = ev.target.closest("[data-mine]"); if (!b) return;
      var cur = load("fdr.uf"); store("fdr.uf", cur === b.dataset.mine ? null : b.dataset.mine);
      toast(cur === b.dataset.mine ? "Estado desafixado" : "Este estado vai abrir selecionado"); renderPanel();
    });
    $("ufTable").addEventListener("click", function (ev) {
      var s = ev.target.closest("[data-sort]");
      if (s) { if (A.sort === s.dataset.sort) A.sortDir *= -1; else { A.sort = s.dataset.sort; A.sortDir = s.dataset.sort === "nome" ? 1 : -1; } renderTable(); return; }
      var tr = ev.target.closest("tr[data-uf]"); if (tr) { A.uf = null; setTab("mapa"); select(tr.dataset.uf); $("brMap").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); }
    });
    /* leitura direta dos arquivos do TSE (funciona quando o site está no domínio próprio; dentro do artifact o
       navegador bloqueia e o site usa o apuracao.json publicado junto da página) */
    var TSE = "https://resultados.tse.jus.br/oficial/ele2026/";
    var UFL = ["ac", "al", "am", "ap", "ba", "ce", "df", "es", "go", "ma", "mg", "ms", "mt", "pa", "pb", "pe", "pi", "pr", "rj", "rn", "ro", "rr", "rs", "sc", "se", "sp", "to", "zz"];
    var GOVL = ["ac", "am", "df", "es", "rn", "to"];
    function num(x) { var n = parseInt(x, 10); return isNaN(n) ? 0 : n; }
    function pf(x) { var n = parseFloat(String(x == null ? "" : x).replace(",", ".")); return isNaN(n) ? 0 : n; }
    function compactTSE(u) {
      var s = u.s || {}, e = u.e || {}, v = u.v || {}, cs = [];
      (u.carg || []).forEach(function (cg) { (cg.agr || []).forEach(function (ag) { (ag.par || []).forEach(function (pa) { (pa.cand || []).forEach(function (c) {
        cs.push({ n: c.n, sq: c.sqcand, nm: c.nmu, sg: pa.sg, v: num(c.vap), p: pf(c.pvapn || c.pvap), e: c.e, st: c.st || "" });
      }); }); }); });
      cs.sort(function (a, b) { return b.v - a.v; });
      return { dt: u.dt || "", ht: u.ht || "", tf: u.tf || "", s: { t: num(s.ts), a: num(s.st), p: pf(s.pstn || s.pst) },
        el: num(e.te), el_ap: num(e.est), comp: num(e.c), pcomp: pf(e.pcn || e.pc), abst: num(e.a), pabst: pf(e.pan || e.pa),
        tv: num(v.tv), vv: num(v.vv), vb: num(v.vb), pvb: pf(v.pvbn || v.pvb), vn: num(v.tvn), pvn: pf(v.ptvnn || v.ptvn), c: cs };
    }
    function checksJS(br, ufs) {
      var sc = br.c.reduce(function (s, c) { return s + c.v; }, 0), su = {};
      Object.keys(ufs).forEach(function (k) { ufs[k].c.forEach(function (c) { su[c.n] = (su[c.n] || 0) + c.v; }); });
      return [
        { ok: sc === br.vv || br.vv === 0, txt: "Soma dos votos dos candidatos = votos válidos (Brasil)" },
        { ok: br.vv + br.vb + br.vn === br.tv || br.tv === 0, txt: "Válidos + brancos + nulos = total de votos (Brasil)" },
        { ok: br.c.every(function (c) { return (su[c.n] || 0) === c.v; }), txt: "Soma dos estados e exterior = total do Brasil, para cada candidato" },
        { ok: Object.keys(ufs).every(function (k) { return ufs[k].s.a <= ufs[k].s.t; }), txt: "Nenhum estado com mais seções apuradas do que existem" }
      ];
    }
    function getJ(url) { return fetch(url + "?t=" + Math.floor(Date.now() / 5000), { cache: "no-store" }).then(function (r) { if (r.status === 429) A.backoff = Date.now() + 45000; if (!r.ok) throw new Error(r.status); return r.json(); }); }
    function pullDirect() {
      var prev = A.live && A.live.direto ? A.live : null;
      // poucas leituras ao mesmo tempo (o TSE limita consultas por endereço); o Brasil primeiro
      var q = [["br", 0]].concat(UFL.map(function (u) { return [u, 0]; })).concat(GOVL.map(function (u) { return [u, 1]; }));
      var outP = {}, outG = {}, fail = null;
      function one(it) {
        var uf = it[0], g = it[1];
        var url = g ? TSE + "6260/dados/" + uf + "/" + uf + "-c0003-e006260-u.json" : TSE + "6258/dados/" + uf + "/" + uf + "-c0001-e006258-u.json";
        return getJ(url).then(function (j) { (g ? outG : outP)[uf] = compactTSE(j); }, function (e) {
          // quem falhar nesta leitura mantém o último dado bom
          var old = prev && (g ? prev.gov && prev.gov[uf] : uf === "br" ? prev.br : prev.ufs[uf]);
          if (old) (g ? outG : outP)[uf] = old; else if (!g && uf === "br") fail = e;
        });
      }
      var idx = 0;
      function worker() { if (idx >= q.length) return Promise.resolve(); var it = q[idx++]; return one(it).then(worker); }
      var files = Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]).then(function () {
        if (fail || !outP.br) throw fail || new Error("sem Brasil");
        return Object.keys(outP).map(function (k) { return [k, outP[k]]; });
      });
      var gov = files.then(function () { return Object.keys(outG).map(function (k) { return [k, outG[k]]; }); });
      return Promise.all([files, gov]).then(function (r) {
        var ufs = {}, br = null, gv = {};
        r[0].forEach(function (x) { if (x[0] === "br") br = x[1]; else ufs[x[0]] = x[1]; });
        r[1].forEach(function (x) { if (x) gv[x[0]] = x[1]; });
        var hist = (A.live && A.live.hist) || load("fdr.hist") || [];
        var pt = { h: br.ht, s: br.s.p, c: {} }; br.c.forEach(function (c) { pt.c[c.n] = c.p; });
        var last = hist[hist.length - 1];
        if (br.s.a > 0 && (!last || last.s !== pt.s)) { hist = hist.concat([pt]); store("fdr.hist", hist.slice(-400)); }
        var now = new Date(), coll = now.toISOString();
        return { ele: "6258", coletado: coll.slice(0, 11) + now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour12: false }), br: br, ufs: ufs, gov: gv, hist: hist, checks: checksJS(br, ufs), direto: true };
      });
    }
    var fastBusy = false;
    function fastCheck() {
      if (ARQ || fastBusy || A.direct === false || !A.started || Date.now() < START - 60000 || Date.now() < (A.backoff || 0)) return;
      fastBusy = true;
      // no modo governador, confere também o arquivo do estado escolhido
      var gUf = govMode() ? A.gov : null;
      Promise.all([getJ(TSE + "6258/dados/br/br-c0001-e006258-u.json"), gUf ? getJ(TSE + "6260/dados/" + gUf + "/" + gUf + "-c0003-e006260-u.json").catch(function () { return null; }) : null]).then(function (r) {
        var b = compactTSE(r[0]), cur = A.live && A.live.br;
        var g = r[1] && compactTSE(r[1]), gc = gUf && A.live && A.live.gov && A.live.gov[gUf];
        if (!cur || b.s.a !== cur.s.a || b.ht !== cur.ht || (g && gc && (g.s.a !== gc.s.a || g.ht !== gc.ht))) return pull();
      }).catch(function () {}).then(function () { fastBusy = false; });
    }
    // depois do 2º turno a página vira arquivo: lê só o resultado final publicado junto do site
    var ARQ = Date.now() > Date.UTC(2026, 9, 26, 12);
    function pullFile() { return fetch("apuracao.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
    function pull() {
      // se a leitura direta falhou, tenta de novo depois de 1 min (não fica preso no arquivo de reserva)
      if (A.direct === false && Date.now() - (A.directFail || 0) > 60000 && Date.now() >= (A.backoff || 0)) A.direct = undefined;
      if (Date.now() < (A.backoff || 0) && A.live && A.live.direto) return Promise.resolve();
      var src = ARQ || A.direct === false ? pullFile() : pullDirect().then(function (j) { A.direct = true; return j; }, function () { A.direct = false; A.directFail = Date.now(); return pullFile(); });
      A.lastCheck = Date.now();
      return src.then(function (j) {
        // o histórico publicado junto do site (mais completo) prevalece quando existir
        if (j.direto && A.fileHist && A.fileHist.length > j.hist.length) j.hist = A.fileHist;
        if (j.coletado === A.lastColl && !j.direto) return;
        if (A.live && A.live.br && j.br.s.a < A.live.br.s.a) return; // nunca volta atrás
        A.lastColl = j.coletado; A.live = j;
        if (A.turnoAuto) A.turno = "2"; // sem votos ainda, o 2º turno mostra a tela de espera
        render();
      }).catch(function () {});
    }
    function init(hot) {
      if (A.started) return; A.started = true;
      var mine = load("fdr.uf"); if (mine) A.uf = mine;
      if (hot) { if (hot.turno) { A.turno = hot.turno; A.turnoAuto = false; } if (hot.mode) A.mode = hot.mode; if (hot.uf) A.uf = hot.uf; if (hot.aptab) A.tab = hot.aptab; if (hot.gov) A.gov = hot.gov; }
      Promise.all([
        fetch("mapa.json").then(function (r) { return r.json(); }).then(function (m) { A.map = m; }).catch(function () {}),
        fetch("pontos.json").then(function (r) { return r.json(); }).then(function (m) { A.dots = m; }).catch(function () {}),
        fetch("turno1.json").then(function (r) { return r.json(); }).then(function (t) { A.t1 = t; }).catch(function () {})
        , pullFile().then(function (j) { A.fileHist = j.hist; }).catch(function () {})
      ]).then(pull).then(render);
      // atualização rápida: a cada 5 s lê só o resumo nacional (um arquivo pequeno); se o TSE publicou algo novo,
      // busca na hora todos os estados e os governadores. Mesmo sem mudança, faz a leitura completa a cada 60 s.
      // Se o TSE pedir calma (erro 429), espera 45 s antes de voltar a consultar.
      setInterval(function () { if (!document.hidden) fastCheck(); }, 5000);
      setInterval(function () { if (!document.hidden && !ARQ) pull(); }, 60000);
      document.addEventListener("visibilitychange", function () { if (!document.hidden && !ARQ) pull(); });
      setInterval(renderHeader, 30000);
    }
    return { init: function (h) { init(h); setTab(A.tab); }, render: render, state: function () { return { turno: A.turnoAuto ? null : A.turno, mode: A.mode, uf: A.uf, aptab: A.tab, gov: A.gov }; } };
  })();
