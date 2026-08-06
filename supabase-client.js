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
    if (res.status === 204) return null;
    const texto = await res.text();
    return texto ? JSON.parse(texto) : null;
  }

  // Busca todos os registros de uma tabela. filtro é opcional, ex:
  // "ticket_id=eq.abc123" (sintaxe de query do PostgREST).
  async function select(tabela, filtro){
    const query = filtro ? `?select=*&${filtro}` : '?select=*';
    const dados = await req(`${tabela}${query}`, { method: 'GET' });
    return dados || [];
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
