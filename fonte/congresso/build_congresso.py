"""Monta site/congresso.json e as folhas de fotos (site/fotos/dep-N.jpg) do Congresso que toma posse em 2027.

Fontes: TSE (eleitos em 04/10/2026), API de dados abertos da Câmara (votos nominais 2019–2026) e do Senado
(senadores com mandato até 2031). Tudo é baixado de fontes oficiais; nada é digitado à mão, exceto o mapa
votação -> afirmação do teste (VOT_MAP), que fica explícito abaixo e é exibido no site.
"""
import concurrent.futures as cf
import io
import json
import os
import re
import time
import unicodedata
import urllib.request

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "..", "site")
CACHE = os.path.join(HERE, "cache")
os.makedirs(CACHE, exist_ok=True)
TSE = "https://resultados.tse.jus.br/oficial/ele2026/6259"
UFS = ["ac", "al", "am", "ap", "ba", "ce", "df", "es", "go", "ma", "mg", "ms", "mt", "pa", "pb", "pe",
       "pi", "pr", "rj", "rn", "ro", "rr", "rs", "sc", "se", "sp", "to"]

# votação de referência -> (afirmação do teste, sinal de "Sim", peso)
# sinal +1: votar Sim equivale a concordar com a afirmação; -1: votar Sim equivale a discordar.
# peso 2 = a votação trata diretamente do tema; 1 = aproximação.
VOT_MAP = {
    "PREV": ("E04", 1, 1), "BC": ("E07", 1, 2), "ELE": ("E02", 1, 2), "COR": ("E02", 1, 2), "ARM": ("V02", 1, 2),
    "AUX": ("E01", 1, 1), "FN": ("V11", 1, 1), "MT": ("V12", -1, 2), "OFF": ("E03", 1, 2), "SAL": ("E09", 1, 1),
    "INV": ("E15", -1, 1), "DRG": ("V04", -1, 2), "STF": ("V17", 1, 2), "ABO": ("V01", -1, 2), "CORTE": ("E04", 1, 1),
    "LIC": ("V13", -1, 1), "ANU": ("V10", 1, 2), "IR": ("E03", 1, 1), "FAC": ("V16", 1, 1), "DOS": ("V10", 1, 1),
    "X61": ("E05", 1, 2), "VIMP": ("Z01", -1, 1), "LSN5": ("Z01", 1, 1),
}


def get(url, binary=False, tries=4):
    key = os.path.join(CACHE, re.sub(r"[^A-Za-z0-9]+", "_", url)[-180:])
    if os.path.exists(key):
        with open(key, "rb") as f:
            data = f.read()
    else:
        last = None
        for i in range(tries):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (fora-da-reta)", "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=40) as r:
                    data = r.read()
                break
            except Exception as e:  # noqa: BLE001
                last = e
                time.sleep(2 * (i + 1))
        else:
            raise last
        with open(key, "wb") as f:
            f.write(data)
    return data if binary else json.loads(data.decode("utf-8"))


def norm(s):
    s = unicodedata.normalize("NFD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z ]", "", s).strip()


def eleitos(cargo):
    out = []
    def one(uf):
        d = get(f"{TSE}/dados/{uf}/{uf}-c{cargo:04d}-e006259-u.json")
        res = []
        for carg in d["carg"]:
            for agr in carg["agr"]:
                for par in agr["par"]:
                    for c in par["cand"]:
                        if (c.get("st") or "").startswith("Eleito"):
                            res.append({"uf": uf, "n": c["n"], "sq": c["sqcand"], "nm": c["nmu"], "civil": c["nm"],
                                        "partido": par["sg"], "votos": int(c.get("vap") or 0), "pct": c.get("pvap"), "st": c["st"]})
        return res
    with cf.ThreadPoolExecutor(9) as ex:
        for r in ex.map(one, UFS):
            out += r
    return out


def main():
    deps = eleitos(6)
    sens26 = eleitos(5)
    print("deputados eleitos:", len(deps), "senadores eleitos 2026:", len(sens26))

    # Câmara: deputados da legislatura 57 (2023–2027)
    cam = []
    pag = 1
    while True:
        d = get(f"https://dadosabertos.camara.leg.br/api/v2/deputados?idLegislatura=57&itens=100&pagina={pag}&ordem=ASC&ordenarPor=nome")
        cam += d["dados"]
        if not d["dados"] or len(d["dados"]) < 100:
            break
        pag += 1
    cam_by = {}
    for c in cam:
        cam_by.setdefault((norm(c["nome"]), c["siglaUf"].lower()), c)
    # match pelo nome de urna; se falhar, pelo nome civil
    det = {}
    unmatched = [d for d in deps if (norm(d["nm"]), d["uf"]) not in cam_by]
    ufs_need = {d["uf"] for d in unmatched}
    ids = [c["id"] for c in cam if c["siglaUf"].lower() in ufs_need]
    with cf.ThreadPoolExecutor(12) as ex:
        for i, r in zip(ids, ex.map(lambda i: get(f"https://dadosabertos.camara.leg.br/api/v2/deputados/{i}"), ids)):
            det[i] = r["dados"]
    civil_by = {(norm(v.get("nomeCivil")), (v.get("ultimoStatus") or {}).get("siglaUf", "").lower()): i for i, v in det.items()}
    for d in deps:
        c = cam_by.get((norm(d["nm"]), d["uf"]))
        cid = c["id"] if c else civil_by.get((norm(d["civil"]), d["uf"]))
        d["camara_id"] = cid
    print("deputados 2026 que estavam na legislatura 2023–2027:", sum(1 for d in deps if d["camara_id"]))

    # votos nominais nas votações de referência
    refs = json.load(open(os.path.join(HERE, "..", "partidos.json")))["votacoes_referencia"]
    votos = {}
    for key, (q, sinal, peso) in VOT_MAP.items():
        r = refs.get(key)
        if not r or not r.get("id"):
            continue
        vs = get(f"https://dadosabertos.camara.leg.br/api/v2/votacoes/{r['id']}/votos")["dados"]
        for v in vs:
            votos.setdefault(v["deputado_"]["id"], {})[key] = v["tipoVoto"]
    for d in deps:
        mine = votos.get(d["camara_id"], {}) if d["camara_id"] else {}
        d["votos_ref"] = mine
        acc = {}
        for key, tipo in mine.items():
            q, sinal, peso = VOT_MAP[key]
            if tipo not in ("Sim", "Não"):
                continue
            val = (1 if tipo == "Sim" else -1) * sinal * peso
            acc.setdefault(q, []).append(val)
        d["pos"] = {q: max(-2, min(2, round(sum(v) / len(v)))) for q, v in acc.items()}

    # Senado: quem tem mandato até 2031 (eleitos em 2022) continua em 2027
    sen = get("https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json")["ListaParlamentarEmExercicio"]["Parlamentares"]["Parlamentar"]
    sens22 = []
    for p in sen:
        m = p["Mandato"]
        fim = (m.get("SegundaLegislaturaDoMandato") or {}).get("DataFim", "")
        if fim.startswith("2031"):
            i = p["IdentificacaoParlamentar"]
            sens22.append({"uf": i["UfParlamentar"].lower(), "nm": i["NomeParlamentar"], "civil": i["NomeCompletoParlamentar"],
                           "partido": i["SiglaPartidoParlamentar"], "codigo": i["CodigoParlamentar"], "foto_url": i["UrlFotoParlamentar"],
                           "exercicio": m.get("DescricaoParticipacao"), "eleito": 2022})
    print("senadores com mandato até 2031:", len(sens22))

    # fotos em folhas (sprites) de 10 x 12 retratos 64x90
    people = [("d", d) for d in deps] + [("s", s) for s in sens26] + [("s22", s) for s in sens22]
    W, H, COLS, ROWS = 64, 90, 10, 12
    def photo(item):
        kind, p = item
        try:
            if kind == "s22":
                raw = get(p["foto_url"].replace("http://", "https://"), binary=True)
            else:
                raw = get(f"{TSE}/fotos/{p['uf']}/{p['sq']}.jpeg", binary=True)
            im = Image.open(io.BytesIO(raw)).convert("RGB")
            # recorta para 64:90 mantendo o rosto (parte de cima)
            w, h = im.size
            tw = w; th = int(w * H / W)
            if th > h:
                th = h; tw = int(h * W / H)
            left = (w - tw) // 2
            return im.crop((left, 0, left + tw, th)).resize((W, H), Image.LANCZOS)
        except Exception as e:  # noqa: BLE001
            print("foto falhou", p.get("nm"), e)
            return None
    with cf.ThreadPoolExecutor(12) as ex:
        ims = list(ex.map(photo, people))
    sheet, idx, sheets = None, 0, 0
    per = COLS * ROWS
    for i, ((kind, p), im) in enumerate(zip(people, ims)):
        s, k = divmod(i, per)
        if k == 0:
            if sheet is not None:
                sheet.save(os.path.join(SITE, "fotos", f"cong-{sheets - 1}.jpg"), quality=78, optimize=True)
            sheet = Image.new("RGB", (COLS * W, ROWS * H), (230, 230, 235))
            sheets += 1
        if im is not None:
            sheet.paste(im, ((k % COLS) * W, (k // COLS) * H))
            p["foto"] = [s, k]
    if sheet is not None:
        sheet.save(os.path.join(SITE, "fotos", f"cong-{sheets - 1}.jpg"), quality=78, optimize=True)

    def slim_dep(d):
        return {"uf": d["uf"], "n": d["n"], "nm": d["nm"], "civil": d["civil"], "partido": d["partido"], "votos": d["votos"],
                "pct": d["pct"], "st": d["st"], "cid": d["camara_id"], "v": d["votos_ref"], "pos": d["pos"], "foto": d.get("foto")}
    out = {
        "fonte": "TSE (eleitos em 04/10/2026), Câmara dos Deputados e Senado Federal (dados abertos)",
        "gerado": time.strftime("%Y-%m-%d %H:%M"),
        "folhas": sheets, "foto_w": W, "foto_h": H, "cols": COLS, "rows": ROWS,
        "votacoes": {k: {"descricao": refs[k]["descricao"], "data": refs[k]["data"], "q": VOT_MAP[k][0], "sinal": VOT_MAP[k][1], "peso": VOT_MAP[k][2],
                         "url": "https://dadosabertos.camara.leg.br/api/v2/votacoes/" + refs[k]["id"] + "/votos"} for k in VOT_MAP if refs.get(k, {}).get("id")},
        "deputados": [slim_dep(d) for d in deps],
        "senadores": [{"uf": s["uf"], "n": s["n"], "nm": s["nm"], "civil": s["civil"], "partido": s["partido"], "votos": s["votos"], "pct": s["pct"],
                       "eleito": 2026, "foto": s.get("foto")} for s in sens26] +
                     [{"uf": s["uf"], "nm": s["nm"], "civil": s["civil"], "partido": s["partido"], "eleito": 2022, "codigo": s["codigo"],
                       "exercicio": s["exercicio"], "foto": s.get("foto")} for s in sens22],
    }
    with open(os.path.join(SITE, "congresso.json"), "w") as f:
        json.dump(out, f, ensure_ascii=True, separators=(",", ":"))
    print("folhas de fotos:", sheets, "| congresso.json", os.path.getsize(os.path.join(SITE, "congresso.json")) // 1024, "KB")


if __name__ == "__main__":
    main()
