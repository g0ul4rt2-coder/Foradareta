# Código-fonte do Fora da Reta

Esta pasta guarda o que gera o site publicado na raiz do repositório.

- `src/`: página (head.html, extra.css, body.html) e scripts (app.js, extra2.js, apuracao.js, acompanhe.js).
- `assemble.py`: junta `src/` em `site/index.html`. `build.py`: gera `site/dados.json` e `site/conteudo.json` a partir dos JSON de pesquisa (candidatos, partidos, perguntas, poder, fenômenos...).
- `deploy_prep.sh dominio`: monta a pasta `deploy/`, que é copiada para a raiz do repositório.
- `politica/coletar.py`: robô dos dados abertos da Câmara e do Senado (GitHub Actions, workflow `politica.yml`).
- `politica/fichas.py`: normaliza fichas de votações explicadas. O arquivo publicado é `explicadas.json`, na raiz.
- `noticias/coletar.py`: robô das manchetes (workflow `noticias.yml`).

Os scripts usam caminhos absolutos de uma pasta de trabalho; ajuste antes de rodar em outro lugar.
Ao publicar, não sobrescreva os arquivos mantidos pelos robôs: `noticias.json`, `pol/` e `live/historico.json`.
