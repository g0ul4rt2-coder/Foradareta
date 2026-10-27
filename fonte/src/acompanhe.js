  /* ---------------- acompanhamento: início, votações, políticos, promessas ---------------- */
  var ACP = (function () {
    var P = {}, DEEP = location.hash;
    var VLBL = { S: "Sim", N: "Não", A: "Abstenção", O: "Obstrução", P: "Presidiu", X: "Não votou" };
    var CASA = { camara: "Câmara", senado: "Senado" };
    var UFS = Object.keys(UFN2).sort(function (a, b) { return UFN2[a].localeCompare(UFN2[b]); });
    var MERITO = /Requerimento|Destaque|adiamento|Encerramento|retirada de pauta|Redação Final|pressupostos/i;

    function J(u) { return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); }
    function get(k, u, fallback) {
      if (!P[k]) P[k] = J(u).catch(function () { P[k] = null; return fallback; });
      return P[k];
    }
    function idx() { return get("idx", "pol/index.json", { votacoes: [] }); }
    function parl() { return get("parl", "pol/parlamentares.json", { c: [], s: [] }); }
    function sem() { return get("sem", "pol/semana.json", { decisoes: [], pauta: [] }); }
    function exp() { return get("exp", "explicadas.json", { fichas: [] }); }
    function prom() { return get("prom", "promessas.json", { itens: [] }); }
    function eleitos() { return get("ele", "pol/eleitos2026.json", { por_uf: {} }); }
    function vfile(vid) { return get("v" + vid, "pol/v/" + vid + ".json", { votos: [] }); }
    function pfile(pid) { return get("p" + pid, "pol/p/" + pid + ".json", null); }

    function uf() { var u = load("fdr.uf"); return u && UFN2[u] ? u : null; }
    function setUf(u) { store("fdr.uf", u); }
    function ufOptions(sel, withBlank) {
      if (sel.options.length) { sel.value = uf() || ""; return; }
      sel.innerHTML = (withBlank ? '<option value="">Escolha…</option>' : "") + UFS.map(function (u) { return '<option value="' + u + '">' + UFN2[u] + "</option>"; }).join("");
      sel.value = uf() || (withBlank ? "" : "sp");
    }
    function answers() { return load("fdr.vi") || {}; }
    function dataBR(s) { if (!s) return ""; var p = String(s).slice(0, 10).split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : s; }
    function placarTxt(p) { if (!p) return ""; var t = p.S + " sim · " + p.N + " não"; if (p.A) t += " · " + p.A + " abst."; if (p.O) t += " · " + p.O + " obstr."; return t; }
    function resChip(aprov) { return aprov == null ? "" : '<span class="rchip ' + (aprov ? "ok" : "no") + '">' + (aprov ? "Aprovada" : "Rejeitada") + "</span>"; }
    function vchip(c) { return '<span class="vchip v' + c + '">' + VLBL[c] + "</span>"; }
    function photo(pid) {
      var n = String(pid).slice(1);
      return pid[0] === "c" ? "https://www.camara.leg.br/internet/deputado/bandep/" + n + ".jpg" : "https://legis.senado.leg.br/senadores/fotos-oficiais/" + n;
    }
    function perfilUrl(pid) {
      var n = String(pid).slice(1);
      return pid[0] === "c" ? "https://www.camara.leg.br/deputados/" + n : "https://www25.senado.leg.br/web/senadores/senador/-/perfil/" + n;
    }
    function propUrl(v) {
      if (!v.prop || !v.prop.id) return null;
      return v.casa === "camara" ? "https://www.camara.leg.br/propostas-legislativas/" + v.prop.id : "https://www25.senado.leg.br/web/atividade/materias/-/materia/" + v.prop.id;
    }
    function titleOf(v, f) {
      if (f) return f.titulo;
      var s = v.prop ? v.prop.sigla + ": " + (v.prop.ementa || "") : v.desc;
      return s.length > 170 ? s.slice(0, 169).replace(/\s\S*$/, "") + "…" : s;
    }
    function fichaOf(E, vid) { return (E.fichas || []).filter(function (f) { return f.id === vid; })[0] || null; }
    function srcA(u, label) { return u ? " " + link(u, label) : ""; }
    // partido do parlamentar dentro da sigla do bloco ("Fdr PT-PCdoB-PV" contém PT)
    function oriDoPartido(ori, partido) {
      if (!ori || !partido) return null;
      var P1 = String(partido).toUpperCase();
      for (var k in ori) {
        var toks = k.toUpperCase().replace(/^(FDR|BL)\s+/, "").split(/[^A-Z0-9ÇÃÕÁÉÍÓÚÂÊÔ]+/);
        if (k.toUpperCase() === P1 || toks.indexOf(P1) >= 0) return ori[k];
      }
      return null;
    }
    function oriCod(t) { t = (t || "").toLowerCase(); return t.indexOf("sim") === 0 ? "S" : t.indexOf("não") === 0 || t.indexOf("nao") === 0 ? "N" : t.indexOf("obstr") === 0 ? "O" : t.indexOf("abst") === 0 ? "A" : null; }

    /* ---------- cartões ---------- */
    function vxCard(f, V) {
      var v = V[f.id] || {}, a = answers()[f.id];
      return '<button class="vxCard" type="button" data-vot="' + esc(f.id) + '"><span class="eyebrow">' + esc(CASA[f.casa] || "") + " · " + esc(dataBR(f.data)) + " · " + esc(f.proposicao || "") + "</span>" +
        "<b>" + esc(f.titulo) + "</b>" +
        (f.manchete && f.manchete.texto ? '<span class="vxHead">Manchete: “' + esc(f.manchete.texto) + "”</span>" : "") +
        '<span class="vxFoot">' + resChip(v.aprov != null ? v.aprov : f.aprovada) + ((v.placar || f.placar) ? '<span class="small muted tab">' + placarTxt(v.placar || f.placar) + "</span>" : "") + (a && a !== "?" ? '<span class="small you">Você: ' + VLBL[a].toLowerCase() + "</span>" : "") + "</span></button>";
    }
    function decItem(d, E) {
      var f = d.vid ? fichaOf(E, d.vid) : null;
      var tag = f ? '<span class="xtag">Explicada</span>' : "";
      // o que é a proposta (ementa) em primeiro lugar; a descrição técnica da votação fica embaixo, menor
      var em = d.prop && d.prop.ementa ? curtoJ(d.prop.ementa, 190) : null;
      var body = '<span class="d tab">' + dataBR(d.data) + '</span><span class="c">' + esc(CASA[d.casa]) + '</span><span class="t">' + (d.prop && d.prop.sigla ? "<b>" + esc(d.prop.sigla) + "</b> " : "") + esc(f ? f.titulo : em || d.desc) + " " + tag + (!f && em && d.desc ? '<span class="sub">' + esc(curtoJ(d.desc, 160)) + "</span>" : "") + "</span>" + resChip(d.aprov);
      return d.vid ? '<li><button type="button" data-vot="' + esc(d.vid) + '">' + body + "</button></li>" : "<li><div>" + body + "</div></li>";
    }

    /* ---------- início ---------- */
    var homeDecAll = false;
    function inicio() {
      if (DEEP) { var m = DEEP.match(/^#(votacao|pessoa)-([cs][\w-]+)$/); DEEP = null; if (m) { if (m[1] === "votacao") { show("votacoes"); openVot(m[2]); } else { show("politicos"); openPessoa(m[2]); } return; } }
      ufOptions($("homeUf"), true);
      // a página inicial não carrega a lista completa de votações (arquivo grande): a ficha já traz o placar
      exp().then(function (E) {
        var V = {};
        var fs = (E.fichas || []).slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); }).slice(0, 3);
        $("homeVx").innerHTML = fs.length ? fs.map(function (f) { return vxCard(f, V); }).join("") : '<p class="muted small">As primeiras votações explicadas aparecem aqui em breve.</p>';
      });
      Promise.all([sem(), exp()]).then(function (r) {
        var S = r[0], E = r[1], ds = S.decisoes || [];
        $("semUpd").textContent = S.atualizado ? "Atualizado em " + dataBR(S.atualizado) : "";
        $("homeDec").innerHTML = ds.length ? ds.slice(0, homeDecAll ? 40 : 6).map(function (d) { return decItem(d, E); }).join("") : '<li class="muted small">Nenhuma decisão de plenário nos últimos 14 dias.</li>';
        $("homeDecMore").hidden = homeDecAll || ds.length <= 6;
        var pa = (S.pauta || []).filter(function (p) { return p.itens && p.itens.length; })[0];
        $("homePauta").innerHTML = pa ? '<div class="pautaBox"><p class="k">Na pauta da Câmara · ' + esc(dataBR(pa.data)) + " " + esc(pa.data.slice(11, 16)) + '</p><ul>' + pa.itens.slice(0, 6).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>" : "";
      });
      get("news", "noticias.json", { itens: [] }).then(function (N) {
        $("homeNews").innerHTML = (N.itens || []).slice(0, 6).map(function (x) {
          return '<li class="nwItem"><a href="' + esc(safeUrl(x.u) || "#") + '" target="_blank" rel="noopener"><span class="nwMeta"><b>' + esc(x.f) + "</b>" + esc(dataBR(x.d)) + " " + esc(String(x.d || "").slice(11, 16) ? new Date(x.d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "") + '</span><span class="nwTitle">' + esc(x.t) + "</span></a></li>";
        }).join("") || '<li class="muted small">Sem notícias no momento.</li>';
      });
      prom().then(function (Pr) { var n = (Pr.itens || []).length; if (n) $("homePromN").textContent = n + " compromissos acompanhados, com a situação e a fonte de cada um."; });
    }
    function curtoJ(s, n) { s = String(s || ""); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s\S*$/, "") + "…"; }
    function byId(I) { var m = {}; (I.votacoes || []).forEach(function (v) { m[v.id] = v; }); return m; }

    /* ---------- votações ---------- */
    var AL = { casa: "", q: "", n: 30 };
    function votacoes() {
      Promise.all([exp(), idx()]).then(function (r) {
        var E = r[0], I = r[1], V = byId(I);
        var fs = (E.fichas || []).slice().sort(function (a, b) { return String(b.data).localeCompare(String(a.data)); });
        $("vxList").innerHTML = fs.map(function (f) { return vxCard(f, V); }).join("") || '<p class="muted">Em preparação.</p>';
        renderAll(I, E);
      });
    }
    function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
    function renderAll(I, E) {
      var q = norm(AL.q).replace(/\s+/g, " ").trim();
      var L = (I.votacoes || []).filter(function (v) {
        if (AL.casa && v.casa !== AL.casa) return false;
        if (!q) return true;
        var f = fichaOf(E, v.id);
        return norm((v.prop ? v.prop.sigla + " " + v.prop.ementa : "") + " " + v.desc + " " + (f ? f.titulo : "")).replace(/\s+/g, " ").indexOf(q) >= 0;
      });
      $("allNote").textContent = (I.votacoes || []).length + " votações nominais de plenário desde fevereiro de 2025" + (I.atualizado ? " · atualizado em " + dataBR(I.atualizado) : "") + ".";
      $("allList").innerHTML = L.slice(0, AL.n).map(function (v) {
        return decItem({ casa: v.casa, data: v.data, desc: v.desc, aprov: v.aprov, vid: v.id, prop: v.prop }, E);
      }).join("") || '<li class="muted small">Nada encontrado.</li>';
      $("allMore").hidden = L.length <= AL.n;
    }
    $("allCasa").addEventListener("click", function (ev) { var b = ev.target.closest("[data-ac]"); if (!b) return; AL.casa = b.dataset.ac; AL.n = 30; segSet($("allCasa"), "ac", AL.casa); Promise.all([idx(), exp()]).then(function (r) { renderAll(r[0], r[1]); }); });
    $("allSearch").addEventListener("input", function () { AL.q = this.value; AL.n = 30; Promise.all([idx(), exp()]).then(function (r) { renderAll(r[0], r[1]); }); });
    $("allMore").addEventListener("click", function () { AL.n += 30; Promise.all([idx(), exp()]).then(function (r) { renderAll(r[0], r[1]); }); });
    $("homeDecMore").addEventListener("click", function () { homeDecAll = true; inicio(); });
    $("homeUf").addEventListener("change", function () { if (this.value) setUf(this.value); });
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-vot]"); if (b) { ev.preventDefault(); openVot(b.dataset.vot); return; }
      var p = ev.target.closest("[data-pes]"); if (p) { ev.preventDefault(); openPessoa(p.dataset.pes); return; }
      var a = ev.target.closest("[data-vi]"); if (a) { var s = answers(); s[a.dataset.vid] = a.dataset.vi; store("fdr.vi", s); openVot(a.dataset.vid, true); }
    });

    function porPartido(vs) {
      var m = {};
      vs.forEach(function (r) { var k = r[2] || "—"; var o = m[k] || (m[k] = { S: 0, N: 0, out: 0 }); if (r[4] === "S") o.S++; else if (r[4] === "N") o.N++; else o.out++; });
      return Object.keys(m).map(function (k) { return { p: k, c: m[k], t: m[k].S + m[k].N + m[k].out }; }).sort(function (a, b) { return b.t - a.t; });
    }
    function partyBars(vs) {
      return '<div class="ppBars">' + porPartido(vs).map(function (x) {
        var t = x.t || 1;
        return '<div class="ppRow"><span class="pp">' + esc(x.p) + '</span><span class="ppBar"><i class="s" style="width:' + (100 * x.c.S / t).toFixed(1) + '%"></i><i class="n" style="width:' + (100 * x.c.N / t).toFixed(1) + '%"></i></span><span class="small muted tab">' + x.c.S + " sim · " + x.c.N + " não" + (x.c.out ? " · " + x.c.out + " outro" + (x.c.out > 1 ? "s" : "") : "") + "</span></div>";
      }).join("") + '</div><p class="small muted ppLeg"><i class="s"></i> Sim <i class="n"></i> Não <span>“Outros”: abstenção, obstrução ou presidência da sessão.</span></p>';
    }
    function myReps(vs, casa, vid) {
      var u = uf(); if (!u) return '<p class="small muted">Escolha seu estado em <a href="#politicos" data-go="politicos">Políticos</a> para ver aqui como votaram os seus representantes.</p>';
      var mine = vs.filter(function (r) { return String(r[3]).toLowerCase() === u; });
      var a = answers()[vid];
      if (!mine.length) return '<p class="small muted">Nenhum parlamentar de ' + esc(UFN2[u]) + " registrou voto nesta votação.</p>";
      return '<p class="small muted">' + esc(UFN2[u]) + " · " + mine.length + (casa === "senado" ? " senadores" : " deputados") + ' que registraram voto. <a href="#" data-chuf="1">Trocar estado</a></p><ul class="repVotes">' + mine.sort(function (x, y) { return String(x[1]).localeCompare(String(y[1])); }).map(function (r) {
        var agree = a === "S" || a === "N" ? (r[4] === a ? '<span class="agree y">igual a você</span>' : r[4] === "S" || r[4] === "N" ? '<span class="agree n">diferente de você</span>' : "") : "";
        return '<li><button type="button" data-pes="' + (casa === "senado" ? "s" : "c") + r[0] + '"><span>' + esc(r[1]) + ' <span class="muted small">' + esc(r[2] || "") + "</span></span>" + vchip(r[4]) + agree + "</button></li>";
      }).join("") + "</ul>";
    }
    function allVotes(vs, casa) {
      return '<details class="allVotes"><summary>Ver o voto de cada um (' + vs.length + ')</summary><input type="search" class="avSearch" placeholder="Buscar nome, partido ou UF" aria-label="Buscar parlamentar nesta votação"><ul class="repVotes">' +
        vs.slice().sort(function (x, y) { return String(x[1]).localeCompare(String(y[1])); }).map(function (r) {
          return '<li data-k="' + esc(norm(r[1] + " " + r[2] + " " + r[3])) + '"><button type="button" data-pes="' + (casa === "senado" ? "s" : "c") + r[0] + '"><span>' + esc(r[1]) + ' <span class="muted small">' + esc((r[2] || "") + "-" + (r[3] || "")) + "</span></span>" + vchip(r[4]) + "</button></li>";
        }).join("") + "</ul></details>";
    }
    function oriBlock(v, f) {
      var rows = [];
      if (f && f.orientacoes && f.orientacoes.length) {
        var nota = f.orientacoes_nota ? '<p class="small muted" style="margin-top:8px">' + esc(f.orientacoes_nota) + "</p>" : "";
        rows = f.orientacoes.map(function (o) {
          return "<tr><td><b>" + esc(o.partido) + "</b></td><td>" + (oriCod(o.orientacao) ? vchip(oriCod(o.orientacao)) : esc(o.orientacao || "—")) + "</td><td>" + (o.justificativa ? esc(o.justificativa) + srcA(o.fonte) : '<span class="muted">Sem justificativa registrada.</span>') + "</td></tr>";
        });
        return '<div class="scroll"><table class="ptable oriT"><thead><tr><th>Partido ou bloco</th><th>Orientou</th><th>Por quê</th></tr></thead><tbody>' + rows.join("") + "</tbody></table></div>" + nota;
      }
      var ks = Object.keys(v.ori || {});
      if (f && f.posicionamentos && f.posicionamentos.length) return '<div class="scroll"><table class="ptable oriT"><thead><tr><th>Quem</th><th>Posição</th><th>Por quê</th></tr></thead><tbody>' + f.posicionamentos.map(function (o) { return "<tr><td><b>" + esc(o.partido) + "</b></td><td>" + esc(o.orientacao || "—") + "</td><td>" + (o.justificativa ? esc(o.justificativa) + srcA(o.fonte) : '<span class="muted">Sem justificativa registrada.</span>') + "</td></tr>"; }).join("") + '</tbody></table></div><p class="small muted" style="margin-top:8px">' + esc(f.orientacoes_nota || "Declarações públicas, não orientações formais de bancada.") + "</p>";
      if (!ks.length) return '<p class="small muted">' + (v.secreta ? "Em votação secreta não há orientação de bancada no painel." : "Os líderes não registraram orientação no painel desta votação.") + "</p>";
      return '<div class="oriChips">' + ks.map(function (k) { var c = oriCod(v.ori[k]); return '<span class="oc"><b>' + esc(k) + "</b> " + (c ? vchip(c) : esc(v.ori[k])) + "</span>"; }).join("") + '</div><p class="small muted" style="margin-top:8px">Orientação dada pelo líder de cada partido ou bloco antes da votação. A justificativa, quando existe, fica no discurso de encaminhamento, nas notas taquigráficas da sessão.</p>';
    }
    function openVot(vid, keepScroll) {
      Promise.all([idx(), exp(), vfile(vid)]).then(function (r) {
        var V = byId(r[0]), f = fichaOf(r[1], vid), v = V[vid] || (f ? { id: vid, casa: f.casa, data: f.data, prop: { sigla: f.proposicao }, aprov: f.aprovada, placar: f.placar, secreta: f.secreta, ori: {} } : null), vs = (r[2] || {}).votos || [];
        if (!v) { toast("Votação não encontrada."); return; }
        var a = answers()[vid], u = propUrl(v) || (f && f.url);
        var h = '<div class="vxSheet"><p class="eyebrow">' + esc(CASA[v.casa]) + " · " + esc(dataBR(v.data)) + (v.prop && v.prop.sigla ? " · " + esc(v.prop.sigla) : "") + "</p>" +
          '<h2 class="h3" style="margin-top:6px">' + esc(titleOf(v, f)) + "</h2>" +
          '<p class="vxRes">' + resChip(v.aprov) + '<span class="tab">' + placarTxt(v.placar) + "</span></p>" + (v.desc ? '<p class="small muted">' + esc(v.desc) + "</p>" : "");
        if (f) {
          if (f.atencao) h += '<p class="vxAtt"><b>Ponto de atenção.</b> ' + esc(f.atencao) + "</p>";
          h += '<div class="vxTwo">' +
            (f.manchete && f.manchete.texto ? '<div class="vxBox"><p class="k">A manchete</p><p class="q">“' + esc(f.manchete.texto) + '”</p><p class="small">' + link(f.manchete.fonte) + "</p></div>" : "") +
            '<div class="vxBox"><p class="k">O que o texto faz</p><ul>' + (f.o_que_faz || []).map(function (x) { return "<li>" + esc(x.texto) + srcA(x.fonte) + "</li>"; }).join("") + "</ul></div></div>" +
            '<div class="vxBox cost"><p class="k">Quanto custa</p><p>' + (f.custo && f.custo.texto ? esc(f.custo.texto) + srcA(f.custo.fonte) : '<span class="muted">' + esc(f.custo_nota || "Não encontramos estimativa de impacto feita por órgão técnico.") + "</span>") + "</p></div>" +
            '<h3 class="vxH">Os argumentos</h3><div class="vxTwo">' +
            '<div class="vxArg"><p class="k">A favor</p><ul>' + (f.favor || []).map(function (x) { return "<li>" + (x.quem ? "<b>" + esc(x.quem) + ":</b> " : "") + esc(x.texto) + srcA(x.fonte) + "</li>"; }).join("") + "</ul></div>" +
            '<div class="vxArg"><p class="k">Contra</p><ul>' + (f.contra || []).map(function (x) { return "<li>" + (x.quem ? "<b>" + esc(x.quem) + ":</b> " : "") + esc(x.texto) + srcA(x.fonte) + "</li>"; }).join("") + "</ul></div></div>" +
            (f.argumentos_nota ? '<p class="small muted" style="margin-top:8px">' + esc(f.argumentos_nota) + "</p>" : "") +
            '<div class="vxAsk"><p><b>E você, votaria como?</b> Depois de ler os dois lados.</p><div class="seg">' + ["S", "N", "?"].map(function (k) { return '<button type="button" data-vi="' + k + '" data-vid="' + esc(vid) + '" aria-pressed="' + (a === k) + '">' + (k === "?" ? "Não sei" : VLBL[k]) + "</button>"; }).join("") + '</div><p class="small muted">Sua resposta fica só neste aparelho e serve para mostrar quem votou igual a você.</p></div>';
        }
        h += '<h3 class="vxH">Seus representantes</h3>' + (v.secreta ? '<p class="small muted">Votação secreta: não há registro de como cada um votou.</p>' : myReps(vs, v.casa, vid)) +
          '<h3 class="vxH">Como cada partido orientou</h3>' + oriBlock(v, f) +
          '<h3 class="vxH">Votos por partido</h3>' + (vs.length ? partyBars(vs) + allVotes(vs, v.casa) : '<p class="small muted">' + (v.secreta ? "Votação secreta: pela Constituição, só o placar total é divulgado." : "Votos individuais indisponíveis.") + "</p>");
        if (f && f.proximos && f.proximos.length) h += '<h3 class="vxH">E agora?</h3><ul class="vxList">' + f.proximos.map(function (x) { return "<li>" + esc(x.texto) + srcA(x.fonte) + "</li>"; }).join("") + "</ul>";
        if (f && f.relacionadas && f.relacionadas.length) h += '<h3 class="vxH">Outras votações desta proposta</h3><ul class="vxList">' + f.relacionadas.map(function (x) { return '<li><button type="button" class="lnk" data-vot="' + esc(x.id) + '">' + esc(x.descricao || x.id) + "</button></li>"; }).join("") + "</ul>";
        h += '<p class="small muted vxFootNote">' + (f ? "Resumo do Fora da Reta a partir das fontes citadas em cada item" + (f.criterio ? ". Por que esta votação: " + esc(f.criterio) : "") + ". " : "Esta votação ainda não tem explicação detalhada. ") +
          "Votos: dados abertos " + (v.casa === "senado" ? "do Senado Federal" : "da Câmara dos Deputados") + ". " + (u ? link(u, "Ver a proposta no site oficial") + " · " : "") + '<a href="#metodo" data-go="metodo">Método</a></p></div>';
        var sc = keepScroll && $("sheet") ? $("sheet").scrollTop : 0;
        openSheet(h);
        if (sc) $("sheet").scrollTop = sc;
        try { history.replaceState(null, "", "#votacao-" + vid); } catch (e) {}
        var s = $("sheet").querySelector(".avSearch");
        if (s) s.addEventListener("input", function () { var q = norm(s.value); $("sheet").querySelectorAll(".allVotes li").forEach(function (li) { li.hidden = q && li.dataset.k.indexOf(q) < 0; }); });
        var ch = $("sheet").querySelector("[data-chuf]");
        if (ch) ch.addEventListener("click", function (ev) { ev.preventDefault(); closeSheet(); show("politicos"); });
      });
    }

    /* ---------- políticos ---------- */
    function politicos() {
      ufOptions($("polUf"), false);
      if (!uf()) setUf($("polUf").value);
      renderPol();
    }
    function tcase(s) { return String(s || "").toLowerCase().replace(/(^|[\s.(-])(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(Da|De|Do|Das|Dos|E)\b/g, function (m) { return m.toLowerCase(); }); }
    function card(pid, nome, sub, extra) {
      return '<button class="pcard" type="button" data-pes="' + esc(pid) + '"><span class="ph"><img loading="lazy" alt="" src="' + esc(photo(pid)) + '" onerror="this.style.visibility=\'hidden\'"></span><span><b>' + esc(nome) + '</b><span class="small muted">' + esc(sub) + "</span>" + (extra || "") + "</span></button>";
    }
    function concordancia(pids, cb) {
      var A = answers(), vids = Object.keys(A).filter(function (k) { return A[k] === "S" || A[k] === "N"; });
      if (!vids.length) return cb(null);
      Promise.all(vids.map(vfile)).then(function (fs) {
        var res = {};
        fs.forEach(function (f, i) {
          var pre = vids[i][0];
          (f.votos || []).forEach(function (r) {
            var pid = pre + r[0]; if (pids.indexOf(pid) < 0 || (r[4] !== "S" && r[4] !== "N")) return;
            var o = res[pid] || (res[pid] = { a: 0, n: 0 }); o.n++; if (r[4] === A[vids[i]]) o.a++;
          });
        });
        cb(res);
      });
    }
    function renderPol() {
      var u = uf() || "sp", q = norm($("polSearch").value).trim();
      Promise.all([parl(), eleitos(), get("cong", "congresso.json", null)]).then(function (r) {
        var Pl = r[0], El = (r[1].por_uf || {})[u.toUpperCase()] || {}, C = r[2];
        if (q) {
          var hits = Pl.c.map(function (x) { return ["c" + x[0], x[1], "Deputado(a) · " + x[2] + "-" + x[3]]; }).concat(Pl.s.map(function (x) { return ["s" + x[0], x[1], "Senador(a) · " + x[2] + "-" + x[3]]; }))
            .filter(function (x) { return norm(x[1] + " " + x[2]).indexOf(q) >= 0; }).slice(0, 60);
          $("polBody").innerHTML = '<div class="pgrid">' + hits.map(function (x) { return card(x[0], x[1], x[2]); }).join("") + "</div>" + (hits.length ? "" : '<p class="muted" style="margin-top:20px">Ninguém encontrado com esse nome entre os parlamentares em exercício.</p>');
          return;
        }
        var sens = Pl.s.filter(function (x) { return String(x[3]).toLowerCase() === u; });
        var deps = Pl.c.filter(function (x) { return String(x[3]).toLowerCase() === u; }).sort(function (a, b) { return a[1].localeCompare(b[1]); });
        var gov = (El.governador || [])[0];
        var antes = Date.now() < Date.UTC(2027, 1, 1);
        var h = '<div class="polSec"><p class="eyebrow">Executivo</p><div class="pgrid">' +
          '<a class="pcard exec" href="#promessas" data-go="promessas"><span class="ph"><img alt="" src="fotos/280002542548.jpeg" onerror="this.style.visibility=\'hidden\'"></span><span><b>Lula (PT)</b><span class="small muted">Presidente · mandato 2027–2030</span><span class="small you">Ver as promessas ›</span></span></a>' +
          (gov ? '<div class="pcard exec static"><span class="ph"></span><span><b>' + esc(tcase(gov.nome)) + " (" + esc(gov.partido) + ')</b><span class="small muted">Governador(a) eleito(a) de ' + esc(UFN2[u]) + " · " + esc(gov.pct || "") + "% dos votos válidos</span></span></div>" : "") +
          "</div></div>";
        h += '<div class="polSec"><p class="eyebrow">Senado · ' + sens.length + ' em exercício</p><div class="pgrid" id="polSen">' + sens.map(function (x) { return card("s" + x[0], x[1], x[2] + " · Senador(a)", '<span class="small you" data-aff="s' + x[0] + '"></span>'); }).join("") + "</div></div>";
        h += '<div class="polSec"><p class="eyebrow">Câmara · ' + deps.length + ' deputados em exercício</p><div class="pgrid" id="polDep">' + deps.map(function (x) { return card("c" + x[0], x[1], x[2] + " · Deputado(a)", '<span class="small you" data-aff="c' + x[0] + '"></span>'); }).join("") + "</div></div>";
        if (antes && C) {
          var ed = (C.deputados || []).filter(function (d) { return d.uf === u; }), es = (C.senadores || []).filter(function (d) { return d.uf === u && d.eleito === 2026; });
          h += '<details class="polSec eleitos"><summary><span class="eyebrow">Eleitos em 2026 · posse em 1º de fevereiro de 2027</span><span class="small muted">' + ed.length + " deputados e " + es.length + " senadores de " + esc(UFN2[u]) + "</span></summary>" +
            '<ul class="eleList">' + es.concat(ed).map(function (d) {
              var pid = d.cid ? "c" + d.cid : null, nm = tcase(d.nm);
              return "<li>" + (pid ? '<button type="button" data-pes="' + pid + '">' + esc(nm) + "</button>" : esc(nm)) + ' <span class="small muted">' + esc(d.partido) + " · " + (d.eleito === 2026 ? "Senado" : "Câmara") + (pid ? " · já é deputado(a)" : "") + "</span></li>";
            }).join("") + '</ul><p class="small muted">Fonte: TSE. Quem já está no Congresso tem a linha do tempo disponível; os demais passam a ter depois da posse.</p></details>';
        }
        h += '<p class="small muted" style="margin-top:28px">Dados abertos da Câmara dos Deputados, do Senado Federal e do TSE, atualizados todos os dias. Toque em um nome para ver a linha do tempo.</p>';
        $("polBody").innerHTML = h;
        concordancia(sens.map(function (x) { return "s" + x[0]; }).concat(deps.map(function (x) { return "c" + x[0]; })), function (res) {
          if (!res) return;
          document.querySelectorAll("#polBody [data-aff]").forEach(function (el) { var o = res[el.dataset.aff]; if (o && o.n) el.textContent = "Concorda com você em " + o.a + " de " + o.n; });
        });
      });
    }
    $("polUf").addEventListener("change", function () { setUf(this.value); renderPol(); });
    $("polSearch").addEventListener("input", renderPol);

    function openPessoa(pid) {
      Promise.all([pfile(pid), idx(), exp(), parl()]).then(function (r) {
        var p = r[0], V = byId(r[1]), E = r[2];
        if (!p) { toast("Ainda não há dados desta pessoa."); return; }
        var casa = pid[0] === "c" ? "camara" : "senado", A = answers();
        var gov = { a: 0, n: 0 }, par = { a: 0, n: 0 }, me = { a: 0, n: 0 };
        (p.votos || []).forEach(function (x) {
          var v = V[x[0]], c = x[1]; if (!v || (c !== "S" && c !== "N")) return;
          var g = oriCod((v.ori || {})["Governo"]); if (g === "S" || g === "N") { gov.n++; if (g === c) gov.a++; }
          var o = oriCod(oriDoPartido(v.ori, x[2])); if (o === "S" || o === "N") { par.n++; if (o === c) par.a++; }
          if (A[x[0]] === "S" || A[x[0]] === "N") { me.n++; if (A[x[0]] === c) me.a++; }
        });
        function pc(o) { return o.n ? Math.round(100 * o.a / o.n) + "%" : "—"; }
        var stats = '<div class="pStats"><div><p class="k">Votações nominais</p><p class="v tab">' + (p.votos || []).length + '</p><p class="s">com voto registrado desde fev/2025</p></div>' +
          (casa === "camara" ? '<div><p class="k">Com o governo</p><p class="v tab">' + pc(gov) + '</p><p class="s">em ' + gov.n + ' votações com orientação do governo</p></div><div><p class="k">Com o próprio partido</p><p class="v tab">' + pc(par) + '</p><p class="s">em ' + par.n + " votações com orientação do partido</p></div>" : "") +
          '<div><p class="k">Concorda com você</p><p class="v tab">' + (me.n ? me.a + "/" + me.n : "—") + '</p><p class="s">' + (me.n ? "nas votações explicadas que você respondeu" : "responda às votações explicadas para ver") + "</p></div></div>";
        // linha do tempo: votos de mérito, projetos e discursos, mais recentes primeiro
        var T = [];
        (p.votos || []).forEach(function (x) {
          var v = V[x[0]]; if (!v) return;
          var f = fichaOf(E, x[0]);
          if (!f && MERITO.test(v.desc)) return;
          T.push({ d: v.data, k: "v", f: !!f, h: '<button type="button" class="tlItem" data-vot="' + esc(x[0]) + '"><span class="tk">Votou</span>' + vchip(x[1]) + '<span class="tt">' + (v.prop && v.prop.sigla ? "<b>" + esc(v.prop.sigla) + "</b> " : "") + esc(f ? f.titulo : (v.prop && v.prop.ementa) || v.desc) + (f ? ' <span class="xtag">Explicada</span>' : "") + "</span></button>" });
        });
        (p.props || []).forEach(function (x) { T.push({ d: x[2], k: "p", h: '<a class="tlItem" href="https://www.camara.leg.br/propostas-legislativas/' + esc(x[0]) + '" target="_blank" rel="noopener"><span class="tk">Apresentou</span><span class="tt"><b>' + esc(x[1]) + "</b> " + esc(x[3]) + "</span></a>" }); });
        (p.disc || []).forEach(function (x) { T.push({ d: x[0], k: "d", h: '<div class="tlItem"><span class="tk">Discursou</span><span class="tt"><span class="small muted">' + esc(x[1]) + "</span> " + esc(x[2]) + (safeUrl(x[3]) ? " " + link(x[3], "íntegra") : "") + "</span></div>" }); });
        T.sort(function (a, b) { return String(b.d).localeCompare(String(a.d)); });
        var flt = '<div class="seg tlSeg" role="group" aria-label="Filtrar linha do tempo"><button type="button" data-tl="" aria-pressed="true">Tudo</button><button type="button" data-tl="v" aria-pressed="false">Votos</button>' + (casa === "camara" ? '<button type="button" data-tl="p" aria-pressed="false">Projetos</button><button type="button" data-tl="d" aria-pressed="false">Discursos</button>' : "") + "</div>";
        var h = '<div class="pHead"><span class="ph big"><img alt="" src="' + esc(photo(pid)) + '" onerror="this.style.visibility=\'hidden\'"></span><div><p class="eyebrow">' + (casa === "camara" ? "Deputado(a) federal" : "Senador(a)") + (p.ativo ? "" : " · fora do cargo") + '</p><h2 class="h3">' + esc(p.nome) + '</h2><p class="muted">' + esc((p.partido || "") + (p.uf ? " · " + UFN2[String(p.uf).toLowerCase()] : "")) + "</p><p class=\"small\">" + link(perfilUrl(pid), casa === "camara" ? "Perfil oficial, gastos e presença na Câmara" : "Perfil oficial no Senado") + "</p></div></div>" +
          stats + '<h3 class="vxH">Linha do tempo</h3>' + flt + '<ol class="tl" id="pTl"></ol><button class="pill soft small" type="button" id="pTlMore" hidden>Mostrar mais</button>' +
          '<p class="small muted vxFootNote">Votos de mérito em plenário (requerimentos e destaques ficam de fora), projetos apresentados nos últimos dois anos e resumos oficiais dos discursos, feitos pela Câmara. "Com o governo" e "com o próprio partido" comparam o voto com a orientação dada pelo líder antes de cada votação. <a href="#metodo" data-go="metodo">Método</a></p>';
        openSheet(h);
        try { history.replaceState(null, "", "#pessoa-" + pid); } catch (e) {}
        var st = { k: "", n: 25 };
        function draw() {
          var L = T.filter(function (t) { return !st.k || t.k === st.k; });
          $("pTl").innerHTML = L.slice(0, st.n).map(function (t) { return '<li><span class="d tab">' + dataBR(t.d) + "</span>" + t.h + "</li>"; }).join("") || '<li class="muted small">Nada registrado no período.</li>';
          $("pTlMore").hidden = L.length <= st.n;
        }
        draw();
        $("sheet").querySelector(".tlSeg").addEventListener("click", function (ev) { var b = ev.target.closest("[data-tl]"); if (!b) return; st.k = b.dataset.tl; st.n = 25; segSet(this, "tl", st.k); draw(); });
        $("pTlMore").addEventListener("click", function () { st.n += 25; draw(); });
      });
    }

    /* ---------- promessas ---------- */
    var PR = { s: "" };
    var SIT = { nao_iniciada: "Não iniciada", em_andamento: "Em andamento", parcial: "Cumprida em parte", cumprida: "Cumprida", abandonada: "Abandonada" };
    function promessas() {
      prom().then(function (D2) {
        var it = D2.itens || [], c = {};
        it.forEach(function (x) { c[x.situacao] = (c[x.situacao] || 0) + 1; });
        var doc = D2.documento || {};
        if (doc.titulo) $("prIntro").innerHTML = "Compromissos concretos do " + link(doc.url, "programa de governo da chapa Lula-Alckmin") + (doc.registrado_tse ? ", registrado no TSE," : "") + " e de falas da campanha. O novo mandato começa em 5 de janeiro de 2027. A situação de cada item é atualizada com fonte; \"não iniciada\" quer dizer que não encontramos ação em curso.";
        $("prStats").innerHTML = Object.keys(SIT).filter(function (k) { return c[k]; }).map(function (k) { return '<div><p class="v tab">' + c[k] + '</p><p class="k">' + SIT[k] + "</p></div>"; }).join("");
        $("prSeg").innerHTML = '<button type="button" data-ps="" aria-pressed="' + !PR.s + '">Todas (' + it.length + ")</button>" + Object.keys(SIT).filter(function (k) { return c[k]; }).map(function (k) { return '<button type="button" data-ps="' + k + '" aria-pressed="' + (PR.s === k) + '">' + SIT[k] + "</button>"; }).join("");
        var temas = {};
        it.filter(function (x) { return !PR.s || x.situacao === PR.s; }).forEach(function (x) { (temas[x.tema] = temas[x.tema] || []).push(x); });
        $("prList").innerHTML = Object.keys(temas).sort().map(function (t) {
          return '<div class="prTema"><h2 class="h3">' + esc(t) + "</h2>" + temas[t].map(function (x) {
            return '<div class="prItem"><div class="prTop"><b>' + esc(x.promessa) + '</b><span class="sit ' + esc(x.situacao) + '">' + esc(SIT[x.situacao] || x.situacao) + "</span></div>" +
              (x.citacao ? '<p class="q small">“' + esc(x.citacao) + "”</p>" : "") +
              '<p class="small muted">' + (x.origem === "campanha" ? "Fala de campanha" : "Plano de governo" + (x.pagina ? ", p. " + esc(x.pagina) : "")) + srcA(x.fonte, "fonte") +
              (x.situacao_texto ? " · " + esc(x.situacao_texto) + srcA(x.situacao_fonte, "fonte") : "") + "</p></div>";
          }).join("") + "</div>";
        }).join("") || '<p class="muted" style="margin-top:28px">A lista de promessas está sendo preparada.</p>';
      });
    }
    $("prSeg").addEventListener("click", function (ev) { var b = ev.target.closest("[data-ps]"); if (!b) return; PR.s = b.dataset.ps; promessas(); });

    /* ---------- eleições 2026 (arquivo) ---------- */
    function eleicoes() {
      get("apf", "apuracao.json", null).then(function (a) {
        var b = a && a.br; if (!b || !b.c) return;
        var c = b.c.slice().sort(function (x, y) { return y.p - x.p; });
        $("elResumo").textContent = "No 2º turno, em 25 de outubro de 2026, " + c[0].nm.replace(/\b(\w)(\w*)/g, function (m, x, y) { return x + y.toLowerCase(); }) + " teve " + String(c[0].p.toFixed(2)).replace(".", ",") + "% dos votos válidos e " + c[1].nm.replace(/\b(\w)(\w*)/g, function (m, x, y) { return x + y.toLowerCase(); }) + ", " + String(c[1].p.toFixed(2)).replace(".", ",") + "% (TSE, " + String(b.s.p.toFixed(2)).replace(".", ",") + "% das seções totalizadas). Aqui ficam o resultado, os mapas e o perfil de cada candidato.";
      });
    }

    return { inicio: inicio, votacoes: votacoes, politicos: politicos, promessas: promessas, eleicoes: eleicoes, openVot: openVot, openPessoa: openPessoa };
  })();
