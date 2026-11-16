// Sincronização semanal da página "Ação de Recorrência" (acao-recorrencia.html).
//
// Como usar: com o Chrome logado em https://operacoes.proxxima.net, abrir qualquer
// página do sistema e executar este arquivo inteiro no console (ou via automação).
// O script devolve um resumo. Ele:
//   1. baixa o analítico de recorrência (o mesmo do botão "⬇ baixar" da tela
//      Recorrência › Resultado) dos meses necessários, filtrado por coordenador e unidade;
//   2. monta a base por OS das últimas SEMANAS_JANELA semanas fechadas (seg–dom),
//      com o técnico da OS anterior (ofensor) de cada reabertura;
//   3. grava nas coleções compartilhadas do site (Apps Script): RecorrenciaOSData,
//      RecorrenciaSemanalData (somente acrescenta/atualiza semanas) e RecorrenciaOSMeta.
// Nada é alterado no sistema de operações: só leitura.
(async () => {
  const COORD = 'JÂNIO DANTAS MARTINS';
  const UNIDADE = 'TOUROS';
  const SEMANAS_JANELA = 12;
  const SYNC_URL = 'https://script.google.com/macros/s/AKfycbzkAsAB4_iEMJB-XGCiVyWyi8Ftn0c7yH5wgRv45fnuS8lfbmFw2ufV47YgkQUrzkqP/exec';
  const SUPS = { MARCELLO: 'MARCELLO ROCHA DE SOUSA JUNIOR', JOEL: 'JOEL DIAS TAVARES' };

  if (!/operacoes\.proxxima\.net$/.test(location.hostname)) throw new Error('Execute na aba do operacoes.proxxima.net');

  // ---------- leitor mínimo de .xlsx (zip + XML) ----------
  async function lerXlsx(url){
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' em ' + url.split('?')[0]);
    const buf = new Uint8Array(await res.arrayBuffer());
    const dv = new DataView(buf.buffer);
    let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error('Arquivo não é xlsx (login expirado?)');
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true);
    const files = {};
    for (let i = 0; i < n; i++){
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const fnl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      const lho = dv.getUint32(p + 42, true);
      files[new TextDecoder().decode(buf.subarray(p + 46, p + 46 + fnl))] = { method, csize, lho };
      p += 46 + fnl + xl + cl;
    }
    async function read(name){
      const f = files[name]; if (!f) return null;
      const lfn = dv.getUint16(f.lho + 26, true), lxl = dv.getUint16(f.lho + 28, true);
      const data = buf.subarray(f.lho + 30 + lfn + lxl, f.lho + 30 + lfn + lxl + f.csize);
      if (f.method === 0) return new TextDecoder().decode(data);
      return await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    }
    const ss = []; const ssx = await read('xl/sharedStrings.xml');
    if (ssx) new DOMParser().parseFromString(ssx, 'application/xml').querySelectorAll('si')
      .forEach(si => ss.push([...si.querySelectorAll('t')].map(t => t.textContent).join('')));
    const x = await read('xl/worksheets/sheet1.xml');
    const rows = [];
    new DOMParser().parseFromString(x, 'application/xml').querySelectorAll('sheetData > row').forEach(r => {
      const row = [];
      r.querySelectorAll('c').forEach(c => {
        let ci = 0; for (const ch of c.getAttribute('r').replace(/\d+/g, '')) ci = ci * 26 + (ch.charCodeAt(0) - 64);
        const t = c.getAttribute('t'); const v = c.querySelector('v'); let val = v ? v.textContent : null;
        if (t === 's' && val != null) val = ss[+val];
        else if (t === 'inlineStr') val = c.querySelector('t')?.textContent ?? null;
        row[ci - 1] = val;
      });
      rows.push(row);
    });
    return rows;
  }

  // ---------- janela de semanas ----------
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  const dow = (hoje.getDay() + 6) % 7;                       // 0 = segunda
  const segAtual = new Date(hoje); segAtual.setDate(hoje.getDate() - dow);
  const fimD = new Date(segAtual); fimD.setDate(segAtual.getDate() - 1);          // domingo passado
  const iniD = new Date(segAtual); iniD.setDate(segAtual.getDate() - 7 * SEMANAS_JANELA);
  const ini = iso(iniD), fim = iso(fimD);
  const segunda = s => { const d = new Date(s.slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return iso(d); };

  // meses a baixar: de (ini - 31 dias) até fim, para achar a OS anterior das reaberturas
  const meses = []; const m0 = new Date(iniD); m0.setDate(m0.getDate() - 31); m0.setDate(1);
  for (const d = new Date(m0); d <= fimD; d.setMonth(d.getMonth() + 1)) meses.push(iso(d).slice(0, 7));

  const todas = [];
  for (const mes of meses){
    const q = new URLSearchParams({ mes, unidade: UNIDADE, coord: COORD });
    const rows = await lerXlsx('/preview/recorrencia/analitico.xlsx?' + q);
    if (!rows[1] || rows[1][0] !== 'Protocolo' || rows[1][19] !== 'É recorrência?') throw new Error('Layout do analítico mudou (' + mes + ')');
    rows.slice(2).filter(r => r[0] != null).forEach(r => todas.push(r));
  }
  const N = v => (v == null || v === 'null' || v === '') ? null : v;
  const porProt = {}; todas.forEach(r => { porProt[String(r[0])] = r; });
  const geradoras = new Set(todas.filter(r => r[19] === 'SIM' && N(r[11])).map(r => String(r[11])));

  const os = []; const vistos = new Set();
  todas.forEach(r => {
    const p = String(r[0]); if (vistos.has(p)) return;
    const ab = String(r[1] || '').slice(0, 10); if (ab < ini || ab > fim) return;
    vistos.add(p);
    const pa = N(r[11]) ? String(r[11]) : ''; const ant = pa ? porProt[pa] : null; const rec = r[19] === 'SIM';
    os.push({
      id: p, ab: String(r[1] || '').slice(0, 16), fe: String(N(r[2]) || '').slice(0, 16),
      prob: String(r[5] || '').replace('OPERAÇÕES - ', ''), tec: r[6] || '', cid: String(r[7] || '').replace(/ \| [A-Z]{2}$/, ''),
      sup: r[9] || '', rec: rec ? 1 : 0, grp: N(r[18]) || '', pa, aba: String(N(r[12]) || '').slice(0, 16),
      proba: String(N(r[16]) || '').replace('OPERAÇÕES - ', ''), dias: N(r[17]),
      teca: ant ? ant[6] : '', supa: ant ? ant[9] : '',
      txt: (rec || geradoras.has(p)) ? String(r[4] || '').trim().slice(0, 160) : '',
      txta: rec ? String(N(r[15]) || '').trim().slice(0, 160) : '',
    });
  });
  if (!os.length) throw new Error('Nenhuma OS na janela ' + ini + ' a ' + fim + ' — nada gravado');

  // ---------- agregado semanal (mesma conta do Consolidado) ----------
  const agora = new Date().toISOString();
  const sem = {};
  os.forEach(r => {
    const k = segunda(r.ab);
    sem[k] = sem[k] || { U: [0, 0], M: [0, 0], J: [0, 0] };
    const s = r.sup === SUPS.MARCELLO ? 'M' : r.sup === SUPS.JOEL ? 'J' : null;
    sem[k].U[0] += r.rec; sem[k].U[1]++;
    if (s){ sem[k][s][0] += r.rec; sem[k][s][1]++; }
  });
  const novosSem = [];
  Object.entries(sem).forEach(([k, v]) => {
    const f = new Date(k + 'T12:00:00'); f.setDate(f.getDate() + 6);
    [['UNIDADE TOUROS', v.U], [SUPS.MARCELLO, v.M], [SUPS.JOEL, v.J]].forEach(([eq, [reab, rep]]) =>
      novosSem.push({ id: k + '|' + eq, ini: k, fim: iso(f), equipe: eq, reab, reparos: rep, fonte: 'Analítico de recorrência (operacoes.proxxima.net)', atualizadoEm: agora }));
  });

  const pull = async c => { const r = await fetch(SYNC_URL + '?collection=' + c + '&cachebust=' + Date.now()); const j = await r.json(); return Array.isArray(j) ? j : []; };
  const push = async (c, records) => {
    const r = await fetch(SYNC_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ collection: c, records }) });
    const j = await r.json(); if (!j || !j.ok) throw new Error('Falha ao gravar ' + c); return j.count;
  };

  const semAtual = await pull('RecorrenciaSemanalData');
  const mapa = {}; semAtual.forEach(r => { if (r && r.id) mapa[r.id] = r; });
  novosSem.forEach(r => { mapa[r.id] = r; });
  const semFinal = Object.values(mapa);
  if (semFinal.length < semAtual.length) throw new Error('Base semanal ficaria menor — nada gravado');

  const nOS = await push('RecorrenciaOSData', os);
  const nSem = await push('RecorrenciaSemanalData', semFinal);
  await push('RecorrenciaOSMeta', [{ id: 'meta', atualizadoEm: agora, ini, fim, linhas: nOS, meses: meses.join(','),
    fonte: 'operacoes.proxxima.net analítico de recorrência · coord. ' + COORD + ' · unidade ' + UNIDADE }]);

  const ult = segunda(fim); const ant = (() => { const d = new Date(ult + 'T12:00:00'); d.setDate(d.getDate() - 7); return iso(d); })();
  const linha = (k, s) => { const v = sem[k] && sem[k][s]; return v ? `${v[0]}/${v[1]} · ${(v[1] ? v[0] / v[1] * 100 : 0).toFixed(1).replace('.', ',')}%` : '—'; };
  return {
    ok: true, janela: ini + ' a ' + fim, osGravadas: nOS, semanasNaBase: nSem / 3,
    ultimaSemana: ult + ' a ' + fim,
    unidade: linha(ult, 'U'), marcello: linha(ult, 'M'), joel: linha(ult, 'J'),
    semanaAnterior: { unidade: linha(ant, 'U'), marcello: linha(ant, 'M'), joel: linha(ant, 'J') },
  };
})();
