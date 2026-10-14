// Versão NUVEM (GitHub Actions) do sync.js: exporta o Painel de Serviços do
// Aniel e importa no site OPE Touros, sem depender do PC do Jânio.
// Diferenças pro sync.js do PC: Chrome/Chromium de teste do Playwright (sem
// perfil salvo), login no Aniel e no site com usuário/senha vindos dos Secrets
// do GitHub (ANIEL_USER, ANIEL_PASS, SITE_USER, SITE_PASS), sem Z:, sem lock.
// Regra de segurança: NADA sensível é impresso no log (repositório pode ser público).

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const XLSX = require('xlsx');
const { ANIEL_URL, MENU_SELECTOR, esperarMenuOuLogin } = require('./aniel-common');

// .trim(): tira espaço/quebra de linha que às vezes vem junto quando se cola o valor no Secret
const ANIEL_USER = (process.env.ANIEL_USER || '').trim();
const ANIEL_PASS = (process.env.ANIEL_PASS || '').trim();
const SITE_USER = (process.env.SITE_USER || '').trim();
const SITE_PASS = (process.env.SITE_PASS || '').trim();
const TMP_DIR = path.join(__dirname, 'tmp-mapa');
const SITE_URL = process.env.SITE_URL || 'https://ope-touros.vercel.app/mapa-servicos.html';

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function setDatepicker(page, elId, dataObj) {
  // Os campos de data usam jQuery UI datepicker - .fill() só muda o texto
  // visível, mas a busca lê do estado interno do datepicker, que só é
  // atualizado de verdade via a própria API dele (setDate). Descoberto
  // depurando por que exportar-produtividade.js ignorava a Data Inicial.
  await page.evaluate(
    ({ frameSelector, elId, ano, mes, dia }) => {
      const frame = document.querySelector(frameSelector);
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      const el = doc.getElementById(elId);
      win.$(el).datepicker('setDate', new win.Date(ano, mes, dia));
      win.$(el).trigger('change');
    },
    { frameSelector: 'iframe[src*="Gestao_Equipe"]', elId, ano: dataObj.getFullYear(), mes: dataObj.getMonth(), dia: dataObj.getDate() }
  );
}

function contarLinhasXlsx(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entry = zip.getEntry('xl/worksheets/sheet1.xml');
    if (!entry) return 0;
    const xml = zip.readAsText(entry);
    return (xml.match(/<row /g) || []).length;
  } catch (e) {
    return 0;
  }
}

// Na nuvem não guardamos print/HTML (poderia expor dados de clientes num
// repositório público) - só um resumo curto e seguro no log.
async function dumpDebug(page, name) {
  try {
    const titulo = await page.title().catch(() => '');
    log(`[diagnóstico ${name}] URL: ${page.url()} | título: "${titulo}"`);
  } catch (e) {}
}

const CHROME_ARGS = [
  '--disable-gpu',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--disable-default-apps',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-first-run',
];

async function loginAniel(page) {
  if (!ANIEL_USER || !ANIEL_PASS) {
    throw new Error('Secrets ANIEL_USER / ANIEL_PASS não estão configurados no GitHub (Settings > Secrets and variables > Actions).');
  }
  const senha = page.locator('input[type="password"]:visible').first();
  await senha.waitFor({ state: 'visible', timeout: 30000 });
  const usuario = page
    .locator('input:visible:not([type="password"]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])')
    .first();
  await usuario.fill(ANIEL_USER);
  await senha.fill(ANIEL_PASS);
  const botao = page
    .locator('button[type="submit"]:visible, input[type="submit"]:visible, button:visible:has-text("Entrar"), button:visible:has-text("Login"), button:visible:has-text("Acessar")')
    .first();
  if (await botao.count()) await botao.click();
  else await senha.press('Enter');

  try {
    await page.locator(MENU_SELECTOR).first().waitFor({ state: 'visible', timeout: 60000 });
  } catch (e) {
    // Resumo curto do que a tela mostra (mensagem de erro, pedido de código, captcha...)
    let texto = '';
    try { texto = (await page.locator('body').innerText({ timeout: 3000 })).replace(/\s+/g, ' ').slice(0, 300); } catch (e2) {}
    throw new Error(`Login no Aniel não passou (URL: ${page.url()}). Texto da tela: "${texto}". Pode ser usuário/senha errados, código de verificação (2FA), captcha ou bloqueio de IP do GitHub.`);
  }
}

async function abrirNavegadorEPainel() {
  const browser = await chromium.launch({ headless: true, args: CHROME_ARGS });
  try {
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1600, height: 900 },
      locale: 'pt-BR',
      timezoneId: 'America/Fortaleza',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(90000);

    await page.goto(ANIEL_URL, { waitUntil: 'domcontentloaded' });
    try {
      await esperarMenuOuLogin(page, { timeoutMs: 45000, dump: (n) => dumpDebug(page, n) });
    } catch (e) {
      if (!/pediu login/.test(e.message)) throw e;
      log('Aniel pediu login - entrando com usuário/senha dos Secrets...');
      await loginAniel(page);
      log('Login no Aniel OK.');
    }

    await page.locator(MENU_SELECTOR).first().click();
    await page.waitForSelector('iframe[src*="Gestao_Equipe"]');
    const painelFrame = page.frameLocator('iframe[src*="Gestao_Equipe"]').last();
    await painelFrame.getByText('Painel de Serviços', { exact: true }).click();
    await painelFrame.locator('#iAbrirFiltro').waitFor({ state: 'visible' });

    return { browser, context, page, painelFrame };
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

// nav é mutável de propósito: se o Chrome crashar no meio (o bug intermitente
// de sempre, "Target page, context or browser has been closed"), download.saveAs()
// costumava ficar FORA do try/catch da tentativa e matava o script inteiro na
// primeira falha, ignorando as tentativas seguintes que já existiam - o mesmo
// bug já corrigido no exportar-produtividade-v3.js. Agora, quando detecta que
// a página morreu, fecha o navegador morto, abre um NOVO do zero, reabre o
// Painel de Serviços e continua tentando dentro da mesma execução.
// Marca rádio/checkbox de forma tolerante: o Aniel usa controles estilizados
// em que o .check() normal às vezes fica esperando 90s (elemento "coberto" pelo
// rótulo) - na nuvem isso acontecia na 1ª tentativa. Tenta normal (rápido),
// depois forçado, e por último um clique via JavaScript.
async function marcar(locator) {
  try { await locator.check({ timeout: 8000 }); return; } catch (e) {}
  try { await locator.check({ force: true, timeout: 5000 }); return; } catch (e) {}
  await locator.evaluate((el) => { if (!el.checked) el.click(); });
}

// Erro com as primeiras linhas do "Call log" do Playwright (diz o que ele estava
// esperando) - sem dados sensíveis, só seletores e estados dos elementos.
function resumoErro(e) {
  return e.message.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 5).join(' | ').slice(0, 450);
}

// Estado dos campos do filtro, pra descobrir por que algo não é clicável na nuvem.
async function diagnosticoFiltro(page, painelFrame) {
  const ids = ['iAbrirFiltro', 'iDataCriacao', 'iDataInicial', 'iDataFinal', 'iHistoricoReabertura', 'iSituacaoOS', 'iEstadosBrasil', 'iPesquisar'];
  const partes = [];
  for (const id of ids) {
    const l = painelFrame.locator('#' + id);
    const n = await l.count().catch(() => -1);
    const vis = n > 0 ? await l.first().isVisible().catch(() => false) : false;
    partes.push(`${id}:${n}${vis ? 'V' : 'x'}`);
  }
  const frames = await page.locator('iframe[src*="Gestao_Equipe"]').count().catch(() => -1);
  log(`[diagnóstico filtro] ${partes.join(' ')} | iframes Gestao_Equipe: ${frames}`);
}

// opts.situacao: valor do select "Situação" ('abertas' = mapa; '' = todas).
// opts.dias: janela pela Data de Criação. opts.subdir: pasta do download.
// opts.fecharNoFim: false quando ainda vamos usar a mesma aba depois.
async function exportFromAniel(nav, opts = {}) {
  const situacao = opts.situacao ?? 'abertas';
  const dias = opts.dias ?? 14;
  const pastaDestino = opts.subdir ? path.join(TMP_DIR, opts.subdir) : TMP_DIR;
  const fecharNoFim = opts.fecharNoFim !== false;
  const campoData = opts.campoData || 'iDataCriacao';
  let page = nav.page;
  let painelFrame = nav.painelFrame;

  try {
    // O tempo que a busca leva pra terminar no servidor varia bastante
    // conforme o volume de registros do dia (já vimos de ~700 a ~1600) e
    // nenhuma espera (fixa, indicador de carregamento, comparação de
    // contagem) se mostrou 100% confiável pra saber quando ela realmente
    // terminou. Em vez de adivinhar, verificamos o arquivo baixado de
    // verdade: se vier vazio (só título+cabeçalho), esperamos mais um
    // pouco e tentamos de novo, reaplicando os filtros do zero a cada vez
    // (o painel fecha sozinho depois da primeira busca, e não temos certeza
    // se ele preserva os valores ao reabrir).
    fs.mkdirSync(pastaDestino, { recursive: true });
    let destPath = null;
    const tentativasEspera = [4000, 8000, 15000, 25000].slice(0, opts.maxTentativas || 4);
    for (let tentativa = 0; tentativa < tentativasEspera.length; tentativa++) {
      try {
        const jaAberto = await painelFrame.locator('#iDataCriacao').isVisible().catch(() => false);
        if (!jaAberto) await painelFrame.locator('#iAbrirFiltro').click({ timeout: 30000 });
        // Espera o painel de filtro abrir de verdade em vez de um tempo fixo.
        await painelFrame.locator('#iDataCriacao').waitFor({ state: 'visible' });

        // O rádio de qual campo de data usar (Criação/Agendamento/Encerramento/
        // etc) parece ficar "lembrado" pela conta do Aniel entre sessões - não
        // basta confiar no que vier marcado por padrão. Precisa fixar
        // explicitamente "Data de Criação" toda vez, senão herda o que outro
        // script (ex: exportar-produtividade.js, que usa Data de Encerramento)
        // deixou marcado por último, e "Abertas + Data de Encerramento" é uma
        // combinação praticamente impossível (ticket aberto não tem data de
        // encerramento) - foi exatamente isso que derrubou o mapa pra 0 registros.
        await marcar(painelFrame.locator('#' + campoData));
        // iDataInicial nunca era setado explicitamente - ficava com o que
        // sobrava "lembrado" da sessão do Aniel (geralmente dia 1 do mês
        // corrente), então perto do fim do mês o mapa só mostrava os chamados
        // abertos DESSE mês, perdendo os ainda abertos de antes. Agora fixa
        // uma janela rolante de 14 dias, sempre, independente de virada de mês.
        const hoje = new Date();
        const duasSemanasAtras = new Date(hoje);
        duasSemanasAtras.setDate(duasSemanasAtras.getDate() - dias);
        await setDatepicker(page, 'iDataInicial', duasSemanasAtras);
        await setDatepicker(page, 'iDataFinal', hoje);

        await marcar(painelFrame.locator('#iHistoricoReabertura'));
        await painelFrame.locator('#iSituacaoOS').selectOption(situacao);

        // Esse Aniel é compartilhado com outras regionais da empresa (PB, PE,
        // BA aparecem juntos se não filtrar) - sem isso a busca traz o Brasil
        // inteiro, e o filtro por cidade (MAPA_FILTRO_CIDADES) só descarta
        // isso depois, no site. Filtrar aqui já deixa a busca no Aniel mais
        // rápida/leve e evita gravar no Supabase o que nunca vai ser exibido.
        await painelFrame.locator('#iEstadosBrasil').selectOption('RN');

        await painelFrame.locator('#iPesquisar').click();
        await page.waitForTimeout(tentativasEspera[tentativa]);

        await painelFrame.locator('button[title="Opções"]').click();
        // Espera o menu abrir de verdade em vez de um tempo fixo.
        await painelFrame.locator('a.dropdown-item:has-text("Exportar Excel")').waitFor({ state: 'visible' });

        const timeoutDownload = 45000 + tentativa * 45000; // 45s, 90s, 135s, 180s
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: timeoutDownload }),
          painelFrame.locator('a.dropdown-item:has-text("Exportar Excel")').click(),
        ]);

        const nomeArquivo = download.suggestedFilename();
        const tmpPath = path.join(pastaDestino, nomeArquivo);
        // ESTE é o ponto onde o Chrome costuma crashar de verdade - agora
        // está DENTRO do try/catch da tentativa, então um crash aqui cai no
        // catch abaixo e aciona o retry (com navegador novo se necessário),
        // em vez de matar o script inteiro (bug real que existia antes).
        await download.saveAs(tmpPath);

        const linhas = contarLinhasXlsx(tmpPath);
        log(`Tentativa ${tentativa + 1}: planilha exportada com ${linhas} linha(s) (título+cabeçalho = 2 significa vazia)`);
        if (linhas > 2) {
          destPath = tmpPath;
          break;
        }
      } catch (e) {
        const morreu = page.isClosed();
        log(`Tentativa ${tentativa + 1}: falhou (${resumoErro(e)})${morreu ? ' - navegador morreu, abrindo um novo' : ' - tentando de novo'}`);
        if (!morreu) await diagnosticoFiltro(page, painelFrame);
        if (morreu) {
          await nav.browser.close().catch(() => {});
          try {
            const novo = await abrirNavegadorEPainel();
            nav.browser = novo.browser;
            nav.context = novo.context;
            page = nav.page = novo.page;
            painelFrame = nav.painelFrame = novo.painelFrame;
          } catch (e2) {
            log(`Não consegui reabrir o navegador: ${e2.message.split('\n')[0]}`);
            throw e2;
          }
        }
      }
    }

    if (!destPath) {
      throw new Error('A planilha veio vazia em todas as tentativas - a busca no Aniel não retornou registros.');
    }

    if (fecharNoFim) await page.close();
    return destPath;
  } catch (err) {
    await dumpDebug(page, 'aniel-fail');
    if (fecharNoFim) await page.close();
    throw err;
  }
}

// ---------------- ORIGEM DO PROTOCOLO (SLA conta da /1) ----------------
// Protocolo = base + etapa (8992570/1 = abertura original, /2 = 1ª reabertura).
// Desde 04/09/2026 o Aniel manda a coluna "Abertura Original" VAZIA nas
// reaberturas, e a /1 (já fechada) não vem na exportação de abertas - o site
// acabava contando o SLA da abertura da /2 (caso real: 8992570/2 com 32h,
// sendo a /1 de 05/10/2026). Quando aparece reabertura sem data da /1
// conhecida, o robô faz UMA exportação extra com "todas as situações" +
// histórico de reabertura (que traz a /1) e guarda as datas num cache
// (memória) que dura enquanto o job da nuvem estiver rodando. As datas vão
// pro site junto da importação (window.__OPS_ORIGEM_PROTOCOLO).
const ORIGEM_CACHE = path.join(TMP_DIR, 'origem-protocolos.json');
// A /1 que gerou a reabertura foi ENCERRADA pouco antes da /2 ser aberta, e o
// mapa só tem chamados criados nos últimos 14 dias - então basta buscar o que
// foi encerrado nos últimos 15 dias (todas as situações + histórico de
// reabertura). Buscar por Data de Criação em 45 dias ficou pesado demais
// (o Aniel não entregava o arquivo a tempo).
const ORIGEM_JANELA_DIAS = 15;
const ORIGEM_INTERVALO_MIN_MIN = 20;   // no máx. 1 exportação extra a cada 20min
const ORIGEM_INTERVALO_MAX_MIN = 360;  // e ao menos 1 a cada 6h (refresca a memória)

function normalizaTxt(str) {
  return (str || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function protoBase(p) { return String(p || '').trim().replace(/\s*\/\s*\d+\s*$/, ''); }
function protoVer(p) { const m = String(p || '').match(/\/\s*(\d+)\s*$/); return m ? parseInt(m[1], 10) : 1; }

// Devolve { txt: 'dd/mm/aaaa hh:mm', t: epoch } ou null.
function dataBR(v) {
  if (v === null || v === undefined || v === '') return null;
  let d = null;
  if (typeof v === 'number') {
    const c = XLSX.SSF.parse_date_code(v);
    if (c && c.y > 1) d = new Date(c.y, c.m - 1, c.d, c.H, c.M);
  } else if (v instanceof Date) {
    d = v;
  } else {
    const m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (m && Number(m[3]) > 1) d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]));
  }
  if (!d || isNaN(d.getTime())) return null;
  const p2 = (n) => String(n).padStart(2, '0');
  return { txt: `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`, t: d.getTime() };
}

// Lê a planilha exportada do Aniel e devolve [{ proto, criacao, original }].
function lerEtapasDaPlanilha(filePath) {
  let buf = fs.readFileSync(filePath);
  // mesmo conserto do site: xmlns repetido dentro de <is> faz o SheetJS ler texto vazio
  try {
    const zip = new AdmZip(buf);
    let mudou = false;
    for (const e of zip.getEntries()) {
      if (!/^xl\/worksheets\/.*\.xml$/.test(e.entryName)) continue;
      const xml = zip.readAsText(e);
      const fixed = xml.replace(/(<is\b[^>]*)\s+xmlns="[^"]*"/g, '$1');
      if (fixed !== xml) { zip.updateFile(e.entryName, Buffer.from(fixed, 'utf8')); mudou = true; }
    }
    if (mudou) buf = zip.toBuffer();
  } catch (e) { /* segue com a leitura normal */ }
  const wb = XLSX.read(buf, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
  const tipoColuna = (h) => {
    const n = normalizaTxt(h);
    if (n.includes('ordem servico') || n === 'protocolo') return 'proto';
    if (n.includes('abertura original')) return 'original';
    if (n.includes('data') && n.includes('criacao')) return 'criacao';
    return null;
  };
  let hIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if ((rows[i] || []).map(tipoColuna).includes('proto')) { hIdx = i; break; }
  }
  if (hIdx < 0) return [];
  const cols = rows[hIdx].map(tipoColuna);
  const idx = (k) => cols.indexOf(k);
  const out = [];
  for (const r of rows.slice(hIdx + 1)) {
    const proto = String(r[idx('proto')] ?? '').trim();
    if (!proto) continue;
    out.push({
      proto,
      criacao: idx('criacao') >= 0 ? dataBR(r[idx('criacao')]) : null,
      original: idx('original') >= 0 ? dataBR(r[idx('original')]) : null,
    });
  }
  return out;
}

function lerCacheOrigem() {
  try {
    const c = JSON.parse(fs.readFileSync(ORIGEM_CACHE, 'utf8'));
    return { geradoEm: c.geradoEm || 0, mapa: c.mapa || {}, buscados: c.buscados || [] };
  } catch (e) { return { geradoEm: 0, mapa: {}, buscados: [] }; }
}
function salvarCacheOrigem(c) {
  try { fs.mkdirSync(TMP_DIR, { recursive: true }); fs.writeFileSync(ORIGEM_CACHE, JSON.stringify(c)); } catch (e) {}
}
// guarda a data mais antiga por número base
function registrarOrigem(mapa, base, d) {
  if (!base || !d) return;
  const cur = mapa[base];
  if (!cur || d.t < cur.t) mapa[base] = d;
}
function absorverEtapas(mapa, etapas) {
  for (const e of etapas) {
    const base = protoBase(e.proto);
    registrarOrigem(mapa, base, e.original);           // formato antigo (exata)
    registrarOrigem(mapa, base, e.criacao);            // /1 exata; /2+ = etapa mais antiga
  }
}

// Monta { base: 'dd/mm/aaaa hh:mm' } para as reaberturas do mapa. Faz a
// exportação extra de histórico só quando precisa (e respeitando os limites).
async function origensDasReaberturas(nav, arquivoMapa) {
  const etapas = lerEtapasDaPlanilha(arquivoMapa);
  const cache = lerCacheOrigem();
  absorverEtapas(cache.mapa, etapas);

  const reaberturas = etapas.filter((e) => protoVer(e.proto) >= 2);
  const bases = [...new Set(reaberturas.map((e) => protoBase(e.proto)))];
  // reabertura sem data da /1 conhecida: o melhor que temos é a própria etapa
  const semOrigem = bases.filter((b) => {
    const etapaMaisAntiga = Math.min(...reaberturas.filter((e) => protoBase(e.proto) === b && e.criacao).map((e) => e.criacao.t));
    const conhecida = cache.mapa[b];
    return !conhecida || conhecida.t >= etapaMaisAntiga;
  });
  // não repete a busca por protocolo que já foi procurado no último histórico
  // (ex: /1 mais antiga que a janela) - espera o refresco de 6h
  const novos = semOrigem.filter((b) => !cache.buscados.includes(b));
  const idadeMin = (Date.now() - (cache.geradoEm || 0)) / 60000;
  const precisa = (novos.length > 0 && idadeMin >= ORIGEM_INTERVALO_MIN_MIN) || idadeMin >= ORIGEM_INTERVALO_MAX_MIN;
  log(`Origem /1: ${bases.length} reabertura(s) no mapa, ${semOrigem.length} sem data da /1 conhecida${precisa ? ' - buscando histórico no Aniel' : ''}.`);

  if (precisa) {
    try {
      const arq = await exportFromAniel(nav, { situacao: '', campoData: 'iDataEncerramento', dias: ORIGEM_JANELA_DIAS, subdir: 'historico', fecharNoFim: false, maxTentativas: 3 });
      const hist = lerEtapasDaPlanilha(arq);
      absorverEtapas(cache.mapa, hist);
      cache.geradoEm = Date.now();
      cache.buscados = semOrigem.slice();
      const aindaSem = semOrigem.filter((b) => !hist.some((e) => protoBase(e.proto) === b && protoVer(e.proto) === 1));
      log(`Origem /1: histórico com ${hist.length} etapa(s); ${semOrigem.length - aindaSem.length} reabertura(s) resolvida(s) pela /1${aindaSem.length ? `, ${aindaSem.length} sem a /1 na janela de ${ORIGEM_JANELA_DIAS} dias` : ''}.`);
    } catch (e) {
      log(`Origem /1: não consegui exportar o histórico (${resumoErro(e)}) - seguindo com a memória.`);
    }
  }
  salvarCacheOrigem(cache);

  const saida = {};
  for (const b of bases) if (cache.mapa[b]) saida[b] = cache.mapa[b].txt;
  return saida;
}

async function importToSite(context, filePath, origens = {}) {
  const page = await context.newPage();
  // datas da /1 das reaberturas, lidas pelo site na importação (common.js)
  await page.addInitScript((m) => { window.__OPS_ORIGEM_PROTOCOLO = m; }, origens);
  page.setDefaultTimeout(90000);

  page.on('dialog', async (dialog) => {
    log(`Diálogo do site: "${dialog.message()}" - aceitando automaticamente`);
    await dialog.accept();
  });


  try {
    // Revertido pro jeito com tempos fixos: a versão "esperta" (esperar só o
    // elemento ficar visível) causou clique "no vazio" no botão de importar
    // (nunca abria o seletor de arquivo) - visível não é o mesmo que
    // clicável de verdade aqui, e não valeu o risco pra essa parte.
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const loginBtn = page.getByText('Entrar no sistema');
    const loginVisible = await loginBtn.isVisible().catch(() => false);
    if (loginVisible) {
      if (!SITE_USER || !SITE_PASS) {
        throw new Error('Secrets SITE_USER / SITE_PASS não estão configurados no GitHub.');
      }
      await page.locator('#lg-usr').fill(SITE_USER);
      await page.locator('#lg-pwd').fill(SITE_PASS);
      await loginBtn.click();
      await page.waitForTimeout(3000);
      const stillOnLogin = await loginBtn.isVisible().catch(() => false);
      if (stillOnLogin) {
        throw new Error('Login no site OPE Touros não passou - confira os Secrets SITE_USER / SITE_PASS.');
      }
    }

    const filtrosBtn = page.getByText('Filtros detalhados', { exact: false });
    if (await filtrosBtn.isVisible().catch(() => false)) {
      await filtrosBtn.click();
      await page.waitForTimeout(1500);
    }

    const importBtn = page.locator('#qf-btn-importar');
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      importBtn.click(),
    ]);
    await fileChooser.setFiles(filePath);

    // Fluxo real do site (visto no código-fonte): parse do arquivo -> geocodifica
    // cidades novas (pode demorar) -> confirm() substituir/adicionar (nosso
    // page.on('dialog') aceita sozinho) -> salva local -> ENVIA pro backend
    // compartilhado -> só então sincroniza de verdade pra todo mundo.
    // Esperamos a confirmação de verdade, não só o texto local, senão a
    // sincronização com a nuvem nunca chega a acontecer.
    //
    // O Mapa de Serviços migrou do Apps Script pro Supabase (a coleção mais
    // pesada do site vinha estourando a cota diária de execução do Apps
    // Script, que é compartilhada com todas as outras páginas). O envio faz
    // vários POSTs em lote (upsert) seguidos de um DELETE final que limpa o
    // que ficou desatualizado - esse DELETE é sempre a última chamada da
    // sincronização, então é o sinal confiável de que terminou de verdade.
    const syncResponse = await page.waitForResponse((res) => {
      const url = res.url();
      return res.request().method() === 'DELETE' && url.includes('mapa_servicos_registros') && url.includes('atualizado_em=lt.');
    }, { timeout: 300000 });
    log(`Resposta da sincronização com a nuvem: status ${syncResponse.status()}`);
    if (!syncResponse.ok()) {
      const corpo = await syncResponse.text().catch(() => '');
      throw new Error(`Sincronização com a nuvem não confirmou sucesso: status ${syncResponse.status()} - ${corpo.slice(0, 300)}`);
    }

    // depois da resposta acima, o site ainda dispara (await, em sequência)
    // uma gravação de "última importação" num Apps Script separado que tem
    // andado bem lento (visto até 28s numa chamada só, às vezes com retry) -
    // 3s não era suficiente e a página fechava antes disso terminar, por
    // isso o "última importação" nunca vinha da sincronização automática.
    await page.waitForTimeout(60000);
    await page.close();
  } catch (err) {
    await dumpDebug(page, 'site-fail');
    await page.close();
    throw err;
  }
}

(async () => {
  let nav;
  try {
    log('Iniciando sincronização (nuvem)...');
    nav = await abrirNavegadorEPainel();

    const filePath = await exportFromAniel(nav, { fecharNoFim: false });
    log('Exportado do Aniel.');

    let origens = {};
    try {
      origens = await origensDasReaberturas(nav, filePath);
    } catch (e) {
      log(`Origem /1: falhou (${resumoErro(e)}) - o site usa só a memória dele.`);
    }
    await nav.page.close().catch(() => {});

    await importToSite(nav.context, filePath, origens);
    log('Importado no site com sucesso.');
  } catch (err) {
    log(`ERRO: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (nav && nav.browser) await nav.browser.close().catch(() => {});
  }
})();
