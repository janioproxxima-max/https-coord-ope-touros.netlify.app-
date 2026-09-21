// Endereço do Aniel + verificação de login, compartilhados por TODOS os scripts.
// Se o endereço do Aniel mudar de novo, troque só aqui (uma linha).
// Também dá pra sobrescrever sem editar arquivo: variável de ambiente ANIEL_URL.

const ANIEL_URL = process.env.ANIEL_URL || 'https://proxxima.sinapseinformatica.com.br/Web/Aniel.Connect/#!';

const MENU_SELECTOR = 'a.nav-link:has-text("Gestão de Técnicos")';

// Espera a tela principal do Aniel (menu "Gestão de Técnicos") OU detecta que
// caiu na tela de login. Antes, o script só esperava o menu e, se o Aniel
// mostrasse a tela de login (sessão perdida / endereço novo), ficava parado até
// o timeout (90-150s) com um erro genérico. Agora falha em poucos segundos com
// uma mensagem clara e guarda print/HTML da tela em debug\.
//
// dump: função opcional (nome) => Promise, pra salvar print/HTML da tela.
async function esperarMenuOuLogin(page, { timeoutMs = 60000, dump } = {}) {
  const menu = page.locator(MENU_SELECTOR).first();
  const campoSenha = page.locator('input[type="password"]:visible').first();
  const inicio = Date.now();
  let loginDesde = null;

  while (Date.now() - inicio < timeoutMs) {
    if (page.isClosed()) throw new Error('O navegador fechou enquanto esperava o Aniel carregar.');
    if (await menu.isVisible().catch(() => false)) return;

    const url = page.url();
    const naTelaDeLogin =
      /\/Login|\/Account\/|ReturnUrl/i.test(url) ||
      (await campoSenha.isVisible().catch(() => false));

    if (naTelaDeLogin) {
      // só considera login "de verdade" se ficar assim por 4s (evita falso
      // positivo durante redirecionamentos rápidos do próprio Aniel)
      if (!loginDesde) loginDesde = Date.now();
      if (Date.now() - loginDesde > 4000) {
        if (dump) await dump('aniel-sessao-expirada').catch(() => {});
        throw new Error(
          `Aniel pediu login (sessão salva não vale neste endereço: ${url}). ` +
          'Rode ATUALIZAR-LOGIN-ANIEL.bat (ou "node login-setup.js" e "node login-setup-produtividade.js") para logar de novo.'
        );
      }
    } else {
      loginDesde = null;
    }
    await page.waitForTimeout(1000);
  }

  if (dump) await dump('aniel-menu-nao-apareceu').catch(() => {});
  let titulo = '';
  try { titulo = await page.title(); } catch (e) {}
  throw new Error(
    `O menu "Gestão de Técnicos" não apareceu em ${Math.round(timeoutMs / 1000)}s ` +
    `(URL atual: ${page.url()} | título: "${titulo}"). Veja o print em debug\\aniel-menu-nao-apareceu.png.`
  );
}

module.exports = { ANIEL_URL, MENU_SELECTOR, esperarMenuOuLogin };
