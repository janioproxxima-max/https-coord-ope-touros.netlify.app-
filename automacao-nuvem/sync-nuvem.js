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
const { ANIEL_URL, MENU_SELECTOR, esperarMenuOuLogin } = require('./aniel-common');

const { ANIEL_USER, ANIEL_PASS, SITE_USER, SITE_PASS } = process.env;
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
async function exportFromAniel(nav) {
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
    fs.mkdirSync(TMP_DIR, { recursive: true });
    let destPath = null;
    const tentativasEspera = [4000, 8000, 15000, 25000];
    for (let tentativa = 0; tentativa < tentativasEspera.length; tentativa++) {
      try {
        await painelFrame.locator('#iAbrirFiltro').click();
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
        await painelFrame.locator('#iDataCriacao').check();
        // iDataInicial nunca era setado explicitamente - ficava com o que
        // sobrava "lembrado" da sessão do Aniel (geralmente dia 1 do mês
        // corrente), então perto do fim do mês o mapa só mostrava os chamados
        // abertos DESSE mês, perdendo os ainda abertos de antes. Agora fixa
        // uma janela rolante de 14 dias, sempre, independente de virada de mês.
        const hoje = new Date();
        const duasSemanasAtras = new Date(hoje);
        duasSemanasAtras.setDate(duasSemanasAtras.getDate() - 14);
        await setDatepicker(page, 'iDataInicial', duasSemanasAtras);
        await setDatepicker(page, 'iDataFinal', hoje);

        await painelFrame.locator('#iHistoricoReabertura').check();
        await painelFrame.locator('#iSituacaoOS').selectOption('abertas');

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
        const tmpPath = path.join(TMP_DIR, nomeArquivo);
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
        log(`Tentativa ${tentativa + 1}: falhou (${e.message.split('\n')[0]})${morreu ? ' - navegador morreu, abrindo um novo' : ' - tentando de novo'}`);
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

    await page.close();
    return destPath;
  } catch (err) {
    await dumpDebug(page, 'aniel-fail');
    await page.close();
    throw err;
  }
}

async function importToSite(context, filePath) {
  const page = await context.newPage();
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

    const filePath = await exportFromAniel(nav);
    log('Exportado do Aniel.');

    await importToSite(nav.context, filePath);
    log('Importado no site com sucesso.');
  } catch (err) {
    log(`ERRO: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (nav && nav.browser) await nav.browser.close().catch(() => {});
  }
})();
