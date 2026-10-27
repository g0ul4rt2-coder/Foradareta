// Gera a matriz de pontos do mapa: para cada ponto da grade, em qual estado ele cai (isPointInFill no Chromium).
const { chromium } = require('playwright');
const fs = require('fs');
const mapa = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const SP = Number(process.argv[4] || 7);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const ufs = Object.keys(mapa.uf);
  const html = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + mapa.viewBox + '">' + ufs.map(u => '<path id="' + u + '" d="' + mapa.uf[u].d + '"/>').join('') + '</svg>';
  await p.setContent(html);
  const res = await p.evaluate(({ ufs, SP }) => {
    const svg = document.querySelector('svg'), IN = 0, edge = [], out = [], paths = ufs.map(u => document.getElementById(u));
    const pt = document.querySelector('svg').createSVGPoint();
    for (let y = SP / 2; y < 639; y += SP) for (let x = SP / 2; x < 613; x += SP) {
      // grade hexagonal: linhas alternadas deslocadas meio passo
      const row = Math.round((y - SP / 2) / SP), xx = x + (row % 2 ? SP / 2 : 0);
      pt.x = xx; pt.y = y;
      for (let i = 0; i < paths.length; i++) if (paths[i].isPointInFill(pt)) {
        // recuo da divisa: o ponto só entra se a vizinhança também estiver dentro do mesmo estado,
        // assim fica um corredor vazio ao longo de cada fronteira e os estados aparecem bem demarcados
        let ok = true;
        for (let a = 0; a < 8 && ok; a++) { const q = svg.createSVGPoint(); q.x = xx + IN * Math.cos(a * Math.PI / 4); q.y = y + IN * Math.sin(a * Math.PI / 4); ok = paths[i].isPointInFill(q); }
        (ok ? out : edge).push([+xx.toFixed(1), +y.toFixed(1), i]); break;
      }
    }
    // estado pequeno demais para o recuo (DF) usa os pontos da borda
    ufs.forEach((u, i) => { if (out.filter(d => d[2] === i).length < 12) edge.filter(d => d[2] === i).forEach(d => out.push(d)); });
    // estados pequenos sem pontos suficientes ganham pontos no centro
    const count = ufs.map((u, i) => out.filter(d => d[2] === i).length);
    ufs.forEach((u, i) => { if (count[i] < 4) { const bb = paths[i].getBBox(); const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2; [[0, 0], [-SP * .55, 0], [SP * .55, 0], [0, -SP * .55]].slice(0, 4 - count[i]).forEach(o => out.push([+(cx + o[0]).toFixed(1), +(cy + o[1]).toFixed(1), i])); } });
    return out;
  }, { ufs, SP });
  // ordem de preenchimento: de baixo para cima, com leve ruído
  let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  res.forEach(d => d.push(+(d[1] + (rnd() - 0.5) * SP * 3).toFixed(1)));
  fs.writeFileSync(process.argv[3], JSON.stringify({ sp: SP, ufs, dots: res.map(d => [d[0], d[1], d[2], d[3]]) }));
  const per = {}; res.forEach(d => per[ufs[d[2]]] = (per[ufs[d[2]]] || 0) + 1);
  console.log('pontos:', res.length, JSON.stringify(per));
  await b.close();
})();
