// Função serverless da Vercel: o botão "↻ Atualizar" do site chama
// POST /api/sincronizar e ela dispara, na hora, os workflows da automação
// na nuvem (GitHub Actions) - sem esperar o agendamento de 30 min / 1 h,
// que o GitHub costuma atrasar bastante.
//
// O token do GitHub NUNCA vai pro navegador: fica só na variável de
// ambiente GITHUB_TOKEN do projeto na Vercel (token "fine-grained" com
// acesso só a este repositório e permissão "Actions: Read and write").
//
// Se já existe uma sincronização rodando ou na fila, não dispara outra -
// assim vários cliques (ou várias pessoas clicando) não empilham execuções.

const REPO = 'janioproxxima-max/https-coord-ope-touros.netlify.app-';
const WORKFLOWS = {
  mapa: 'sync-mapa.yml',
  produtividade: 'sync-produtividade.yml',
};

async function gh(caminho, token, opcoes = {}) {
  const resp = await fetch(`https://api.github.com/repos/${REPO}${caminho}`, {
    ...opcoes,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ope-touros-site',
      ...(opcoes.headers || {}),
    },
  });
  return resp;
}

async function jaEmAndamento(workflow, token) {
  for (const status of ['in_progress', 'queued']) {
    const r = await gh(`/actions/workflows/${workflow}/runs?status=${status}&per_page=1`, token);
    if (!r.ok) continue;
    const dados = await r.json();
    if (dados.total_count > 0) return true;
  }
  return false;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, erro: 'Use POST' });
  }
  const token = (process.env.GITHUB_TOKEN || '').trim();
  if (!token) {
    return res.status(500).json({ ok: false, erro: 'GITHUB_TOKEN não configurado na Vercel' });
  }

  let pedidos = ['mapa', 'produtividade'];
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (Array.isArray(corpo.tipos)) pedidos = corpo.tipos.filter((t) => WORKFLOWS[t]);
  } catch (e) { /* corpo inválido: usa o padrão */ }

  const resultado = {};
  for (const tipo of pedidos) {
    const workflow = WORKFLOWS[tipo];
    try {
      if (await jaEmAndamento(workflow, token)) {
        resultado[tipo] = 'em_andamento';
        continue;
      }
      const r = await gh(`/actions/workflows/${workflow}/dispatches`, token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: 'main' }),
      });
      resultado[tipo] = r.status === 204 ? 'disparado' : `erro_${r.status}`;
    } catch (e) {
      resultado[tipo] = 'erro';
    }
  }
  const ok = Object.values(resultado).every((v) => v === 'disparado' || v === 'em_andamento');
  return res.status(ok ? 200 : 502).json({ ok, resultado });
};
