"""Coletor da apuração (TSE) para o Fora da Reta.

Lê os arquivos públicos de resultados do TSE (resultados.tse.jus.br), monta um JSON compacto
em site/apuracao.json e imprime uma linha MUDOU quando os números mudam (no máximo uma
vez por janela de MIN_GAP segundos), para quem estiver acompanhando republicar o site.

Também faz checagens de consistência em cada leitura e registra o resultado no próprio JSON.

Uso: python3 poll.py [--once] [--ele 6258] [--gap 60]
"""
import argparse
import concurrent.futures as cf
import json
import os
import sys
import time
import urllib.request

BASE = "https://resultados.tse.jus.br/oficial/ele2026"
UFS = ["ac", "al", "am", "ap", "ba", "ce", "df", "es", "go", "ma", "mg", "ms", "mt", "pa", "pb", "pe",
       "pi", "pr", "rj", "rn", "ro", "rr", "rs", "sc", "se", "sp", "to", "zz"]
GOV_UFS = ["ac", "am", "df", "es", "rn", "to"]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "site", "apuracao.json")
HIST = os.path.join(HERE, "historico.json")


def num(s):
    try:
        return int(s)
    except (TypeError, ValueError):
        return 0


def pct(s):
    try:
        return float(str(s).replace(",", "."))
    except (TypeError, ValueError):
        return 0.0


def get(url, tries=3):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url + f"?t={int(time.time())}", headers={"User-Agent": "Mozilla/5.0 (fora-da-reta)"})
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # noqa: BLE001 - registra e tenta de novo
            last = e
            time.sleep(1.5 * (i + 1))
    raise last


def compact(u):
    """Extrai do arquivo -u.json do TSE só o que o site usa."""
    s, e, v = u.get("s", {}), u.get("e", {}), u.get("v", {})
    cands = []
    for carg in u.get("carg", []):
        for agr in carg.get("agr", []):
            for par in agr.get("par", []):
                for c in par.get("cand", []):
                    cands.append({
                        "n": c.get("n"), "sq": c.get("sqcand"), "nm": c.get("nmu"), "sg": par.get("sg"),
                        "v": num(c.get("vap")), "p": pct(c.get("pvapn") or c.get("pvap")),
                        "e": c.get("e"), "st": c.get("st", ""),
                    })
    cands.sort(key=lambda c: -c["v"])
    return {
        "dt": u.get("dt", ""), "ht": u.get("ht", ""), "tf": u.get("tf", ""),
        "s": {"t": num(s.get("ts")), "a": num(s.get("st")), "p": pct(s.get("pstn") or s.get("pst"))},
        "el": num(e.get("te")), "el_ap": num(e.get("est")), "comp": num(e.get("c")), "pcomp": pct(e.get("pcn") or e.get("pc")),
        "abst": num(e.get("a")), "pabst": pct(e.get("pan") or e.get("pa")),
        "tv": num(v.get("tv")), "vv": num(v.get("vv")), "vb": num(v.get("vb")), "pvb": pct(v.get("pvbn") or v.get("pvb")),
        "vn": num(v.get("tvn")), "pvn": pct(v.get("ptvnn") or v.get("ptvn")),
        "c": cands,
    }


def checks(br, ufs):
    """Checagens de consistência entre os números do TSE."""
    out = []
    soma_c = sum(c["v"] for c in br["c"])
    out.append({"ok": soma_c == br["vv"] or br["vv"] == 0, "txt": "Soma dos votos dos candidatos = votos válidos (Brasil)"})
    out.append({"ok": br["vv"] + br["vb"] + br["vn"] == br["tv"] or br["tv"] == 0, "txt": "Válidos + brancos + nulos = total de votos (Brasil)"})
    soma_uf = {}
    for uf, d in ufs.items():
        for c in d["c"]:
            soma_uf[c["n"]] = soma_uf.get(c["n"], 0) + c["v"]
    ok_uf = all(soma_uf.get(c["n"], 0) == c["v"] for c in br["c"])
    out.append({"ok": ok_uf, "txt": "Soma dos estados e exterior = total do Brasil, para cada candidato"})
    out.append({"ok": all(d["s"]["a"] <= d["s"]["t"] for d in ufs.values()), "txt": "Nenhum estado com mais seções apuradas do que existem"})
    return out


def coletar(ele):
    urls = {uf: f"{BASE}/{ele}/dados/{uf}/{uf}-c0001-e{int(ele):06d}-u.json" for uf in UFS + ["br"]}
    with cf.ThreadPoolExecutor(10) as ex:
        res = dict(zip(urls, ex.map(lambda u: get(urls[u]), urls)))
    br = compact(res.pop("br"))
    ufs = {uf: compact(d) for uf, d in res.items()}
    gov = {}
    if ele == "6258":
        gurls = {uf: f"{BASE}/6260/dados/{uf}/{uf}-c0003-e006260-u.json" for uf in GOV_UFS}
        with cf.ThreadPoolExecutor(6) as ex:
            for uf, d in zip(gurls, ex.map(lambda u: get(gurls[u]), gurls)):
                gov[uf] = compact(d)
    return br, ufs, gov


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--ele", default="6258")
    ap.add_argument("--gap", type=int, default=60, help="intervalo mínimo entre avisos MUDOU (s)")
    ap.add_argument("--every", type=int, default=15, help="intervalo entre leituras (s)")
    ap.add_argument("--out", default=OUT)
    a = ap.parse_args()
    hist = []
    if os.path.exists(HIST) and a.ele == "6258":
        with open(HIST) as f:
            hist = json.load(f)
    last_sig, last_print, pending = None, 0.0, False
    while True:
        try:
            br, ufs, gov = coletar(a.ele)
            sig = json.dumps([br, ufs, gov], sort_keys=True)
            if sig != last_sig:
                last_sig = sig
                pt = {"h": br["ht"] or time.strftime("%H:%M:%S"), "s": br["s"]["p"], "c": {c["n"]: c["p"] for c in br["c"]}}
                if br["s"]["a"] > 0 and (not hist or hist[-1]["s"] != pt["s"] or hist[-1]["c"] != pt["c"]):
                    hist.append(pt)
                    with open(HIST, "w") as f:
                        json.dump(hist, f)
                data = {"ele": a.ele, "coletado": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "br": br, "ufs": ufs,
                        "gov": gov, "hist": hist, "checks": checks(br, ufs)}
                tmp = a.out + ".tmp"
                with open(tmp, "w") as f:
                    json.dump(data, f, ensure_ascii=True, separators=(",", ":"))
                os.replace(tmp, a.out)
                pending = True
            if pending and time.time() - last_print >= a.gap:
                lead = br["c"][0] if br["c"] else {}
                print(f"MUDOU {time.strftime('%H:%M:%S')} apurado={br['s']['p']:.2f}% TSE={br['dt']} {br['ht']} "
                      f"lider={lead.get('nm')} {lead.get('p')}", flush=True)
                last_print, pending = time.time(), False
        except Exception as e:  # noqa: BLE001
            print(f"ERRO {time.strftime('%H:%M:%S')} {type(e).__name__}: {e}", file=sys.stderr, flush=True)
        if a.once:
            break
        time.sleep(a.every)


if __name__ == "__main__":
    main()
