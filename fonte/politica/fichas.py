# -*- coding: utf-8 -*-
"""Normaliza as fichas de votações explicadas (pesquisa) para o formato lido pelo site.

Uso: python3 politica/fichas.py <saida explicadas.json> <fichas_camara.json> <fichas_senado.json> ...
Cada ficha de entrada pode vir da Câmara (id_votacao) ou do Senado (codigo_sessao_votacao).
O arquivo de saída é a fonte única editável: correções manuais devem ser feitas nele, com a data em "corrigido".
"""
import json, re, sys

URL = re.compile(r"https?://[^\s;,)\]]+")


def url(*vals):
    for v in vals:
        if isinstance(v, str):
            m = URL.search(v)
            if m:
                return m.group(0).rstrip(".")
    return None


def txt(x, *keys):
    for k in keys:
        if isinstance(x, dict) and x.get(k):
            return x[k]
    return x if isinstance(x, str) else None


def lista(xs, texto_keys, quem_keys=()):
    out = []
    for x in xs or []:
        if isinstance(x, str):
            out.append({"texto": x, "fonte": url(x)})
            continue
        t = txt(x, *texto_keys)
        if not t:
            continue
        item = {"texto": t, "fonte": url(x.get("url"), x.get("fonte"), x.get("link"))}
        q = txt(x, *quem_keys) if quem_keys else None
        if q:
            item["quem"] = q
        out.append(item)
    return out


def oris(xs):
    out = []
    for o in xs or []:
        out.append({"partido": txt(o, "partido", "partido_ou_grupo", "bloco") or "—",
                    "orientacao": txt(o, "orientacao", "posicao", "voto"),
                    "justificativa": o.get("justificativa") or None,
                    "fonte": url(o.get("url"), o.get("fonte"))})
    return out


def placar(r):
    p = (r or {}).get("placar") if isinstance(r, dict) else None
    if not isinstance(p, dict) and isinstance(r, dict) and r.get("sim") is not None:
        p = r
    if not isinstance(p, dict):
        return None
    g = lambda *k: next((int(p[x]) for x in k if p.get(x) is not None), 0)
    return {"S": g("sim", "S"), "N": g("nao", "não", "N"), "A": g("abstencao", "abstenção", "A"), "O": g("obstrucao", "O")}


def manchete(m):
    if isinstance(m, list):
        m = m[0] if m else None
    if not m:
        return None
    if isinstance(m, str):
        return {"texto": m.strip("“”\""), "fonte": url(m)}
    return {"texto": (txt(m, "citacao", "texto", "titulo") or "").strip("“”\""), "fonte": url(m.get("url"), m.get("fonte"))}


def ficha(f):
    if f.get("codigo_sessao_votacao"):
        vid, casa = "s%s" % f["codigo_sessao_votacao"], "senado"
        prop, link = f.get("materia"), f.get("url_senado")
    else:
        vid, casa = "c%s" % f["id_votacao"], "camara"
        prop, link = f.get("proposicao"), f.get("url_camara")
    r = f.get("resultado") or {}
    st = (txt(r, "status", "situacao", "resultado") or "").lower() if isinstance(r, dict) else str(r).lower()
    custo = f.get("custo")
    secreta = any((v.get("voto") or v.get("codigo_api") or "") == "Votou" for v in f.get("votos") or [] if isinstance(v, dict)) or "secreta" in (f.get("votos_nota") or "").lower()
    out = {
        "id": vid, "casa": casa, "data": f.get("data"), "proposicao": prop, "url": link,
        "titulo": f.get("titulo_simples"),
        "manchete": manchete(f.get("manchete")),
        "o_que_faz": lista(f.get("o_que_faz"), ("texto", "item", "descricao")),
        "custo": {"texto": txt(custo, "texto", "estimativa"), "fonte": url(custo.get("url"), custo.get("fonte"))} if isinstance(custo, dict) and txt(custo, "texto", "estimativa") else None,
        "custo_nota": f.get("custo_nota") or f.get("custo_observacao"),
        "atencao": f.get("ponto_de_atencao"),
        "favor": lista(f.get("argumentos_favor"), ("argumento", "texto"), ("autor", "quem", "defensor")),
        "contra": lista(f.get("argumentos_contra"), ("argumento", "texto"), ("autor", "quem", "defensor")),
        "argumentos_nota": f.get("argumentos_nota"),
        "orientacoes": oris(f.get("orientacoes")),
        "orientacoes_nota": f.get("orientacoes_nota"),
        "posicionamentos": oris(f.get("posicionamentos_publicos")),
        "aprovada": True if st.startswith("aprovad") else False if st.startswith("rejeitad") else None,
        "placar": placar(r),
        "secreta": secreta,
        "proximos": lista(f.get("proximos_passos") if isinstance(f.get("proximos_passos"), list) else [f.get("proximos_passos")] if f.get("proximos_passos") else [], ("texto", "passo", "descricao")),
        "relacionadas": [{"id": ("s%s" % x["codigo_sessao_votacao"]) if x.get("codigo_sessao_votacao") else ("c%s" % x["id_votacao"]) if x.get("id_votacao") else None,
                          "descricao": x.get("descricao")} for x in f.get("votacoes_relacionadas") or [] if isinstance(x, dict)],
        "criterio": f.get("criterio"),
    }
    out["relacionadas"] = [x for x in out["relacionadas"] if x["id"]]
    return {k: v for k, v in out.items() if v not in (None, [], "")}


def main():
    saida, entradas = sys.argv[1], sys.argv[2:]
    fichas = []
    for p in entradas:
        try:
            d = json.load(open(p, encoding="utf-8"))
        except FileNotFoundError:
            print("sem arquivo:", p); continue
        for f in d.get("fichas", []):
            fichas.append(ficha(f))
    # a mesma proposta votada nas duas Casas: uma ficha aponta para a outra
    for f in fichas:
        for g in fichas:
            if g is not f and g["casa"] != f["casa"] and g.get("proposicao") == f.get("proposicao"):
                f.setdefault("relacionadas", []).append({"id": g["id"], "descricao": "Votação no " + ("Senado" if g["casa"] == "senado" else "plenário da Câmara") + ", " + "/".join(reversed((g.get("data") or "").split("-")))})
    fichas.sort(key=lambda f: f.get("data") or "", reverse=True)
    for f in fichas:
        falta = [k for k in ("titulo", "o_que_faz", "favor", "contra") if not f.get(k)]
        if falta: print("atenção:", f["id"], "sem", ", ".join(falta))
        sem_fonte = [x["texto"][:50] for k in ("o_que_faz", "favor", "contra") for x in f.get(k, []) if not x.get("fonte")]
        if sem_fonte: print("atenção:", f["id"], "itens sem link de fonte:", sem_fonte)
    json.dump({"fichas": fichas}, open(saida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(fichas), "fichas ->", saida)


if __name__ == "__main__":
    main()
