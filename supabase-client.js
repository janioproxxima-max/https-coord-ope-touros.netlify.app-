// ============================================================
// Cliente Supabase — usado só pelo Mundo Jira (chamados,
// comentários, histórico) e Produtividade. O resto do site
// (Mapa de Serviços, Pessoas, Frotas, SLA) continua no Google
// Sheets via Apps Script, sem mudança nenhuma.
// ============================================================
const OPS_SUPABASE = (function(){
  const SUPABASE_URL = 'https://hkopoafzceczmmbjvogi.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_pxL9kT16nTgq_UBcF3QQKg_YOqMiVxm';

  async function req(path, options){
    options = options || {};
    const headers = Object.assign({
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    }, options.headers || {});
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, Object.assign({}, options, { headers }));
    if (!res.ok){
      let corpo = '';
      try{ corpo = await res.text(); }catch(e){}
      throw new Error(`Supabase (${path}) respondeu ${res.status}: ${corpo.slice(0, 300)}`);
    }
    if (res.status === 204) return { dados: null, contentRange: null };
    const texto = await res.text();
    return { dados: texto ? JSON.parse(texto) : null, contentRange: res.headers.get('content-range') };
  }

  // Busca TODOS os registros de uma tabela, paginando por baixo dos panos —
  // o Supabase, por padrão, corta silenciosamente em ~1000 linhas por
  // requisição (sem erro nenhum, só devolve menos do que existe de verdade).
  // filtro é opcional, ex: "ticket_id=eq.abc123" (sintaxe de query do PostgREST).
  // colunas é opcional, ex: "id,nome,pontos" - pra telas que só usam um punhado
  // de campos de uma tabela larga (evita trazer/parsear colunas à toa e deixa
  // a resposta bem mais leve/rápida). Sem colunas, busca "*" como sempre.
  async function select(tabela, filtro, colunas){
    const TAMANHO_PAGINA = 1000;
    const query = filtro ? `?select=${colunas || '*'}&${filtro}` : `?select=${colunas || '*'}`;
    // 1ª página já pede a contagem exata (Prefer: count=exact) - com isso dá
    // pra saber de cara quantas páginas faltam e buscar todas em paralelo
    // (o navegador enfileira sozinho respeitando o limite de conexões por
    // origem) em vez de uma atrás da outra. Numa tabela com muita linha no
    // filtro (produtividade_registros passa de 20 mil num período de ~1 mês),
    // isso é a diferença entre a tela travar 15-20s ou carregar em 2-3s.
    const primeira = await req(`${tabela}${query}`, {
      method: 'GET',
      headers: { 'Range-Unit': 'items', 'Range': `0-${TAMANHO_PAGINA - 1}`, 'Prefer': 'count=exact' },
    });
    let todos = primeira.dados || [];
    if (todos.length < TAMANHO_PAGINA) return todos; // só tinha 1 página mesmo
    const total = primeira.contentRange ? parseInt(primeira.contentRange.split('/')[1], 10) : NaN;
    if (!Number.isFinite(total)){
      // Supabase não devolveu a contagem (ex: header bloqueado/removido em
      // algum proxy) - volta pro jeito sequencial de sempre, sem travar
      let inicio = TAMANHO_PAGINA;
      while (true){
        const { dados } = await req(`${tabela}${query}`, {
          method: 'GET',
          headers: { 'Range-Unit': 'items', 'Range': `${inicio}-${inicio + TAMANHO_PAGINA - 1}` },
        });
        const pagina = dados || [];
        todos = todos.concat(pagina);
        if (pagina.length < TAMANHO_PAGINA) break;
        inicio += TAMANHO_PAGINA;
      }
      return todos;
    }
    const pedidosRestantes = [];
    for (let inicio = TAMANHO_PAGINA; inicio < total; inicio += TAMANHO_PAGINA){
      pedidosRestantes.push(req(`${tabela}${query}`, {
        method: 'GET',
        headers: { 'Range-Unit': 'items', 'Range': `${inicio}-${inicio + TAMANHO_PAGINA - 1}` },
      }));
    }
    const paginas = await Promise.all(pedidosRestantes);
    paginas.forEach(p => { todos = todos.concat(p.dados || []); });
    return todos;
  }

  // Insere ou atualiza registros (upsert) — precisa de uma coluna/combinação
  // com constraint UNIQUE pra saber quando é "atualizar" (onConflict).
  async function upsert(tabela, registros, onConflict){
    if (!registros || !registros.length) return true;
    const query = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : '';
    await req(`${tabela}${query}`, {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(registros),
    });
    return true;
  }

  // Apaga registros que batem com o filtro (sintaxe PostgREST, ex:
  // "id=eq.abc123" ou "ticket_id=eq.abc123").
  async function del(tabela, filtro){
    await req(`${tabela}?${filtro}`, { method: 'DELETE' });
    return true;
  }

  return { select, upsert, del };
})();
