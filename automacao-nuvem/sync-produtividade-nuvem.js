// Versão NUVEM (GitHub Actions) do exportar-produtividade-v3.js: exporta do
// Aniel os serviços ENCERRADOS do mês (UF=RN, Data de Encerramento, pedaços de
// 3 dias), junta num arquivo só e importa no card "Colaborador" do site.
// Diferenças pro PC: Chromium de teste do Playwright, login com Secrets do
// GitHub (ANIEL_USER/ANIEL_PASS/SITE_USER/SITE_PASS), sem Z:, sem lock/power.
// Regra de segurança: nada sensível vai pro log (repositório pode ser público).

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
const LOCAL_TMP_DIR = path.join(__dirname, 'tmp-produtividade');
const SITE_URL = process.env.SITE_URL || 'https://ope-touros.vercel.app/mundo-jira.html';

function log(msg) {
  console.log(`[${new Date().toISOString()}] [produtividade-nuvem] ${msg}`);
}

const CHROME_ARGS = [
  '--disable-gpu', '--disable-dev-shm-usage', '--disable-extensions',
  '--disable-background-networking', '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
  '--disable-sync', '--disable-default-apps', '--metrics-recording-only',
  '--mute-audio', '--no-first-run',
];

async function loginAniel(page) {
  if (!ANIEL_USER || !ANIEL_PASS) {
    throw new Error('Secrets ANIEL_USER / ANIEL_PASS não estão configurados no GitHub.');
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
    let texto = '';
    try { texto = (await page.locator('body').innerText({ timeout: 3000 })).replace(/\s+/g, ' ').slice(0, 300); } catch (e2) {}
    throw new Error(`Login no Aniel não passou (URL: ${page.url()}). Texto da tela: "${texto}".`);
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
    page.setDefaultTimeout(150000);

    await page.goto(ANIEL_URL, { waitUntil: 'domcontentloaded' });
    try {
      await esperarMenuOuLogin(page, { timeoutMs: 45000, dump: (n) => dumpDebug(page, n) });
    } catch (e) {
      if (!/pediu login/.test(e.message)) throw e;
      log('Aniel pediu login - entrando com usuário/senha dos Secrets...');
      await loginAniel(page);
      log('Login no Aniel OK.');
    }

    await page.evaluate(() => { if (typeof closeOtherTabs === 'function') closeOtherTabs(true); }).catch(() => {});
    await page.locator(MENU_SELECTOR).first().click();
    await page.waitForSelector('iframe[src*="Gestao_Equipe"]');
    const frame = page.frameLocator('iframe[src*="Gestao_Equipe"]').last();
    await frame.getByText('Painel de Serviços', { exact: true }).click();
    await frame.locator('#iAbrirFiltro').waitFor({ state: 'visible' });

    return { browser, context, page, painelFrame: frame };
  } catch (err) {
    await browser.close().catch(() => {});
    throw err;
  }
}

// Marca rádio/checkbox de forma tolerante (o .check() normal do Aniel às vezes
// fica 90-150s esperando): normal rápido -> forçado -> clique via JavaScript.
async function marcar(locator) {
  try { await locator.check({ timeout: 8000 }); return; } catch (e) {}
  try { await locator.check({ force: true, timeout: 5000 }); return; } catch (e) {}
  await locator.evaluate((el) => { if (!el.checked) el.click(); });
}

function resumoErro(e) {
  return e.message.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 5).join(' | ').slice(0, 450);
}

async function diagnosticoFiltro(page, painelFrame) {
  const ids = ['iAbrirFiltro', 'iDataEncerramento', 'iDataInicial', 'iDataFinal', 'iHistoricoReabertura', 'iSituacaoOS', 'iEstadosBrasil', 'iPesquisar'];
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

function formatarData(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
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

function colLetraParaNum(letras) {
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
function lerLinhasXlsx(filePath) {
  const zip = new AdmZip(filePath);
  const sheetXml = zip.readAsText(zip.getEntry('xl/worksheets/sheet1.xml'));
  const rowBlocks = sheetXml.match(/<row [^>]*>[\s\S]*?<\/row>/g) || [];
  return rowBlocks.map(rowXml => {
    const cellBlocks = rowXml.match(/<c [^>]*?\/>|<c [^>]*?>[\s\S]*?<\/c>/g) || [];
    const map = {};
    let maxCol = 0;
    cellBlocks.forEach(c => {
      const rMatch = c.match(/r="([A-Z]+)\d+"/);
      if (!rMatch) return;
      const col = colLetraParaNum(rMatch[1]);
      maxCol = Math.max(maxCol, col);
      const isInline = /t="inlineStr"/.test(c);
      let val = '';
      if (isInline) {
        const m = c.match(/<t[^>]*>([\s\S]*?)<\/t>/);
        val = m ? m[1] : '';
      } else {
        const m = c.match(/<v>([\s\S]*?)<\/v>/);
        val = m ? m[1] : '';
      }
      map[col] = val;
    });
    const arr = [];
    for (let i = 1; i <= maxCol; i++) arr.push(map[i] || '');
    return arr;
  });
}
function mesclarArquivosXlsx(caminhos, destPath) {
  let header = null;
  let todasLinhas = [];
  caminhos.forEach(p => {
    const linhas = lerLinhasXlsx(p);
    if (!header) header = linhas.slice(0, 2);
    todasLinhas = todasLinhas.concat(linhas.slice(2));
  });
  const linhasFinal = [...header, ...todasLinhas];
  const novaSheet = XLSX.utils.aoa_to_sheet(linhasFinal);
  const novoWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(novoWb, novaSheet, 'Sheet1');
  XLSX.writeFile(novoWb, destPath);
  return { totalLinhas: linhasFinal.length, destPath };
}

async function dumpDebug(page, name) {
  try {
    const titulo = await page.title().catch(() => '');
    log(`[diagnóstico ${name}] URL: ${page.url()} | título: "${titulo}"`);
  } catch (e) {}
}

// Busca UM pedaço (intervalo de dias), com retry completo: se o navegador
// crashar em qualquer ponto (busca OU download), fecha tudo e abre um Chrome
// NOVO do zero pra tentar de novo - até MAX_TENTATIVAS vezes. Retorna o
// caminho do arquivo baixado, ou null se todas as tentativas falharem.
const MAX_TENTATIVAS_POR_PEDACO = 4;

async function buscarPedaco(nav, pedaco, idx, dataLabel, label) {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_POR_PEDACO; tentativa++) {
    try {
      const jaAberto = await nav.painelFrame.locator('#iSituacaoOS').isVisible().catch(() => false);
      if (!jaAberto) await nav.painelFrame.locator('#iAbrirFiltro').click({ timeout: 30000 });
      // Espera o painel de filtro de verdade abrir (campo visível) em vez
      // de um tempo fixo de 1s.
      await nav.painelFrame.locator('#iSituacaoOS').waitFor({ state: 'visible' });

      await nav.painelFrame.locator('#iSituacaoOS').selectOption('');
      await marcar(nav.painelFrame.locator('#iDataEncerramento'));
      await marcar(nav.painelFrame.locator('#iHistoricoReabertura'));
      await nav.painelFrame.locator('#iEstadosBrasil').selectOption('RN');

      await nav.page.evaluate(
        ({ frameSelector, elId, ano, mes, dia }) => {
          const frame = document.querySelector(frameSelector);
          const win = frame.contentWindow;
          const doc = frame.contentDocument;
          const el = doc.getElementById(elId);
          win.$(el).datepicker('setDate', new win.Date(ano, mes, dia));
          win.$(el).trigger('change');
        },
        { frameSelector: 'iframe[src*="Gestao_Equipe"]', elId: 'iDataInicial', ano: pedaco.inicio.getFullYear(), mes: pedaco.inicio.getMonth(), dia: pedaco.inicio.getDate() }
      );
      await nav.page.evaluate(
        ({ frameSelector, elId, ano, mes, dia }) => {
          const frame = document.querySelector(frameSelector);
          const win = frame.contentWindow;
          const doc = frame.contentDocument;
          const el = doc.getElementById(elId);
          win.$(el).datepicker('setDate', new win.Date(ano, mes, dia));
          win.$(el).trigger('change');
        },
        { frameSelector: 'iframe[src*="Gestao_Equipe"]', elId: 'iDataFinal', ano: pedaco.fim.getFullYear(), mes: pedaco.fim.getMonth(), dia: pedaco.fim.getDate() }
      );

      await nav.painelFrame.locator('#iPesquisar').click();
      await nav.page.waitForTimeout(10000 + tentativa * 5000);

      await nav.painelFrame.locator('button[title="Opções"]').click();
      // Espera o menu de fato abrir (item visível) em vez de um tempo fixo.
      await nav.painelFrame.locator('a.dropdown-item:has-text("Exportar Excel")').waitFor({ state: 'visible' });

      const [download] = await Promise.all([
        nav.page.waitForEvent('download', { timeout: 60000 }),
        nav.painelFrame.locator('a.dropdown-item:has-text("Exportar Excel")').click(),
      ]);

      const nomeArquivo = `Produtividade-v3-pedaco${idx + 1}-${dataLabel}.xlsx`;
      const tentativaPath = path.join(LOCAL_TMP_DIR, nomeArquivo);
      // ESTE é o ponto onde o Chrome costuma crashar - agora está DENTRO do
      // try/catch da tentativa, então um crash aqui cai no catch abaixo e
      // aciona o retry (com navegador novo), em vez de matar o script inteiro.
      await download.saveAs(tentativaPath);

      const linhas = contarLinhasXlsx(tentativaPath);
      log(`[${label}] Tentativa ${tentativa}: planilha exportada com ${linhas} linha(s) (título+cabeçalho = 2 significa vazia)`);
      if (linhas > 2) {
        return tentativaPath;
      }
      // pedaço vazio - tenta de novo sem precisar trocar de navegador
    } catch (e) {
      const morreu = nav.page.isClosed();
      log(`[${label}] Tentativa ${tentativa}: falhou (${resumoErro(e)})${morreu ? ' - navegador morreu, abrindo um novo' : ''}`);
      if (!morreu) await diagnosticoFiltro(nav.page, nav.painelFrame);
      if (morreu) {
        await nav.browser.close().catch(() => {});
        try {
          const novo = await abrirNavegadorEPainel();
          nav.browser = novo.browser;
          nav.context = novo.context;
          nav.page = novo.page;
          nav.painelFrame = novo.painelFrame;
        } catch (e2) {
          log(`[${label}] Não consegui reabrir o navegador: ${e2.message.split('\n')[0]}`);
          await dumpDebug(nav.page, `produtividade-v3-reabrir-fail-${idx}-${tentativa}`);
        }
      }
    }
  }
  return null;
}

async function exportarEncerradosDoAniel(nav) {
  const hoje = new Date();
  let inicioMes, fimBusca, dataLabel;
  if (process.env.MES_FECHADO) {
    const [ano, mes] = process.env.MES_FECHADO.split('-').map(Number);
    inicioMes = new Date(ano, mes - 1, 1);
    fimBusca = new Date(ano, mes, 0);
    dataLabel = `fechamento-${process.env.MES_FECHADO}`;
    log(`MES_FECHADO=${process.env.MES_FECHADO} - buscando o mês inteiro (${formatarData(inicioMes)} a ${formatarData(fimBusca)}).`);
  } else {
    inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    fimBusca = hoje;
    dataLabel = formatarData(hoje).replace(/\./g, '-');
  }

  fs.mkdirSync(LOCAL_TMP_DIR, { recursive: true });

  const TAMANHO_CHUNK_DIAS = 3;
  const pedacos = [];
  for (let ini = new Date(inicioMes); ini <= fimBusca; ini.setDate(ini.getDate() + TAMANHO_CHUNK_DIAS)) {
    const fim = new Date(ini);
    fim.setDate(fim.getDate() + TAMANHO_CHUNK_DIAS - 1);
    if (fim > fimBusca) fim.setTime(fimBusca.getTime());
    pedacos.push({ inicio: new Date(ini), fim });
  }

  const arquivosPedacos = [];
  for (const [idx, pedaco] of pedacos.entries()) {
    const label = `pedaço ${idx + 1}/${pedacos.length} (${formatarData(pedaco.inicio)} a ${formatarData(pedaco.fim)})`;
    const destPathPedaco = await buscarPedaco(nav, pedaco, idx, dataLabel, label);
    if (destPathPedaco) {
      arquivosPedacos.push(destPathPedaco);
    } else {
      log(`⚠️ [${label}] ficou vazio em todas as ${MAX_TENTATIVAS_POR_PEDACO} tentativas - esse intervalo NÃO entra nessa atualização.`);
    }
  }

  if (!arquivosPedacos.length) {
    throw new Error('Nenhum pedaço do mês retornou dados em nenhuma tentativa.');
  }
  if (arquivosPedacos.length < pedacos.length) {
    log(`⚠️ Só ${arquivosPedacos.length} de ${pedacos.length} pedaços do mês vieram com dados.`);
  }

  const nomeArquivoFinal = `Produtividade-v3 - ${dataLabel}.xlsx`;
  const destPathLocal = path.join(LOCAL_TMP_DIR, nomeArquivoFinal);
  const { totalLinhas } = mesclarArquivosXlsx(arquivosPedacos, destPathLocal);
  log(`Mesclados ${arquivosPedacos.length} pedaço(s) em ${destPathLocal} (${totalLinhas} linha(s) no total).`);
  arquivosPedacos.forEach(p => { if (p !== destPathLocal) fs.unlink(p, () => {}); });

  return destPathLocal;
}

async function importarNoPainelColaborador(nav, filePath) {
  // Página nova, dedicada só pro import - não reaproveita a do painel de
  // serviços (evita herdar um estado estranho se ela sobreviveu a vários
  // crashes/reaberturas ao longo da busca).
  const page = await nav.context.newPage();
  page.setDefaultTimeout(150000);

  let ultimoAlerta = '';
  page.on('dialog', async (dialog) => {
    ultimoAlerta = dialog.message();
    log(`Alerta do site: "${ultimoAlerta.split('\n')[0]}" - aceitando automaticamente`);
    await dialog.accept();
  });

  try {
    await page.goto(SITE_URL, { waitUntil: 'domcontentloaded' });
    const loginBtn = page.getByText('Entrar no sistema');
    // Corrida entre "já logado" (card visível) e "precisa logar" (botão
    // visível) em vez de um tempo fixo de 3s - segue assim que qualquer um
    // dos dois aparecer de verdade.
    await Promise.race([
      loginBtn.waitFor({ state: 'visible' }),
      page.locator('#mj-card-colaborador').waitFor({ state: 'visible' }),
    ]).catch(() => {});

    if (await loginBtn.isVisible().catch(() => false)) {
      if (!SITE_USER || !SITE_PASS) {
        throw new Error('Secrets SITE_USER / SITE_PASS não estão configurados no GitHub.');
      }
      await page.locator('#lg-usr').fill(SITE_USER);
      await page.locator('#lg-pwd').fill(SITE_PASS);
      await loginBtn.click();
      // Espera o botão sumir de verdade (login processado) - alguns logins
      // demoram mais que alguns segundos pra terminar (ex: carregando dados
      // de Gestão de Pessoas antes de liberar a tela), por isso 30s agora
      // em vez de 5s - era curto demais e causava falso negativo de login.
      await loginBtn.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
      if (await loginBtn.isVisible().catch(() => false)) {
        throw new Error('Login no site OPE Touros não passou - confira os Secrets SITE_USER / SITE_PASS.');
      }
    }

    // Mesmo com o botão de login já escondido, a tela do portal pode levar
    // mais um tempo pra realmente montar os cartões (busca dados de Gestão
    // de Pessoas, calcula o papel do usuário etc). Espera isso de verdade,
    // em vez de tentar clicar direto - era exatamente aqui que travava,
    // preso 150s tentando clicar num cartão que nunca tinha ficado visível.
    try {
      await page.locator('#mj-card-colaborador').waitFor({ state: 'visible', timeout: 60000 });
    } catch (e) {
      await dumpDebug(page, 'produtividade-v3-portal-nao-carregou');
      throw new Error('A tela do portal não carregou o cartão do Painel do Colaborador em 60s depois do login.');
    }

    await page.locator('#mj-card-colaborador').click();
    await page.waitForSelector('#mj-btn-importar-produtividade', { timeout: 15000 });

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.locator('#mj-btn-importar-produtividade').click(),
    ]);
    await fileChooser.setFiles(filePath);

    log('Aguardando processamento e sincronização com a nuvem (até 10 min)...');
    const inicioEspera = Date.now();
    while (!ultimoAlerta && Date.now() - inicioEspera < 10 * 60 * 1000) {
      await page.waitForTimeout(1000);
    }
    if (!ultimoAlerta) {
      throw new Error('Não vi nenhuma confirmação em 10 minutos.');
    }

    const LIMITE_SYNC_MIN = 15;
    const inicioSyncReal = Date.now();
    let aindaSincronizando = true;
    while (Date.now() - inicioSyncReal < LIMITE_SYNC_MIN * 60 * 1000) {
      aindaSincronizando = await page.evaluate(() => (
        typeof produtividadeSyncPendente !== 'undefined' ? produtividadeSyncPendente : false
      )).catch(() => false);
      if (!aindaSincronizando) break;
      if (ultimoAlerta.includes('⚠️')) break;
      await page.waitForTimeout(2000);
    }

    if (ultimoAlerta.includes('⚠️')) {
      throw new Error(`Site avisou falha na sincronização: ${ultimoAlerta}`);
    }
    if (aindaSincronizando){
      throw new Error(`Sincronização não terminou em ${LIMITE_SYNC_MIN} min - rode de novo.`);
    }

    log('Importação de produtividade (v3) confirmada.');
    await page.close();
  } catch (err) {
    await dumpDebug(page, 'produtividade-v3-site-fail');
    await page.close();
    throw err;
  }
}

(async () => {
  let nav;
  try {
    log('Iniciando exportação de produtividade (nuvem)...');
    nav = await abrirNavegadorEPainel();

    const filePath = await exportarEncerradosDoAniel(nav);
    log('Exportado do Aniel.');

    await importarNoPainelColaborador(nav, filePath);
    log('Produtividade importada com sucesso.');
  } catch (err) {
    log(`ERRO: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (nav && nav.browser) await nav.browser.close().catch(() => {});
  }
})();
