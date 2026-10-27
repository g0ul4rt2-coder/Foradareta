"""Coleta manchetes de política e eleições de veículos e órgãos oficiais (feeds RSS públicos) e grava noticias.json.

Uso: python3 coletar.py saida.json
Só título, link, veículo, horário e um trecho curto do resumo publicado no próprio feed. Os títulos não são editados.
"""
import concurrent.futures as cf
import email.utils
import html
import json
import os
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

FONTES = [
    # (veículo, url do feed, só política?)  — o filtro de política/eleição vale para feeds gerais
    ("Agência Brasil", "https://agenciabrasil.ebc.com.br/rss/politica/feed.xml", True),
    ("Agência Brasil", "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", False),
    ("Agência Câmara", "https://www.camara.leg.br/noticias/rss/ultimas-noticias", True),
    ("Agência Senado", "https://www12.senado.leg.br/noticias/rss", True),
    ("g1", "https://g1.globo.com/rss/g1/politica/", True),
    ("Folha", "https://feeds.folha.uol.com.br/poder/rss091.xml", True),
    ("Estadão", "https://www.estadao.com.br/arc/outboundfeeds/feeds/rss/sections/politica/", True),
    ("Valor", "https://valor.globo.com/rss/valor/politica/", True),
    ("CNN Brasil", "https://www.cnnbrasil.com.br/feed/", False),
    ("BBC News Brasil", "https://feeds.bbci.co.uk/portuguese/rss.xml", False),
    ("Poder360", "https://www.poder360.com.br/feed/", False),
    ("Metrópoles", "https://www.metropoles.com/politica-brasil/feed", True),
    ("Correio Braziliense", "https://www.correiobraziliense.com.br/politica/rss.xml", True),
]
ELEICAO = re.compile(r"elei[cç][aãõo]|apura[cç]|segundo turno|2º turno|1º turno|urna|\bTSE\b|\bTREs?\b|vot(o|a|ação|ar|ou|aram|ante|antes)\b|eleitor|candidat|boca de urna|pesquisa (eleitoral|datafolha|quaest|atlas)|datafolha|quaest|atlasintel|ipec|governador|lula|fl[aá]vio bolsonaro|apura", re.I)
POLITICA = re.compile(ELEICAO.pattern + r"|congresso|c[aâ]mara|senado|stf|supremo|minist[ré]|planalto|governo|deputad|senador|presidente|partido|pol[ií]tic", re.I)
UA = "Mozilla/5.0 (compatible; ForaDaRetaBot/1.0; +https://foradareta.com.br)"


def baixar(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read()


def limpar(t, n=None):
    t = html.unescape(re.sub(r"<[^>]+>", " ", t or ""))
    t = re.sub(r"\s+", " ", t).strip()
    if n and len(t) > n:
        t = t[: n].rsplit(" ", 1)[0].rstrip(",.;:") + "…"
    return t


def data_iso(s):
    if not s:
        return None
    s = s.strip()
    try:
        d = email.utils.parsedate_to_datetime(s)
    except Exception:
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except Exception:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def ler(fonte):
    nome, url, so_politica = fonte
    try:
        root = ET.fromstring(baixar(url))
    except Exception as e:
        return nome, [], str(e)[:80]
    ns = {"a": "http://www.w3.org/2005/Atom", "dc": "http://purl.org/dc/elements/1.1/"}
    out = []
    itens = root.findall(".//item") or root.findall(".//a:entry", ns)
    for it in itens:
        t = limpar(it.findtext("title") or it.findtext("a:title", namespaces=ns))
        link = (it.findtext("link") or "").strip()
        if not link:
            l = it.find("a:link", ns)
            link = l.get("href") if l is not None else ""
        d = data_iso(it.findtext("pubDate") or it.findtext("dc:date", namespaces=ns) or it.findtext("a:updated", namespaces=ns) or it.findtext("a:published", namespaces=ns))
        resumo = limpar(it.findtext("description") or it.findtext("a:summary", namespaces=ns), 220)
        if not t or not link.startswith("http"):
            continue
        texto = t + " " + resumo
        ele = bool(ELEICAO.search(texto))
        if not so_politica and not POLITICA.search(texto):
            continue
        out.append({"t": t, "u": link, "f": nome, "d": d, "r": resumo if resumo.lower() != t.lower() else "", "e": ele})
    return nome, out, None


def main(saida):
    agora = datetime.now(timezone.utc)
    antigos = []
    if os.path.exists(saida):
        try:
            antigos = json.load(open(saida)).get("itens", [])
        except Exception:
            antigos = []
    erros, novos = {}, []
    with cf.ThreadPoolExecutor(8) as ex:
        for nome, itens, err in ex.map(ler, FONTES):
            if err:
                erros[nome] = err
            novos += itens
    visto, todos = set(), []
    def chave(x):
        return re.sub(r"[^a-z0-9]", "", x["u"].split("?")[0].lower())[-120:]
    def chave_t(x):
        return re.sub(r"[^a-z0-9]", "", limpar(x["t"]).lower())[:70]
    for x in novos + antigos:  # novos primeiro: ganham na deduplicação
        k1, k2 = chave(x), x["f"] + chave_t(x)
        if k1 in visto or k2 in visto:
            continue
        visto.add(k1); visto.add(k2)
        if not x.get("d"):
            x["d"] = agora.strftime("%Y-%m-%dT%H:%M:%SZ")
        # ignora horários no futuro (erro de fuso no feed) e o que tiver mais de 3 dias
        try:
            dt = datetime.strptime(x["d"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        except Exception:
            continue
        if (dt - agora).total_seconds() > 600:
            x["d"] = agora.strftime("%Y-%m-%dT%H:%M:%SZ")
        if (agora - dt).total_seconds() > 3 * 86400:
            continue
        todos.append(x)
    todos.sort(key=lambda x: x["d"], reverse=True)
    # equilíbrio entre veículos: no máximo 40 manchetes de cada um
    por, bal = {}, []
    for x in todos:
        por[x["f"]] = por.get(x["f"], 0) + 1
        if por[x["f"]] <= 40:
            bal.append(x)
    todos = bal[:400]
    out = {"atualizado": agora.strftime("%Y-%m-%dT%H:%M:%SZ"), "fontes": sorted({f[0] for f in FONTES}), "erros": erros, "itens": todos}
    tmp = saida + ".tmp"
    with open(tmp, "w") as f:
        json.dump(out, f, ensure_ascii=True, separators=(",", ":"))
    os.replace(tmp, saida)
    print(f"{len(todos)} manchetes ({sum(1 for x in todos if x['e'])} sobre eleições); erros: {erros}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "noticias.json")
