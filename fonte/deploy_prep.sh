#!/bin/sh
# Monta a pasta deploy/ para o GitHub Pages (foradareta.com.br) a partir de site/.
set -e
cd "$(dirname "$0")"
OUT=deploy
rm -rf "$OUT" && mkdir -p "$OUT/fotos"
ICON="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23fff'/%3E%3Cg transform='translate%284 4%29'%3E%3Cpath d='M2.2 15H13M16.6 15H21.8' stroke='%231d1d1f' stroke-width='2.5' stroke-linecap='round' fill='none'/%3E%3Cpath d='M8.2 3V21' stroke='%231d1d1f' stroke-width='1.5' stroke-linecap='round' opacity='.26' fill='none'/%3E%3Ccircle cx='15.2' cy='11.4' r='0.85' fill='%235146e0' opacity='.5'/%3E%3Ccircle cx='16.6' cy='6.9' r='3.5' fill='%235146e0'/%3E%3C/g%3E%3C/svg%3E"
{
  printf '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover">'
  printf '<meta name="description" content="Acompanhe a política sem torcida: votações do Congresso explicadas, como votaram seus representantes, promessas do governo, notícias e teste político em três eixos.">'
  printf '<meta property="og:title" content="Fora da Reta"><meta property="og:description" content="A eleição acabou. A política, não. Votações explicadas, seus representantes, promessas e notícias, com fonte e sem torcida."><meta property="og:url" content="https://foradareta.com.br/"><meta property="og:type" content="website"><meta property="og:image" content="https://foradareta.com.br/og.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#ffffff"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
  printf '<link rel="icon" href="%s">' "$ICON"
  printf '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%%}[hidden]{display:none!important}</style></head><body>'
  cat site/index.html
  printf '</body></html>'
} > "$OUT/index.html"
cp site/dados.json site/apuracao.json site/turno1.json site/mapa.json site/pontos.json site/congresso.json site/conteudo.json "$OUT/"
cp site/fotos/* "$OUT/fotos/"
mkdir -p "$OUT/mapas" && cp site/mapas/*.json "$OUT/mapas/" && cp site/mun_gov.json "$OUT/"
cp brand/og.png brand/apple-touch-icon.png "$OUT/"
# notícias: coletor + agendamento no GitHub Actions
mkdir -p "$OUT/noticias" "$OUT/.github/workflows"
cp noticias/coletar.py "$OUT/noticias/"
mkdir -p "$OUT/live" && cp live/poll.py "$OUT/live/"
cp noticias/noticias.yml "$OUT/.github/workflows/noticias.yml"
mkdir -p "$OUT/politica" && cp politica/coletar.py "$OUT/politica/" && cp politica/politica.yml "$OUT/.github/workflows/politica.yml"
[ -d site/pol ] && cp -r site/pol "$OUT/pol"
# conteúdo editorial (fichas explicadas e promessas): editado à mão, com fonte em cada item
for f in explicadas.json promessas.json; do [ -f site/$f ] && cp site/$f "$OUT/"; done
cp politica/fichas.py "$OUT/politica/"
[ -f site/noticias.json ] && cp site/noticias.json "$OUT/"
[ -f site/aviso.json ] && cp site/aviso.json "$OUT/"
# o arquivo CNAME só entra quando o DNS do domínio estiver configurado: ./deploy_prep.sh dominio
[ "$1" = "dominio" ] && echo "foradareta.com.br" > "$OUT/CNAME" || true
touch "$OUT/.nojekyll"
cat > "$OUT/README.md" <<'MD'
# Fora da Reta

Site apartidário de informação política: votações do Congresso explicadas, como votou cada deputado e senador
(dados abertos da Câmara e do Senado), promessas do governo, notícias, teste político em três eixos e o arquivo das eleições de 2026.

- Endereço: https://foradareta.com.br
- Fontes dos resultados: arquivos públicos do Tribunal Superior Eleitoral (resultados.tse.jus.br), lidos diretamente pelo navegador de cada visitante.
- Fontes das posições: indicadas em cada item do site (planos de governo, votações nominais da Câmara e do Senado, atos oficiais, imprensa e agências de checagem).
- Mapa dos estados: svg-maps/brazil (Victor Cazanave), CC BY 4.0.
MD
ls -la "$OUT" | head -20; du -sh "$OUT"
