  /* ---------------- conteúdo educativo (carregado sob demanda) ---------------- */
  var C = { data: null, loading: null, cong: null, congLoading: null, casa: "camara", net: null };
  function loadConteudo() {
    if (C.data) return Promise.resolve(C.data);
    if (!C.loading) C.loading = fetch("conteudo.json").then(function (r) { return r.json(); }).then(function (d) { C.data = d; return d; }).catch(function () { C.data = {}; return C.data; });
    return C.loading;
  }
  function loadCongresso() {
    if (C.cong) return Promise.resolve(C.cong);
    if (!C.congLoading) C.congLoading = fetch("congresso.json").then(function (r) { return r.json(); }).then(function (d) { C.cong = d; return d; });
    return C.congLoading;
  }
  function srcLinks(fs) {
    if (!fs || !fs.length) return "";
    return '<p class="refs small muted" style="margin-top:12px">Fontes: ' + fs.map(function (f) {
      if (typeof f === "string") return link(f);
      var t = [f.autor, f.titulo, f.ano].filter(Boolean).join(", ");
      return f.url ? link(f.url, t || host(f.url)) : esc(t);
    }).join(" · ") + "</p>";
  }
  var PARTY_ALIAS = { "UNIÃO": "União Brasil", "UNIAO": "União Brasil", "PC do B": "PCdoB", "PCDOB": "PCdoB", "PODE": "Podemos", "REDE": "Rede", "NOVO": "Novo", "MISSÃO": "Missão", "MISSAO": "Missão", "REPUBLICANOS": "Republicanos", "SOLIDARIEDADE": "Solidariedade", "CIDADANIA": "Cidadania", "AVANTE": "Avante", "PODEMOS": "Podemos" };
  function partyOf(sg) {
    if (!sg || !D.partidos) return null;
    var k = PARTY_ALIAS[sg] || PARTY_ALIAS[sg.toUpperCase()] || sg;
    return D.partidos.filter(function (p) { return p.sigla.toLowerCase() === String(k).toLowerCase(); })[0] || null;
  }

  /* ---------- linha do tempo do candidato ---------- */
  var TL_GROUP = { origem: "Trajetória", carreira: "Trajetória", cargo: "Trajetória", governo: "Trajetória", declaracao: "Trajetória",
    eleicao: "Eleições", alianca: "Alianças", ruptura: "Alianças",
    escandalo: "Justiça e escândalos", investigacao: "Justiça e escândalos", denuncia: "Justiça e escândalos", processo: "Justiça e escândalos", decisao: "Justiça e escândalos", condenacao: "Justiça e escândalos", absolvicao: "Justiça e escândalos", anulacao: "Justiça e escândalos" };
  var TL_LABEL = { origem: "Origem", carreira: "Carreira", cargo: "Cargo", governo: "Governo", declaracao: "Declaração", eleicao: "Eleição", alianca: "Aliança", ruptura: "Ruptura", escandalo: "Escândalo", investigacao: "Investigação", denuncia: "Denúncia", processo: "Processo", decisao: "Decisão judicial", condenacao: "Condenação", absolvicao: "Absolvição", anulacao: "Anulação" };
  function fmtDate(d) {
    if (!d) return "";
    var m = String(d).match(/^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/); if (!m) return esc(d);
    var M = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return (m[3] ? Number(m[3]) + " " : "") + (m[2] ? M[Number(m[2]) - 1] + " " : "") + m[1];
  }
  function timelineHTML(tl) {
    if (!tl || !(tl.eventos || []).length) return "";
    var groups = ["Tudo", "Trajetória", "Eleições", "Alianças", "Justiça e escândalos"].filter(function (g) { return g === "Tudo" || tl.eventos.some(function (e) { return TL_GROUP[e.tipo] === g; }); });
    return '<h3>Linha do tempo</h3><p class="small muted" style="margin-top:6px">Fatos com data e fonte. Em casos judiciais, a situação atual aparece em destaque; ninguém é culpado antes de decisão definitiva.</p>' +
      '<div class="tlChips" role="group" aria-label="Filtrar linha do tempo">' + groups.map(function (g, i) { return '<button type="button" data-tl="' + esc(g) + '" aria-pressed="' + (i === 0) + '">' + esc(g) + "</button>"; }).join("") + "</div>" +
      '<ol class="tl">' + tl.eventos.map(function (e) {
        var g = TL_GROUP[e.tipo] || "Trajetória";
        return '<li data-g="' + esc(g) + '" class="tl-' + esc(e.tipo) + '"><span class="tlDate">' + fmtDate(e.data) + '</span><div class="tlBody"><span class="tlType">' + esc(TL_LABEL[e.tipo] || e.tipo) + "</span><b>" + esc(e.titulo) + "</b><p>" + esc(e.texto) + "</p>" +
          (e.status ? '<p class="tlStatus">Situação: ' + esc(e.status) + "</p>" : "") + (e.fonte ? '<p class="small">' + link(e.fonte) + "</p>" : "") + "</div></li>";
      }).join("") + "</ol>" +
      (tl.resumo_juridico ? '<div class="gapBox"><p><b>Situação jurídica hoje.</b> ' + esc(tl.resumo_juridico) + "</p></div>" : "");
  }
  /* ---------- principais ações e "o que disse e o que fez" ---------- */
  var COH_TIPO = { mudanca: "Mudou de posição", fala_x_ato: "Disse uma coisa, fez outra", regra_para_outros: "Regra para os outros, outra para si", conflito_apontado: "Conflito de interesse apontado" };
  function cohHTML(k) {
    var h = "";
    if ((k.principais || []).length) {
      h += '<h3>Principais ações</h3><p class="small muted" style="margin-top:6px">O essencial da trajetória, escolhido pelo mesmo critério para todos: leis e decisões que viraram regra, votos decisivos, cargos com efeito amplo e decisões judiciais.</p>' +
        '<ul class="atos">' + k.principais.slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).map(function (a) { return '<li><span class="d">' + fmtDate(a.data) + "</span><span>" + esc(a.texto) + (a.fonte ? ' <span class="small">' + link(a.fonte) + "</span>" : "") + "</span></li>"; }).join("") + "</ul>";
    }
    h += '<h3>O que disse e o que fez</h3><p class="small muted" style="margin-top:6px">Casos documentados em que a posição mudou com o tempo ou em que a ação foi em outra direção do discurso. Os dois lados aparecem com data e fonte; quando há explicação do próprio político, ela vem junto. Mudar de ideia não é, por si só, um problema: a conclusão é sua.</p>';
    if ((k.diz_faz || []).length) {
      h += '<div class="cohList">' + k.diz_faz.map(function (x) {
        var d = x.disse || {}, f = x.fez || {};
        return '<div class="coh"><p class="cohTop"><b>' + esc(x.tema) + '</b><span class="cohT">' + esc(COH_TIPO[x.tipo] || "") + "</span></p>" +
          '<div class="cohTwo"><div><p class="k">O que disse' + (d.data ? " · " + fmtDate(d.data) : "") + "</p><p>" + esc(d.texto) + "</p>" + (d.contexto ? '<p class="small muted">' + esc(d.contexto) + "</p>" : "") + (d.fonte ? '<p class="small">' + link(d.fonte) + "</p>" : "") + "</div>" +
          '<div><p class="k">O que fez' + (f.data ? " · " + fmtDate(f.data) : "") + "</p><p>" + esc(f.texto) + "</p>" + (f.fonte ? '<p class="small">' + link(f.fonte) + "</p>" : "") + "</div></div>" +
          (x.apontado_por ? '<p class="small muted">Apontado por: ' + esc(x.apontado_por) + "</p>" : "") +
          '<p class="small cohExp">' + (x.explicacao && x.explicacao.texto ? "<b>Explicação:</b> " + esc(x.explicacao.texto) + (x.explicacao.fonte ? " " + link(x.explicacao.fonte) : "") : '<span class="muted">Sem explicação pública registrada.</span>') + "</p></div>";
      }).join("") + "</div>";
    } else {
      h += '<p class="muted" style="margin-top:12px">A pesquisa não encontrou casos bem documentados para este candidato.</p>';
    }
    if (k.busca_nota) h += '<p class="small muted" style="margin-top:10px">Como pesquisamos: ' + esc(k.busca_nota) + "</p>";
    return h;
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-tl]"); if (!b) return;
    var box = b.closest(".tlChips"); segSet(box, "tl", b.dataset.tl);
    var ol = box.nextElementSibling; ol.querySelectorAll("li").forEach(function (li) { li.hidden = b.dataset.tl !== "Tudo" && li.dataset.g !== b.dataset.tl; });
  });

  /* ---------- Congresso ---------- */
  function sprite(p, scale) {
    var cg = C.cong; if (!p.foto || !cg) return '<span class="pPh"></span>';
    var s = scale || 1, w = cg.foto_w * s, h = cg.foto_h * s, idx = p.foto[1];
    return '<span class="pPh" style="width:' + w + "px;height:" + h + "px;background-image:url(fotos/cong-" + p.foto[0] + ".jpg);background-size:" + (cg.cols * w) + "px " + (cg.rows * h) + "px;background-position:-" + ((idx % cg.cols) * w) + "px -" + (Math.floor(idx / cg.cols) * h) + 'px"></span>';
  }
  function personPos(p) {
    // posições do parlamentar: voto próprio quando há; senão, a do partido (o que faz; senão o que diz)
    var party = partyOf(p.partido), out = {};
    D.perguntas.forEach(function (q) {
      if (p.pos && p.pos[q.id] != null) out[q.id] = { v: p.pos[q.id], own: true };
      else if (party) { var pp = pos(party, q.id); var v = pp.p != null ? pp.p : pp.v; if (v != null) out[q.id] = { v: v, own: false }; }
    });
    return out;
  }
  function personAff(p) {
    var pp = personPos(p), sw = 0, sa = 0, n = 0;
    D.perguntas.forEach(function (q) { var u = answers[q.id], x = pp[q.id]; if (u == null || !x) return; var w = x.own ? 1 : 0.6; sw += w; sa += w * (1 - Math.abs(u - x.v) / 4); n++; });
    return n >= 5 ? sa / sw * 100 : null;
  }
  var UFN2 = { ac: "Acre", al: "Alagoas", ap: "Amapá", am: "Amazonas", ba: "Bahia", ce: "Ceará", df: "Distrito Federal", es: "Espírito Santo", go: "Goiás", ma: "Maranhão", mt: "Mato Grosso", ms: "Mato Grosso do Sul", mg: "Minas Gerais", pa: "Pará", pb: "Paraíba", pr: "Paraná", pe: "Pernambuco", pi: "Piauí", rj: "Rio de Janeiro", rn: "Rio Grande do Norte", rs: "Rio Grande do Sul", ro: "Rondônia", rr: "Roraima", sc: "Santa Catarina", sp: "São Paulo", se: "Sergipe", to: "Tocantins" };
  function seatColor(sg) {
    var p = partyOf(sg), k = p ? coords(p, "real") : null;
    if (!k || k.x.n < 3) return "var(--cO)";
    var t = Math.max(-1, Math.min(1, k.x.v / 8));
    return t < 0 ? "color-mix(in srgb, var(--pl) " + Math.round(-t * 100) + "%, var(--pm))" : "color-mix(in srgb, var(--pr) " + Math.round(t * 100) + "%, var(--pm))";
  }
  function renderHemi() {
    var cg = C.cong, list = C.casa === "camara" ? cg.deputados : cg.senadores;
    var by = {};
    list.forEach(function (p) { by[p.partido] = (by[p.partido] || 0) + 1; });
    var parties = Object.keys(by).sort(function (a, b) {
      var pa = partyOf(a), pb = partyOf(b), xa = pa ? coords(pa, "real").x.v : 0, xb = pb ? coords(pb, "real").x.v : 0; return xa - xb || by[b] - by[a];
    });
    var seats = []; parties.forEach(function (sg) { for (var i = 0; i < by[sg]; i++) seats.push(sg); });
    // semicírculo: distribui as cadeiras em fileiras, da esquerda para a direita
    var N = seats.length, rows = C.casa === "camara" ? 12 : 5, R0 = 120, R1 = 330, cx = 360, cy = 350, pts = [];
    var rad = []; for (var r = 0; r < rows; r++) rad.push(R0 + (R1 - R0) * r / (rows - 1));
    var tot = rad.reduce(function (s, x) { return s + x; }, 0);
    rad.forEach(function (rr) { var n = Math.round(N * rr / tot); for (var i = 0; i < n; i++) { var a = Math.PI - Math.PI * (i + 0.5) / n; pts.push({ a: a, r: rr }); } });
    while (pts.length > N) pts.pop(); while (pts.length < N) pts.push({ a: Math.PI / 2, r: R1 });
    pts.sort(function (p, q) { return q.a - p.a || p.r - q.r; });
    var dot = C.casa === "camara" ? 8.6 : 16;
    $("hemi").innerHTML = pts.map(function (p, i) {
      return '<circle cx="' + (cx + p.r * Math.cos(p.a)).toFixed(1) + '" cy="' + (cy - p.r * Math.sin(p.a)).toFixed(1) + '" r="' + (dot / 2) + '" fill="' + seatColor(seats[i]) + '"><title>' + esc(seats[i]) + "</title></circle>";
    }).join("") + '<text x="' + cx + '" y="' + (cy - 30) + '" text-anchor="middle" style="font-size:44px;font-weight:800;fill:var(--ink)">' + N + '</text><text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" style="font-size:14px;fill:var(--muted)">' + (C.casa === "camara" ? "deputados" : "senadores") + "</text>";
    $("hemiNote").textContent = "Cada ponto é uma cadeira. Os partidos estão ordenados da esquerda para a direita pelo eixo econômico (votos das bancadas). Violeta: mais à esquerda; verde-oliva: mais à direita; cinza: perto do centro ou sem dados de posição.";
    $("partyBars").innerHTML = parties.map(function (sg) {
      var p = partyOf(sg), k = p ? coords(p, "real") : null;
      return '<div class="pbar"><span class="sw" style="background:' + seatColor(sg) + '"></span><b>' + esc(sg) + '</b><span class="tab">' + by[sg] + '</span><span class="small muted">' + (k && k.x.n >= 3 ? coordText(k) : "sem dados de posição") + "</span>" + (p ? '<a href="#" class="plink small" data-open-part="' + esc(p.id) + '">ver ›</a>' : "<span></span>") + "</div>";
    }).join("");
  }
  function renderCongGrid() {
    var cg = C.cong, uf = $("congUf").value, term = $("congSearch").value.trim().toLowerCase(), sort = $("congSort").value;
    var list = (C.casa === "camara" ? cg.deputados : cg.senadores).map(function (p, i) { p._i = i; return p; });
    list = term ? list.filter(function (p) { return (p.nm + " " + p.civil + " " + p.partido).toLowerCase().indexOf(term) >= 0; }) : list.filter(function (p) { return p.uf === uf; });
    list.forEach(function (p) { p._aff = nAnswered() ? personAff(p) : null; });
    list.sort(function (a, b) {
      if (sort === "afinidade") return (b._aff || -1) - (a._aff || -1);
      if (sort === "partido") return a.partido.localeCompare(b.partido) || (b.votos || 0) - (a.votos || 0);
      return (b.votos || 0) - (a.votos || 0);
    });
    $("congNote").textContent = term ? list.length + " resultados no Brasil" : list.length + (C.casa === "camara" ? " deputados federais de " : " senadores de ") + UFN2[uf] + (nAnswered() ? ". A afinidade usa o voto próprio quando existe e, senão, o partido." : ". Faça o teste para ver a afinidade com cada um.");
    $("congGrid").innerHTML = list.map(function (p) {
      var nv = Object.keys(p.v || {}).length;
      return '<button type="button" class="pcard" data-person="' + C.casa + ":" + p._i + '">' + sprite(p, 0.72) + '<span style="min-width:0"><b>' + esc(titleCaseName(p.nm)) + '</b><span class="small muted">' + esc(p.partido) + " · " + p.uf.toUpperCase() + (p.votos ? " · " + Number(p.votos).toLocaleString("pt-BR") + " votos" : "") + "</span>" +
        '<span class="small">' + (C.casa === "camara" ? (nv ? "Reeleito · " + nv + " votos registrados" : "Novo na Câmara (2023–26)") : (p.eleito === 2026 ? "Eleito em 2026" : "Mandato desde 2023")) + "</span>" +
        (p._aff != null ? '<span class="aff small">' + Math.round(p._aff) + "% de afinidade</span>" : "") + "</span></button>";
    }).join("") || '<p class="muted">Ninguém encontrado.</p>';
  }
  function titleCaseName(s) { return String(s || "").toLowerCase().replace(/(^|\s|-)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, function (w) { return w.toLowerCase(); }); }
  var VOTO_TXT = { "Sim": "Sim", "Não": "Não", "Abstenção": "Abstenção", "Obstrução": "Obstrução", "Artigo 17": "Presidente (não vota)" };
  function openPerson(key) {
    var k = key.split(":"), p = (k[0] === "camara" ? C.cong.deputados : C.cong.senadores)[Number(k[1])]; if (!p) return;
    var party = partyOf(p.partido), pp = personPos(p), af = nAnswered() ? personAff(p) : null, vt = C.cong.votacoes;
    var h = '<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">' + sprite(p, 1.3) + '<div><p class="eyebrow">' + (k[0] === "camara" ? "Deputado(a) federal" : "Senador(a)") + " · " + esc(UFN2[p.uf] || p.uf) + "</p><h2>" + esc(titleCaseName(p.nm)) + '</h2><p class="muted">' + esc(titleCaseName(p.civil)) + " · " + esc(p.partido) + "</p></div></div>" +
      '<div class="facts">' + (p.votos ? '<div><p class="k">Votos em 2026</p><p class="v tab">' + Number(p.votos).toLocaleString("pt-BR") + "</p></div>" : "") +
      '<div><p class="k">Situação</p><p class="v">' + esc(p.st || (p.eleito === 2022 ? "Eleito em 2022, mandato até 2031" : "Eleito em 2026")) + "</p></div>" +
      (af != null ? '<div><p class="k">Afinidade com você</p><p class="v tab">' + Math.round(af) + "%</p></div>" : "") + "</div>";
    var own = Object.keys(p.v || {});
    if (own.length) {
      h += '<h3>Como votou na Câmara (2019–2026)</h3><p class="small muted" style="margin-top:6px">Votos nominais registrados nos dados abertos da Câmara. Ausência significa que não votou naquela sessão ou ainda não era deputado.</p><div class="scroll"><table class="ptable"><thead><tr><th>Votação</th><th>Voto</th><th>Afirmação do teste</th></tr></thead><tbody>' +
        Object.keys(vt).filter(function (x) { return p.v[x]; }).sort(function (a, b) { return vt[b].data.localeCompare(vt[a].data); }).map(function (x) {
          var q = D.perguntas.filter(function (q) { return q.id === vt[x].q; })[0];
          return "<tr><td>" + esc(vt[x].descricao) + '</td><td><b>' + esc(VOTO_TXT[p.v[x]] || p.v[x]) + '</b></td><td class="small">' + (q ? esc(q.texto) + ' <span class="muted">(Sim ' + (vt[x].sinal > 0 ? "= concorda" : "= discorda") + ")</span>" : "") + " " + link(vt[x].url, "fonte") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    } else {
      h += '<div class="gapBox"><p>' + (k[0] === "camara" ? "Não estava na Câmara entre 2023 e 2026, ou não foi possível casar o nome com os dados da Câmara. " : "Para senadores, o site ainda usa a posição do partido. ") + "A posição abaixo é a do partido " + esc(p.partido) + ", que costuma votar em bloco, mas cada parlamentar pode divergir.</p></div>";
    }
    if (party) h += '<p style="margin-top:16px"><a href="#" data-open-part="' + esc(party.id) + '">Ver o partido ' + esc(party.sigla) + " ›</a></p>";
    var rows = D.perguntas.filter(function (q) { return pp[q.id]; });
    if (rows.length) h += '<h3>Posição por pauta</h3><div class="scroll"><table class="ptable"><thead><tr><th>Afirmação</th><th>Posição</th><th>Origem</th></tr></thead><tbody>' + rows.map(function (q) {
      var x = pp[q.id], u = answers[q.id];
      return "<tr><td>" + esc(q.texto) + (u != null ? '<div class="small muted">Você: ' + esc(LIKERT_EU[u].toLowerCase()) + "</div>" : "") + "</td><td>" + stanceHTML(x.v) + '</td><td class="small">' + (x.own ? "Voto próprio" : "Partido") + "</td></tr>";
    }).join("") + "</tbody></table></div>";
    openSheet(h);
  }
  function renderVotTable() {
    var vt = C.cong.votacoes;
    $("votTable").innerHTML = "<thead><tr><th>Votação</th><th>Afirmação do teste</th><th>Votar Sim significa</th></tr></thead><tbody>" + Object.keys(vt).sort(function (a, b) { return vt[a].data.localeCompare(vt[b].data); }).map(function (k) {
      var q = D.perguntas.filter(function (q) { return q.id === vt[k].q; })[0];
      return "<tr><td>" + esc(vt[k].descricao) + " " + link(vt[k].url, "dados") + '</td><td class="small">' + (q ? esc(q.texto) : "") + '</td><td class="small">' + (vt[k].sinal > 0 ? "concordar" : "discordar") + (vt[k].peso > 1 ? "" : " (aproximação)") + "</td></tr>";
    }).join("") + "</tbody>";
  }
  function renderCongresso() {
    loadCongresso().then(function () {
      var sel = $("congUf");
      if (!sel.options.length) {
        sel.innerHTML = Object.keys(UFN2).sort(function (a, b) { return UFN2[a].localeCompare(UFN2[b]); }).map(function (u) { return '<option value="' + u + '">' + UFN2[u] + "</option>"; }).join("");
        sel.value = load("fdr.uf") && UFN2[load("fdr.uf")] ? load("fdr.uf") : "sp";
      }
      segSet($("casaSeg"), "casa", C.casa);
      renderHemi(); renderCongGrid(); renderVotTable();
    }).catch(function () { $("congGrid").innerHTML = '<p class="muted">Não foi possível carregar os dados do Congresso.</p>'; });
  }
  $("casaSeg").addEventListener("click", function (ev) { var b = ev.target.closest("[data-casa]"); if (!b) return; C.casa = b.dataset.casa; renderCongresso(); });
  ["congUf", "congSort"].forEach(function (id) { $(id).addEventListener("change", renderCongGrid); });
  $("congSearch").addEventListener("input", renderCongGrid);
  $("congGrid").addEventListener("click", function (ev) { var b = ev.target.closest("[data-person]"); if (b) openPerson(b.dataset.person); });

  /* ---------- Poder: rede de conexões ---------- */
  var NET_TIPO = { aliados: "Aliados", adversarios: "Adversários", ex_aliados: "Ex-aliados", mesmo_governo: "Mesmo governo", mesma_chapa: "Mesma chapa", nomeou: "Nomeou", julgou: "Julgou", investigou: "Investigou", apoio_eleitoral: "Apoio eleitoral", articulacao: "Articulação" };
  var NET_COLOR = { adversarios: "var(--bad)", ex_aliados: "var(--warn)", julgou: "var(--muted)", investigou: "var(--muted)" };
  function personName(id) {
    var d = C.data, f = (d.poder && d.poder.figuras || []).filter(function (x) { return x.id === id; })[0];
    if (f) return f.nome;
    var c = D.candidatos.filter(function (x) { return x.id === id; })[0];
    return c ? shortName(c) : titleCaseName(String(id).replace(/-/g, " "));
  }
  function buildNet() {
    var P = C.data.poder; if (!P || !P.conexoes) return;
    var ids = {}; P.conexoes.forEach(function (e) { ids[e.a] = (ids[e.a] || 0) + 1; ids[e.b] = (ids[e.b] || 0) + 1; });
    var nodes = Object.keys(ids).map(function (id, i) { var a = i / Object.keys(ids).length * Math.PI * 2; return { id: id, deg: ids[id], x: 450 + 250 * Math.cos(a), y: 320 + 230 * Math.sin(a), vx: 0, vy: 0 }; });
    var idx = {}; nodes.forEach(function (n, i) { idx[n.id] = i; });
    var edges = P.conexoes.map(function (e) { return { s: idx[e.a], t: idx[e.b], e: e }; });
    // layout por forças, calculado uma vez (sem biblioteca)
    for (var it = 0; it < 420; it++) {
      var alpha = 1 - it / 420;
      for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
        var a = nodes[i], b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.01, f = 5200 / d2;
        a.vx += dx * f * 0.02; a.vy += dy * f * 0.02; b.vx -= dx * f * 0.02; b.vy -= dy * f * 0.02;
      }
      edges.forEach(function (ed) { var a = nodes[ed.s], b = nodes[ed.t], dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1, f = (d - 110) * 0.012; a.vx += dx / d * f * d * 0.05; a.vy += dy / d * f * d * 0.05; b.vx -= dx / d * f * d * 0.05; b.vy -= dy / d * f * d * 0.05; });
      nodes.forEach(function (n) { n.vx += (450 - n.x) * 0.004; n.vy += (320 - n.y) * 0.005; n.x += n.vx * alpha; n.y += n.vy * alpha; n.vx *= 0.6; n.vy *= 0.6; n.x = Math.max(40, Math.min(860, n.x)); n.y = Math.max(30, Math.min(610, n.y)); });
    }
    // estica o desenho para ocupar toda a área, mantendo margem para os nomes
    var xs = nodes.map(function (n) { return n.x; }), ys = nodes.map(function (n) { return n.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    nodes.forEach(function (n) { n.x = 70 + (n.x - x0) / ((x1 - x0) || 1) * 760; n.y = 40 + (n.y - y0) / ((y1 - y0) || 1) * 550; });
    C.net = { nodes: nodes, edges: edges, sel: null };
  }
  function drawNet() {
    if (!C.net) return;
    var N = C.net, sel = N.sel, q = ($("netSearch").value || "").trim().toLowerCase(), h = [];
    var near = {}; if (sel != null) N.edges.forEach(function (e) { if (e.s === sel) near[e.t] = 1; if (e.t === sel) near[e.s] = 1; });
    N.edges.forEach(function (e) {
      var a = N.nodes[e.s], b = N.nodes[e.t], on = sel == null || e.s === sel || e.t === sel;
      h.push('<line x1="' + a.x.toFixed(1) + '" y1="' + a.y.toFixed(1) + '" x2="' + b.x.toFixed(1) + '" y2="' + b.y.toFixed(1) + '" stroke="' + (NET_COLOR[e.e.tipo] || "var(--ink)") + '" stroke-width="' + (on && sel != null ? 2 : 1) + '" opacity="' + (on ? (sel != null ? 0.85 : 0.18) : 0.04) + '"' + (e.e.tipo === "adversarios" ? ' stroke-dasharray="4 4"' : "") + "/>");
    });
    N.nodes.forEach(function (n, i) {
      var nm = personName(n.id), isC = D.candidatos.some(function (c) { return c.id === n.id; }), hit = q && nm.toLowerCase().indexOf(q) >= 0;
      var dim = sel != null && i !== sel && !near[i] && !hit, r = 5 + Math.min(10, n.deg * 1.2);
      h.push('<g class="nn" data-n="' + i + '" tabindex="0" role="button" aria-label="' + esc(nm) + '" opacity="' + (dim ? 0.2 : 1) + '"><circle cx="' + n.x.toFixed(1) + '" cy="' + n.y.toFixed(1) + '" r="' + r + '" fill="' + (isC ? "var(--you)" : "var(--dot)") + '" stroke="var(--bg)" stroke-width="' + (i === sel || hit ? 4 : 2) + '"/>' +
        '<text x="' + n.x.toFixed(1) + '" y="' + (n.y + r + 12).toFixed(1) + '" text-anchor="middle" style="font-size:' + (i === sel ? 13 : 11) + "px;font-weight:" + (i === sel || hit ? 700 : 500) + ';fill:var(--ink);paint-order:stroke;stroke:var(--bg);stroke-width:3px">' + esc(nm) + "</text></g>");
    });
    $("net").innerHTML = h.join("");
    $("netLegend").innerHTML = '<span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--ink)" stroke-width="2"/></svg>Aliança, governo, chapa</span><span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--warn)" stroke-width="2"/></svg>Ex-aliados</span><span><svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="var(--bad)" stroke-width="2" stroke-dasharray="4 3"/></svg>Adversários</span><span><svg width="12" height="12"><circle cx="6" cy="6" r="5" fill="var(--you)"/></svg>Candidato a presidente 2026</span>';
  }
  function selectNode(i) {
    var N = C.net; N.sel = N.sel === i ? null : i; drawNet();
    if (N.sel == null) { $("netPanel").innerHTML = '<p class="muted">Toque em uma pessoa para ver as ligações dela, com data e fonte.</p>'; return; }
    var n = N.nodes[i], f = (C.data.poder.figuras || []).filter(function (x) { return x.id === n.id; })[0], c = D.candidatos.filter(function (x) { return x.id === n.id; })[0];
    var es = N.edges.filter(function (e) { return e.s === i || e.t === i; });
    $("netPanel").innerHTML = "<h3>" + esc(personName(n.id)) + "</h3>" + (f ? '<p class="small muted">' + esc(f.cargo_atual || "") + "</p>" : c ? '<p class="small muted">Candidato a presidente · ' + esc(c.partido) + "</p>" : "") +
      '<ul class="list" style="margin-top:12px">' + es.map(function (e) {
        var other = e.s === i ? e.t : e.s;
        return '<li><span class="badge">' + esc(NET_TIPO[e.e.tipo] || e.e.tipo) + (e.e.periodo ? " · " + esc(e.e.periodo) : "") + "</span><div><b>" + esc(personName(N.nodes[other].id)) + "</b>: " + esc(e.e.texto) + (e.e.fonte ? ' <span class="small">' + link(e.e.fonte) + "</span>" : "") + "</div></li>";
      }).join("") + "</ul>" +
      (f ? '<p style="margin-top:12px"><a href="#" data-fig="' + esc(f.id) + '">Ver perfil ›</a></p>' : c ? '<p style="margin-top:12px"><a href="#" data-open-cand="' + esc(c.id) + '">Ver ficha ›</a></p>' : "");
  }
  $("net").addEventListener("click", function (ev) { var g = ev.target.closest("[data-n]"); if (g) selectNode(Number(g.dataset.n)); });
  $("net").addEventListener("keydown", function (ev) { var g = ev.target.closest && ev.target.closest("[data-n]"); if (g && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); selectNode(Number(g.dataset.n)); } });
  $("netSearch").addEventListener("input", function () {
    var q = this.value.trim().toLowerCase(); if (!C.net) return;
    var hit = C.net.nodes.findIndex(function (n) { return q && personName(n.id).toLowerCase().indexOf(q) >= 0; });
    if (hit >= 0 && q.length >= 3) selectNode(hit); else drawNet();
  });
  function openFig(id) {
    var f = (C.data.poder.figuras || []).filter(function (x) { return x.id === id; })[0]; if (!f) return;
    var cs = (C.data.poder.conexoes || []).filter(function (e) { return e.a === id || e.b === id; });
    openSheet('<p class="eyebrow">' + esc(f.instituicao || "") + "</p><h2>" + esc(f.nome) + '</h2><p class="muted">' + esc(f.cargo_atual || "") + (f.desde ? " · desde " + esc(f.desde) : "") + "</p>" +
      '<h3>Por que importa</h3><p style="margin-top:8px">' + esc(f.por_que_importa || "") + "</p>" +
      (f.como_chegou ? '<h3>Como chegou lá</h3><p style="margin-top:8px">' + esc(f.como_chegou) + "</p>" : "") +
      ((f.marcos || []).length ? '<h3>Marcos</h3><ol class="tl">' + f.marcos.map(function (m) { return '<li><span class="tlDate">' + fmtDate(m.data) + '</span><div class="tlBody"><p>' + esc(m.texto) + "</p>" + (m.fonte ? '<p class="small">' + link(m.fonte) + "</p>" : "") + "</div></li>"; }).join("") + "</ol>" : "") +
      (cs.length ? '<h3>Ligações</h3><ul class="list">' + cs.map(function (e) { var o = e.a === id ? e.b : e.a; return '<li><span class="badge">' + esc(NET_TIPO[e.tipo] || e.tipo) + (e.periodo ? " · " + esc(e.periodo) : "") + "</span><div><b>" + esc(personName(o)) + "</b>: " + esc(e.texto) + (e.fonte ? ' <span class="small">' + link(e.fonte) + "</span>" : "") + "</div></li>"; }).join("") + "</ul>" : "") +
      srcLinks(f.fontes));
  }
  document.addEventListener("click", function (ev) { var a = ev.target.closest("[data-fig]"); if (a) { ev.preventDefault(); openFig(a.dataset.fig); } });
  function renderPoder() {
    loadConteudo().then(function (d) {
      var P = d.poder;
      if (!P) { $("centrao").innerHTML = '<p class="muted">Conteúdo em preparação.</p>'; return; }
      if (!C.net) buildNet();
      drawNet();
      var ce = P.centrao || {};
      $("centrao").innerHTML = (ce.resumo ? '<p class="lede" style="margin-top:0">' + esc(ce.resumo) + "</p>" : "") + (ce.secoes || []).map(function (s) {
        return "<h3>" + esc(s.titulo) + "</h3>" + (Array.isArray(s.texto) ? s.texto : [s.texto]).map(function (t) { return "<p>" + esc(t) + "</p>"; }).join("");
      }).join("") + srcLinks(ce.fontes);
      $("figGrid").innerHTML = (P.figuras || []).map(function (f) {
        return '<button type="button" class="figCard" data-fig="' + esc(f.id) + '"><span class="small muted">' + esc(f.instituicao || "") + "</span><b>" + esc(f.nome) + '</b><span class="small">' + esc(f.cargo_atual || "") + '</span><span class="small muted">' + esc((f.por_que_importa || "").slice(0, 150)) + ((f.por_que_importa || "").length > 150 ? "…" : "") + "</span></button>";
      }).join("");
    });
  }

  /* ---------- Fenômenos ---------- */
  function renderFenomenos() {
    loadConteudo().then(function (d) {
      var F = d.fenomenos || [];
      if (!F.length) { $("fenGrid").innerHTML = '<p class="muted">Conteúdo em preparação.</p>'; return; }
      $("fenGrid").innerHTML = F.map(function (f) { return '<button type="button" class="fenCard" data-fen="' + esc(f.id) + '"><b>' + esc(f.pergunta) + '</b><span class="small muted">' + esc((f.resumo || "").length > 190 ? f.resumo.slice(0, 185).replace(/\s\S*$/, "") + "…" : (f.resumo || "")) + '</span><span class="small" style="color:var(--you);font-weight:600">Ler a explicação ›</span></button>'; }).join("");
    });
  }
  function openFen(id) {
    var f = (C.data.fenomenos || []).filter(function (x) { return x.id === id; })[0]; if (!f) return;
    openSheet('<p class="eyebrow">Fenômeno político</p><h2>' + esc(f.pergunta) + '</h2><p class="lede" style="margin-top:12px">' + esc(f.resumo || "") + "</p>" +
      (f.explicacao || []).map(function (p) { return '<p style="margin-top:14px;max-width:68ch">' + esc(p) + "</p>"; }).join("") +
      ((f.dados || []).length ? '<h3>O que os dados mostram</h3><ul class="list">' + f.dados.map(function (x) { return "<li>" + esc(x.texto) + (x.fonte ? ' <span class="small">' + link(x.fonte) + "</span>" : "") + "</li>"; }).join("") + "</ul>" : "") +
      ((f.vozes || []).length ? '<h3>Nas palavras dos eleitores</h3><ul class="list">' + f.vozes.map(function (v) { return '<li><span class="badge">' + esc(v.quem) + "</span><div>" + esc(v.texto) + "</div></li>"; }).join("") + "</ul>" : "") +
      ((f.mitos || []).length ? '<h3>Mitos e fatos</h3><ul class="list">' + f.mitos.map(function (m) { return '<li class="meio"><b>Mito:</b> ' + esc(m.mito) + "<div><b>Fato:</b> " + esc(m.fato) + "</div></li>"; }).join("") + "</ul>" : "") +
      (f.para_aproximar ? '<div class="gapBox" style="margin-top:22px"><p><b>Para conversar com quem pensa diferente.</b> ' + esc(f.para_aproximar) + "</p></div>" : "") +
      srcLinks(f.fontes));
  }
  document.addEventListener("click", function (ev) { var a = ev.target.closest("[data-fen]"); if (a) { ev.preventDefault(); openFen(a.dataset.fen); } });

  /* ---------- Glossário ---------- */
  function renderGlossario() {
    loadConteudo().then(function (d) {
      var G = (d.glossario || []).slice().sort(function (a, b) { return a.termo.localeCompare(b.termo); }), q = $("gloSearch").value.trim().toLowerCase();
      if (q) G = G.filter(function (g) { return (g.termo + " " + g.simples).toLowerCase().indexOf(q) >= 0; });
      $("gloList").innerHTML = G.map(function (g) {
        return '<details class="glo" id="g-' + esc(g.id) + '"><summary><b>' + esc(g.termo) + '</b><span class="muted">' + esc(g.simples) + "</span></summary>" +
          (g.como_funciona || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + (g.exemplo ? "<p><b>Exemplo:</b> " + esc(g.exemplo) + "</p>" : "") + (g.por_que_importa ? "<p><b>Por que importa:</b> " + esc(g.por_que_importa) + "</p>" : "") + srcLinks(g.fontes) + "</details>";
      }).join("") || '<p class="muted">' + (d.glossario ? "Nenhum termo encontrado." : "Conteúdo em preparação.") + "</p>";
    });
  }
  $("gloSearch").addEventListener("input", renderGlossario);

  /* rótulos das colunas em cada célula, usados quando a tabela vira ficha no celular */
  function labelTables() {
    document.querySelectorAll("table.ptable, .prose table").forEach(function (t) {
      var ths = t.querySelectorAll("thead th"); if (!ths.length) return;
      t.querySelectorAll("tbody tr").forEach(function (tr) {
        Array.prototype.forEach.call(tr.children, function (td, i) { var l = ths[i] && ths[i].textContent.trim(); if (l && !td.hasAttribute("data-label")) td.setAttribute("data-label", l); });
      });
    });
  }
  var ltPending = false;
  new MutationObserver(function () { if (ltPending) return; ltPending = true; requestAnimationFrame(function () { ltPending = false; labelTables(); }); }).observe(document.body, { childList: true, subtree: true });
  labelTables();
  /* zoom travado no celular: sem pinça (iOS) e sem toque duplo */
  ["gesturestart", "gesturechange"].forEach(function (t) { document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false }); });
  document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });

  /* ---------- notícias em tempo real (manchetes coletadas dos feeds públicos a cada poucos minutos) ---------- */
  var NW = (function () {
    var S = { data: null, topic: "p", src: null, seen: null, timer: null, shownAt: 0 };
    try { S.seen = localStorage.getItem("fdr.nwSeen"); } catch (e) {}
    function quando(iso) {
      var d = new Date(iso), m = Math.round((Date.now() - d.getTime()) / 60000);
      if (m < 1) return "agora";
      if (m < 60) return "há " + m + " min";
      if (m < 360) return "há " + Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "");
      return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", " ·");
    }
    function itens() {
      var d = S.data; if (!d) return [];
      return d.itens.filter(function (x) { return (S.topic === "p" || x.e) && (!S.src || x.f === S.src); });
    }
    function li(x, compact) {
      var novo = S.seen && x.d > S.seen;
      return '<li class="nwItem' + (novo ? " isNew" : "") + '"><a href="' + esc(x.u) + '" target="_blank" rel="noopener">' +
        '<span class="nwMeta"><b>' + esc(x.f) + '</b><time datetime="' + esc(x.d) + '">' + quando(x.d) + "</time>" + (novo ? '<em class="nwNew">novo</em>' : "") + "</span>" +
        '<span class="nwTitle">' + esc(x.t) + "</span>" + (!compact && x.r ? '<span class="nwSum">' + esc(x.r) + "</span>" : "") + "</a></li>";
    }
    function renderStatus(err) {
      var st = $("nwStatus"); if (!st) return;
      if (err && !S.data) { st.className = "nwStatus off"; st.lastChild.textContent = "Não foi possível carregar as notícias agora. Tentando de novo em instantes."; return; }
      if (!S.data) return;
      st.className = "nwStatus";
      st.lastChild.textContent = "Ao vivo · última coleta " + quando(S.data.atualizado) + " · " + S.data.itens.length + " manchetes de " + S.data.fontes.length + " fontes";
    }
    function renderSources() {
      var box = $("nwSources"); if (!box || !S.data) return;
      var c = {}; S.data.itens.forEach(function (x) { if (S.topic === "p" || x.e) c[x.f] = (c[x.f] || 0) + 1; });
      var fs = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
      box.innerHTML = '<button type="button" data-nws="" aria-pressed="' + !S.src + '">Todos</button>' + fs.map(function (f) { return '<button type="button" data-nws="' + esc(f) + '" aria-pressed="' + (S.src === f) + '">' + esc(f) + "</button>"; }).join("");
    }
    function renderList() {
      var box = $("nwList"); if (!box) return;
      var xs = itens().slice(0, 120);
      box.innerHTML = xs.length ? xs.map(function (x) { return li(x); }).join("") : '<li class="muted" style="padding:20px 0">Nenhuma manchete neste filtro agora.</li>';
    }
    function renderAp() {
      var box = $("apNews"), list = $("apNewsList"); if (!box || !S.data) return;
      var xs = S.data.itens.filter(function (x) { return x.e; }).slice(0, 5);
      box.hidden = !xs.length;
      list.innerHTML = xs.map(function (x) { return li(x, true); }).join("");
    }
    function renderAll() { renderStatus(); renderSources(); renderList(); renderAp(); }
    function refreshTimes() { document.querySelectorAll(".nwItem time").forEach(function (t) { t.textContent = quando(t.getAttribute("datetime")); }); renderStatus(); }
    function pull() {
      return fetch("noticias.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d || !d.itens) { renderStatus(true); return; }
        var mudou = !S.data || d.atualizado !== S.data.atualizado;
        S.data = d;
        if (mudou) renderAll();
      }).catch(function () { renderStatus(true); });
    }
    function start() {
      if (S.timer) return;
      pull();
      S.timer = setInterval(function () { if (!document.hidden) pull(); }, 60000);
      setInterval(refreshTimes, 30000);
    }
    function marcarVistas() {
      if (!S.data || !S.data.itens.length) return;
      var top = S.data.itens[0].d;
      try { localStorage.setItem("fdr.nwSeen", top); } catch (e) {}
    }
    function show() { start(); renderAll(); clearTimeout(S.shownAt); S.shownAt = setTimeout(marcarVistas, 5000); }
    document.addEventListener("click", function (ev) {
      var t = ev.target.closest("[data-nwt]"); if (t) { S.topic = t.dataset.nwt; segSet($("nwTopic"), "nwt", S.topic); S.src = null; renderSources(); renderList(); return; }
      var f = ev.target.closest("[data-nws]"); if (f) { S.src = f.dataset.nws || null; renderSources(); renderList(); }
    });
    return { show: show, start: start };
  })();
  NW.start();

  /* ---------------- contagem anônima de visitas (GoatCounter: sem cookies, sem identificar ninguém) ---------------- */
  var GC = (function () {
    var on = /^(www\.)?foradareta\.com\.br$/.test(location.hostname), ready = false, queue = [], last = null;
    function send(p) { try { window.goatcounter.count({ path: p }); } catch (e) {} }
    if (on) {
      window.goatcounter = { no_onload: true };
      var s = document.createElement("script");
      s.async = true; s.src = "https://gc.zgo.at/count.js";
      s.setAttribute("data-goatcounter", "https://foradareta.goatcounter.com/count");
      s.onload = function () { ready = true; queue.splice(0).forEach(send); };
      document.head.appendChild(s);
    }
    return { view: function (v) { if (!on || v === last) return; last = v; if (ready) send("/" + v); else queue.push("/" + v); } };
  })();
