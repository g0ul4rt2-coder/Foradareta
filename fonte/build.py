"""Junta perguntas, argumentos, candidatos, partidos e estudo em site/dados.json."""
import glob
import json
import os
import re
import sys

import markdown

BASE = os.path.dirname(os.path.abspath(__file__))
KEYS = None


def rd(p):
    with open(os.path.join(BASE, p), encoding="utf-8") as f:
        return json.load(f)


def check_pos(ent, label):
    pos = ent.get("posicoes") or {}
    missing = [k for k in KEYS if k not in pos]
    bad = [k for k, p in pos.items() if p and p.get("v") is not None and p["v"] not in (-2, -1, 0, 1, 2)]
    if missing or bad:
        print(f"[aviso] {label}: faltando={missing} invalidos={bad}", file=sys.stderr)
    for k in bad:
        pos[k]["v"] = max(-2, min(2, round(pos[k]["v"])))


def br(n, d=2):
    return f"{n:.{d}f}".replace(".", ",").replace("-", "−")


def fmt_classif(c):
    """Transforma o objeto de classificações acadêmicas em uma frase curta."""
    if not isinstance(c, dict):
        return c
    parts = []
    for k, v in c.items():
        if not isinstance(v, dict):
            continue
        if "nota_0a10" in v:
            ano = "2022" if "2025" in k else str(v.get("ano_survey", "2018"))
            cat = f", {v['categoria']}" if v.get("categoria") else ""
            parts.append(f"Bolognesi et al., survey {ano}: {br(v['nota_0a10'])} de 0 a 10{cat}")
        elif "estimativa_2021" in v:
            parts.append(f"Power e Zucco (BLS 2021): {br(v['estimativa_2021'])} de −1 a +1")
    return " · ".join(parts) or None



# Wikipédia não é fonte do site: links para wikis saem da saída publicada e menções a ela são limpas do texto.
WIKI = re.compile(r"https?://[^\s\"']*wiki[^\s\"']*", re.I)
MENC = [
    (re.compile(r"\(fonte: Wikip[eé]dia, que cita ([^)]+)\)", re.I), r"(fonte: \1)"),
    (re.compile(r"\(Wikip[eé]dia, citando ([^)]+)\)", re.I), r"(\1)"),
    (re.compile(r"\(([^()]*?),? via Wikip[eé]dia\)", re.I), r"(\1)"),
    (re.compile(r"\s*\((?:fonte: )?Wikip[eé]dia\)", re.I), ""),
    (re.compile(r",? via Wikip[eé]dia", re.I), ""),
    (re.compile(r"\s*\(fonte: Wikip[eé]dia\)", re.I), ""),
    (re.compile(r"\s*\(via Wikip[eé]dia\)", re.I), ""),
    (re.compile(r"\s*\(([^()]*?):\s*fonte Wikip[eé]dia\)", re.I), ""),
    (re.compile(r",? segundo a Wikip[eé]dia", re.I), ""),
    (re.compile(r",? segundo reportagens reunidas no verbete '[^']+' da Wikip[eé]dia", re.I), ", segundo reportagens da época"),
    (re.compile(r"A Wikip[eé]dia registra ainda", re.I), "Há registro ainda de"),
    (re.compile(r"A Wikip[eé]dia registra (o|a) candidat(o|a) entre os que apoiam", re.I), r"\1 candidat\2 aparece entre os que apoiam"),
]
def sem_wiki(o):
    if isinstance(o, dict):
        out = {}
        for k, v in o.items():
            if isinstance(v, str) and WIKI.fullmatch(v.strip()):
                out[k] = None
                continue
            out[k] = sem_wiki(v)
        if out.get("url", 1) is None and "url" in o:
            return None
        if isinstance(out.get("autor"), str) and re.fullmatch(r"Wikip[eé]dia", out["autor"], re.I):
            return None
        return out
    if isinstance(o, list):
        return [x for x in (sem_wiki(v) for v in o) if x is not None and not (isinstance(x, str) and WIKI.fullmatch(x.strip()))]
    if isinstance(o, str):
        for rx, rep in MENC: o = rx.sub(rep, o)
        return o
    return o

perg = rd("perguntas.json")["perguntas"]
KEYS = [q["id"] for q in perg]
cands = []
for p in sorted(glob.glob(os.path.join(BASE, "candidatos", "*.json"))):
    with open(p, encoding="utf-8") as f:
        c = json.load(f)
    check_pos(c, c.get("id"))
    cands.append(c)

partidos = []
if os.path.exists(os.path.join(BASE, "partidos.json")):
    partidos = rd("partidos.json")["partidos"]
    for p in partidos:
        p.setdefault("id", p.get("sigla", "").lower())
        p["classificacao_academica"] = fmt_classif(p.get("classificacao_academica"))
        # Z02 e Z03: as votações disponíveis (anistia, dosimetria, Ramagem, prisões de deputados) não medem
        # diretamente apoio a intervenção militar nem a descumprimento de decisão judicial; ficam só como contexto.
        for k in ("Z02", "Z03"):
            q = p.get("posicoes", {}).get(k)
            if q and q.get("p") is not None:
                q["base_p"] = "Não pontuado: as votações abaixo não medem diretamente esta afirmação. Contexto: " + (q.get("base_p") or "")
                q["p"] = None
        vp = (p.get("vparty") or {}).get("valores") or {}
        ap = (vp.get("v2xpa_antiplural") or {}).get("valor") if isinstance(vp.get("v2xpa_antiplural"), dict) else None
        if ap is not None:
            p["vparty_txt"] = (f"índice de antipluralismo {br(ap)} (escala de 0 a 1; quanto maior, menor o compromisso com o pluralismo "
                               f"democrático), eleição de 2018. {(p['vparty'].get('obs') or '')}").strip()
        check_pos(p, p.get("sigla"))

estudo_html = ""
if os.path.exists(os.path.join(BASE, "estudo.md")):
    with open(os.path.join(BASE, "estudo.md"), encoding="utf-8") as f:
        md = f.read()
    # o título principal já está na página; rebaixa # para ###
    md = re.sub(r"^# .*\n", "", md, count=1)
    md = re.sub(r"^## \([a-d]\) ", "## ", md, flags=re.M)
    md = md.replace("à Bússola Política", "ao Fora da Reta").replace("Bússola Política", "Fora da Reta")
    md = "\n".join(("###" + l.lstrip("#")) if l.startswith("#") and not l.startswith("###") else l for l in md.splitlines())
    estudo_html = markdown.markdown(md, extensions=["tables"])
    estudo_html = estudo_html.replace("<a href=", '<a target="_blank" rel="noopener" href=')

# foto oficial (TSE) de cada candidato, pelo número de urna
t1 = rd("site/turno1.json")
sq_by_num = {c["n"]: c["sq"] for c in t1["br"]["c"]}
for c in cands:
    sq = sq_by_num.get(str(c.get("numero")))
    if sq and os.path.exists(os.path.join(BASE, "site", "fotos", sq + ".jpeg")):
        c["foto"] = "fotos/" + sq + ".jpeg"

meta = rd("meta.json")
out = {
    "atualizado_em": meta["atualizado_em"],
    "nota_atualizacao": meta.get("nota_atualizacao", ""),
    "eleicao": meta["eleicao"],
    "perguntas": perg,
    "argumentos": rd("argumentos.json"),
    "candidatos": cands,
    "partidos": partidos,
    "estudo_html": estudo_html,
    "explicacoes": rd("explicacoes.json"),
}
# conteúdo educativo, carregado sob demanda pela página
cont = {"fenomenos": [], "linhas": {}}
for fn in ("fenomenos1.json", "fenomenos2.json"):
    if os.path.exists(os.path.join(BASE, fn)):
        cont["fenomenos"] += rd(fn)
for fn in ("poder.json", "glossario.json"):
    # poder.json só entra depois da auditoria (arquivo poder.AUDITADO criado pelo editor)
    if fn == "poder.json" and not os.path.exists(os.path.join(BASE, "poder.AUDITADO")):
        continue
    if os.path.exists(os.path.join(BASE, fn)):
        cont[fn[:-5]] = rd(fn)
# linhas do tempo só entram depois da auditoria (arquivo linhas/AUDITADO criado pelo editor)
for p in (sorted(glob.glob(os.path.join(BASE, "linhas", "*.json"))) if os.path.exists(os.path.join(BASE, "linhas", "AUDITADO")) else []):
    with open(p, encoding="utf-8") as f:
        t = json.load(f)
    t["eventos"] = sorted(t.get("eventos", []), key=lambda e: str(e.get("data", "")))
    cont["linhas"][os.path.basename(p)[:-5]] = t
cont = sem_wiki(cont)
with open(os.path.join(BASE, "site", "conteudo.json"), "w", encoding="utf-8") as f:
    json.dump(cont, f, ensure_ascii=True, separators=(",", ":"))
print("conteudo:", len(cont["fenomenos"]), "fenômenos,", len(cont["linhas"]), "linhas do tempo,", "poder" in cont, "glossario" in cont)

with open(os.path.join(BASE, "site", "dados.json"), "w", encoding="utf-8") as f:
    json.dump(sem_wiki(out), f, ensure_ascii=True, separators=(",", ":"))
print(f"ok: {len(cands)} candidatos, {len(partidos)} partidos, estudo {len(estudo_html)} chars")
