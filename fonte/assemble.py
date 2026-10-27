"""Monta site/index.html a partir de src/ e gera uma cópia só com ASCII (acentos escapados),
para que a página apareça certa mesmo se for lida com a codificação errada."""
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "src")


def rd(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()


page = rd("head.html") + rd("extra.css") + "</style>\n" + rd("body.html") + "\n<script>\n" + rd("app.js").replace("/*EXTRA*/", rd("extra2.js")).replace("/*APURACAO*/", rd("apuracao.js")).replace("/*ACOMP*/", rd("acompanhe.js")) + "</script>\n"
# a página começa declarando UTF-8 (o esqueleto do publish também declara)
page = '<meta charset="utf-8">\n' + page


def esc_html(s):
    return "".join(c if ord(c) < 128 else f"&#{ord(c)};" for c in s)


def esc_js(s):
    return "".join(c if ord(c) < 128 else f"\\u{ord(c):04x}" for c in s)


def esc_css(s):
    return "".join(c if ord(c) < 128 else f"\\{ord(c):X} " for c in s)


out, pos = [], 0
for m in re.finditer(r"(<style[^>]*>)(.*?)(</style>)|(<script[^>]*>)(.*?)(</script>)", page, flags=re.S):
    out.append(esc_html(page[pos:m.start()]))
    if m.group(1):
        out.append(m.group(1) + esc_css(m.group(2)) + m.group(3))
    else:
        out.append(m.group(4) + esc_js(m.group(5)) + m.group(6))
    pos = m.end()
out.append(esc_html(page[pos:]))
ascii_page = "".join(out)
assert all(ord(c) < 128 for c in ascii_page)

with open(os.path.join(BASE, "site", "index.html"), "w", encoding="ascii") as f:
    f.write(ascii_page)
print("index.html:", len(ascii_page), "bytes, só ASCII")
