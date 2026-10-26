# -*- coding: utf-8 -*-
"""Coletor do acompanhamento político (Fora da Reta).

Fontes oficiais, sem chave:
  Câmara  https://dadosabertos.camara.leg.br/api/v2
  Senado  https://legis.senado.leg.br/dadosabertos
  TSE     https://resultados.tse.jus.br (eleitos de 2026, uma vez)

Saída em <out>/pol/:
  index.json            votações nominais de plenário (Câmara e Senado), mais recentes primeiro
  v/<vid>.json          voto de cada parlamentar numa votação
  p/<pid>.json          linha do tempo de um parlamentar (votos, projetos, discursos)
  parlamentares.json    deputados e senadores em exercício
  semana.json           o que o plenário decidiu nos últimos dias e a pauta da Câmara
  eleitos2026.json      eleitos em 2026 por UF (gerado com --eleitos)

Uso:  python3 coletar.py --out site [--desde 2025-01-01] [--perfis] [--eleitos]
  sem --perfis só atualiza votações e semana (rápido, roda todo dia);
  --perfis também busca projetos e discursos de cada parlamentar (mais lento).
"""
import argparse, datetime as dt, json, os, re, sys, time, urllib.request, urllib.error
import concurrent.futures as cf

CAM = "https://dadosabertos.camara.leg.br/api/v2"
SEN = "https://legis.senado.leg.br/dadosabertos"
TSE = "https://resultados.tse.jus.br/oficial/ele2026"
UA = "ForaDaReta/1.0 (+https://foradareta.com.br)"
HOJE = dt.date.today()


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(2 * (i + 1))
        except Exception:
            time.sleep(2 * (i + 1))
    print("falhou:", url, file=sys.stderr)
    return None


def cam(path):
    d = get(CAM + path)
    return d.get("dados") if isinstance(d, dict) else None


def cam_all(path):
    """Pagina uma listagem da Câmara (itens=100)."""
    out, pg = [], 1
    sep = "&" if "?" in path else "?"
    while True:
        d = get("%s%s%sitens=100&pagina=%d" % (CAM, path, sep, pg))
        if not d or not d.get("dados"):
            break
        out += d["dados"]
        if not any(l.get("rel") == "next" for l in d.get("links", [])):
            break
        pg += 1
    return out


def rd(p, default):
    try:
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def wr(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, p)


def periodos(desde, ate, dias):
    a = desde
    while a <= ate:
        b = min(a + dt.timedelta(days=dias - 1), ate)
        yield a, b
        a = b + dt.timedelta(days=1)


VOTO = {"Sim": "S", "Não": "N", "Abstenção": "A", "Obstrução": "O", "Artigo 17": "P"}


def voto_cod(t):
    t = (t or "").strip()
    if t in VOTO:
        return VOTO[t]
    t = t.lower()
    if t.startswith("sim"): return "S"
    if t.startswith("não") or t.startswith("nao"): return "N"
    if t.startswith("abst"): return "A"
    if t.startswith("obst"): return "O"
    if "presidente" in t or t.startswith("p-nrv") or "art. 17" in t or "artigo 17" in t: return "P"
    return "X"  # ausente, licença, missão etc.


def curto(s, n=240):
    s = re.sub(r"\s+", " ", s or "").strip()
    return s if len(s) <= n else s[: n - 1].rsplit(" ", 1)[0] + "…"


# ---------------- Câmara ----------------
def prop_da_votacao(d):
    ps = d.get("proposicoesAfetadas") or []
    if not ps:
        u = (d.get("ultimaApresentacaoProposicao") or {}).get("uriProposicaoCitada")
        if u:
            p = cam("/proposicoes/" + u.rsplit("/", 1)[1])
            if p:
                ps = [p]
    if not ps:
        return None
    p = ps[0]
    return {"id": p.get("id"), "sigla": "%s %s/%s" % (p.get("siglaTipo"), p.get("numero"), p.get("ano")),
            "ementa": curto(p.get("ementa"), 300)}


def camara_votacoes(desde, ate, idx, out, vazias):
    vistos = {v["id"] for v in idx} | {"c" + i for i in vazias}
    lista = []
    for a, b in periodos(desde, ate, 90):
        lista += cam_all("/votacoes?idOrgao=180&dataInicio=%s&dataFim=%s&ordem=ASC&ordenarPor=dataHoraRegistro" % (a, b))
    novos = [x for x in lista if "c" + x["id"] not in vistos]
    print("Câmara: %d votações de plenário no período, %d novas para checar" % (len(lista), len(novos)))

    def um(x):
        votos = cam("/votacoes/%s/votos" % x["id"])
        if votos is not None and not votos:
            vazias.add(x["id"])  # votação simbólica: não há voto individual, não precisa checar de novo
        if not votos:
            return None
        d = cam("/votacoes/" + x["id"]) or x
        ori = {}
        for o in cam("/votacoes/%s/orientacoes" % x["id"]) or []:
            if o.get("orientacaoVoto"):
                ori[o["siglaPartidoBloco"]] = o["orientacaoVoto"]
        vs, plac = [], {"S": 0, "N": 0, "A": 0, "O": 0}
        for v in votos:
            dp = v.get("deputado_") or {}
            c = voto_cod(v.get("tipoVoto"))
            if c in plac: plac[c] += 1
            vs.append([dp.get("id"), dp.get("nome"), dp.get("siglaPartido"), dp.get("siglaUf"), c])
        vid = "c" + x["id"]
        wr(os.path.join(out, "v", vid + ".json"), {"id": vid, "votos": vs})
        return {"id": vid, "casa": "camara", "data": x["data"], "hora": (d.get("dataHoraRegistro") or "")[11:16],
                "desc": curto(d.get("descricao"), 300), "aprov": bool(d.get("aprovacao")), "prop": prop_da_votacao(d),
                "fase": curto(d.get("descUltimaAberturaVotacao"), 140), "placar": plac, "ori": ori}

    with cf.ThreadPoolExecutor(5) as ex:
        for r in ex.map(um, novos):
            if r: idx.append(r)
    return lista


# ---------------- Senado ----------------
def senado_votacoes(desde, ate, idx, out):
    """Refaz as votações do Senado no período. Placar oficial e orientação das lideranças vêm do serviço
    orientacaoBancada (os totais do serviço de votação vêm vazios); votações secretas entram só com o placar."""
    lo, hi = desde.isoformat(), ate.isoformat()
    idx[:] = [v for v in idx if not (v["casa"] == "senado" and lo <= (v["data"] or "") <= hi)]
    n = 0
    for a, b in periodos(desde, ate, 60):
        ob = get("%s/plenario/votacao/orientacaoBancada/%s/%s.json" % (SEN, a.strftime("%Y%m%d"), b.strftime("%Y%m%d"))) or {}
        oris = {}
        for o in (ob.get("votacoes") or []) if isinstance(ob, dict) else []:
            oris[str(o.get("sequencialVotacao"))] = o
        for x in get("%s/votacao?dataInicio=%s&dataFim=%s" % (SEN, a, b)) or []:
            vid = "s%s" % x.get("codigoSessaoVotacao")
            o = oris.get(str(x.get("sequencialVotacao"))) or {}
            secreta = x.get("votacaoSecreta") == "S"
            vs, plac = [], {"S": 0, "N": 0, "A": 0, "O": 0}
            for v in x.get("votos") or []:
                c = voto_cod(v.get("siglaVotoParlamentar"))
                if c in plac: plac[c] += 1
                vs.append([v.get("codigoParlamentar"), v.get("nomeParlamentar"), v.get("siglaPartidoParlamentar"), v.get("siglaUFParlamentar"), c])
            if o.get("qtdVotosSim") is not None:
                plac = {"S": int(o.get("qtdVotosSim") or 0), "N": int(o.get("qtdVotosNao") or 0), "A": int(o.get("qtdVotosAbstencao") or 0), "O": int(o.get("qtdObstrucoes") or 0)}
            elif secreta:
                continue
            if not secreta and vs:
                wr(os.path.join(out, "v", vid + ".json"), {"id": vid, "votos": vs})
            ori = {}
            for ol in o.get("orientacoesLideranca") or []:
                if ol.get("partido") and ol.get("voto"):
                    ori[ol["partido"]] = ol["voto"].capitalize()
            res = (x.get("resultadoVotacao") or "").upper()
            idx.append({"id": vid, "casa": "senado", "data": x.get("dataSessao"), "hora": "",
                        "desc": curto(x.get("descricaoVotacao"), 300), "aprov": (res == "A") if res in ("A", "R") else None,
                        "prop": {"id": x.get("codigoMateria"), "sigla": x.get("identificacao"), "ementa": curto(x.get("ementa"), 300)},
                        "fase": "", "placar": plac, "ori": ori, "secreta": secreta})
            n += 1
    print("Senado: %d votações no período" % n)


# ---------------- parlamentares ----------------
def parlamentares():
    deps = cam_all("/deputados?ordem=ASC&ordenarPor=nome") or []
    c = [[d["id"], d["nome"], d["siglaPartido"], d["siglaUf"]] for d in deps]
    s = []
    d = get(SEN + "/senador/lista/atual.json") or {}
    for p in (((d.get("ListaParlamentarEmExercicio") or {}).get("Parlamentares") or {}).get("Parlamentar") or []):
        i = p["IdentificacaoParlamentar"]
        s.append([int(i["CodigoParlamentar"]), i["NomeParlamentar"], i.get("SiglaPartidoParlamentar"), i.get("UfParlamentar")])
    print("Em exercício: %d deputados, %d senadores" % (len(c), len(s)))
    return {"c": c, "s": s}


def perfis(out, idx, parl, com_extras):
    """Uma linha do tempo por parlamentar: votos (de todas as votações coletadas) + projetos e discursos."""
    por = {}
    for v in idx:
        vf = rd(os.path.join(out, "v", v["id"] + ".json"), {})
        pre = "c" if v["casa"] == "camara" else "s"
        for pid, nome, partido, uf, c in vf.get("votos", []):
            por.setdefault(pre + str(pid), {"nome": nome, "votos": []})["votos"].append([v["id"], c, partido])
    ativos = {"c" + str(x[0]): x for x in parl["c"]}
    ativos.update({"s" + str(x[0]): x for x in parl["s"]})
    ids = set(por) | set(ativos)

    def extras(pid):
        if pid[0] != "c":
            return None
        n = pid[1:]
        ini = (HOJE - dt.timedelta(days=730)).isoformat()
        props = cam("/proposicoes?idDeputadoAutor=%s&dataApresentacaoInicio=%s&siglaTipo=PL,PEC,PLP,PDL&itens=30&ordem=DESC&ordenarPor=id" % (n, ini)) or []
        disc = cam("/deputados/%s/discursos?dataInicio=%s&dataFim=%s&itens=25&ordenarPor=dataHoraInicio&ordem=DESC" % (n, (HOJE - dt.timedelta(days=365)).isoformat(), HOJE.isoformat())) or []
        return {"props": [[p["id"], "%s %s/%s" % (p["siglaTipo"], p["numero"], p["ano"]), (p.get("dataApresentacao") or "")[:10], curto(p.get("ementa"), 220)] for p in props],
                "disc": [[(x.get("dataHoraInicio") or "")[:10], (x.get("faseEvento") or {}).get("titulo") or "", curto(x.get("sumario"), 320), x.get("urlTexto") or ""] for x in disc if x.get("sumario")]}

    ext = {}
    if com_extras:
        alvo = sorted(i for i in ids if i in ativos and i[0] == "c")
        with cf.ThreadPoolExecutor(5) as ex:
            for pid, e in zip(alvo, ex.map(extras, alvo)):
                if e is not None: ext[pid] = e
        print("Projetos e discursos: %d deputados" % len(ext))
    for pid in ids:
        f = os.path.join(out, "p", pid + ".json")
        old = rd(f, {})
        a = ativos.get(pid)
        obj = {"id": pid, "nome": a[1] if a else por[pid]["nome"], "partido": a[2] if a else None, "uf": a[3] if a else None,
               "ativo": bool(a), "votos": sorted(por.get(pid, {}).get("votos", []), key=lambda r: r[0])}
        e = ext.get(pid)
        obj["props"] = e["props"] if e else old.get("props", [])
        obj["disc"] = e["disc"] if e else old.get("disc", [])
        wr(f, obj)


# ---------------- semana ----------------
RUIDO = re.compile(r"Requerimento|Redação Final|pressupostos constitucionais|Encerramento da discussão|adiamento|retirada de pauta|Destaque", re.I)


def semana(out, idx):
    ini = HOJE - dt.timedelta(days=14)
    dec = []
    for x in cam_all("/votacoes?idOrgao=180&dataInicio=%s&dataFim=%s&ordem=DESC&ordenarPor=dataHoraRegistro" % (ini, HOJE)):
        dsc = x.get("descricao") or ""
        if not re.match(r"\s*(Aprovad|Rejeitad)", dsc) or RUIDO.search(dsc):
            continue
        nom = next((v for v in idx if v["id"] == "c" + x["id"]), None)
        prop = nom["prop"] if nom else prop_da_votacao(cam("/votacoes/" + x["id"]) or {})
        dec.append({"casa": "camara", "data": x["data"], "desc": curto(dsc, 260), "aprov": bool(x.get("aprovacao")),
                    "vid": nom["id"] if nom else None, "prop": prop})
    for v in idx:
        if v["casa"] == "senado" and v["data"] >= ini.isoformat():
            dec.append({"casa": "senado", "data": v["data"], "desc": v["desc"], "aprov": v["aprov"], "vid": v["id"], "prop": v["prop"]})
    dec.sort(key=lambda r: r["data"], reverse=True)
    pauta = []
    for e in cam("/eventos?idOrgao=180&dataInicio=%s&dataFim=%s&ordem=ASC&ordenarPor=dataHoraInicio" % (HOJE, HOJE + dt.timedelta(days=10))) or []:
        itens = cam("/eventos/%s/pauta" % e["id"]) or []
        pauta.append({"data": (e.get("dataHoraInicio") or "")[:16], "desc": curto(e.get("descricaoTipo") or e.get("descricao"), 120),
                      "itens": [curto("%s — %s" % ((i.get("proposicao_") or {}).get("siglaTipo", "") + " %s/%s" % ((i.get("proposicao_") or {}).get("numero", ""), (i.get("proposicao_") or {}).get("ano", "")), (i.get("proposicao_") or {}).get("ementa", "")), 200) for i in itens[:12]]})
    wr(os.path.join(out, "semana.json"), {"atualizado": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "decisoes": dec[:40], "pauta": pauta})
    print("Semana: %d decisões, %d sessões na pauta" % (len(dec), len(pauta)))


# ---------------- eleitos 2026 (TSE) ----------------
UFS = "ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to".split()


def eleitos_tse(out):
    def cands(js, cargo):
        r = []
        for c in js.get("carg", []):
            if c.get("cd") != cargo: continue
            for ag in c.get("agr", []):
                for p in ag.get("par", []):
                    for k in p.get("cand", []):
                        if k.get("e") == "s" or (k.get("st") or "").lower().startswith("eleito"):
                            r.append({"nome": k.get("nmu"), "partido": p.get("sg"), "votos": int(k.get("vap") or 0), "pct": k.get("pvap"), "st": k.get("st")})
        return sorted(r, key=lambda x: -x["votos"])

    res = {}
    for uf in UFS:
        e = {}
        for cargo, chave in (("5", "senadores"), ("6", "deputados")):
            js = get("%s/6259/dados/%s/%s-c%04d-e006259-u.json" % (TSE, uf, uf, int(cargo)))
            e[chave] = cands(js or {}, cargo)
        gov = []
        if uf != "df" or True:
            js2 = get("%s/6260/dados/%s/%s-c0003-e006260-u.json" % (TSE, uf, uf))
            gov = cands(js2 or {}, "3")
            if not gov:
                gov = cands(get("%s/6259/dados/%s/%s-c0003-e006259-u.json" % (TSE, uf, uf)) or {}, "3")
        e["governador"] = gov[:1]
        res[uf.upper()] = e
        time.sleep(0.3)
    wr(os.path.join(out, "eleitos2026.json"), {"fonte": "TSE — resultados oficiais 2026", "por_uf": res})
    print("Eleitos 2026: %d UFs" % len(res))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="site")
    ap.add_argument("--desde", default=None)
    ap.add_argument("--perfis", action="store_true")
    ap.add_argument("--eleitos", action="store_true")
    ap.add_argument("--so-senado", action="store_true")
    a = ap.parse_args()
    out = os.path.join(a.out, "pol")
    os.makedirs(out, exist_ok=True)
    idx_path = os.path.join(out, "index.json")
    idx0 = rd(idx_path, {})
    simb_path = os.path.join(out, "simbolicas.json")
    idx, vazias = idx0.get("votacoes", []), set(rd(simb_path, []))
    desde = dt.date.fromisoformat(a.desde) if a.desde else HOJE - dt.timedelta(days=20)
    if not a.so_senado:
        camara_votacoes(desde, HOJE, idx, out, vazias)
    senado_votacoes(desde, HOJE, idx, out)
    idx.sort(key=lambda v: (v["data"], v.get("hora") or "", v["id"]), reverse=True)
    wr(idx_path, {"atualizado": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "votacoes": idx})
    wr(simb_path, sorted(vazias))
    parl = parlamentares()
    if parl["c"] and parl["s"]:
        wr(os.path.join(out, "parlamentares.json"), parl)
    else:
        parl = rd(os.path.join(out, "parlamentares.json"), {"c": [], "s": []})
    perfis(out, idx, parl, a.perfis)
    semana(out, idx)
    if a.eleitos:
        eleitos_tse(out)


if __name__ == "__main__":
    main()
