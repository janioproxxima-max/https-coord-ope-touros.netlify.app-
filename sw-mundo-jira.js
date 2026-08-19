const CACHE_NAME = 'mundo-jira-v4';
const ARQUIVOS_ESSENCIAIS = [
  'mundo-jira.html',
  'common.js',
  'supabase-client.js',
  'style.css',
  'mundo-jira-logo.png',
  'icon-mundo-jira-192.png',
  'icon-mundo-jira-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Estratégia: tenta buscar na rede primeiro (dados sempre atualizados);
// se estiver sem internet — ou a conexão estiver muito lenta/travada,
// como às vezes acontece no 4G do celular — cai pro que estiver em cache
// depois de um tempo limite, em vez de ficar esperando pra sempre.
//
// Só se aplica aos arquivos do próprio site (HTML/JS/CSS/ícones) - as
// chamadas de API (Supabase, Apps Script) são de outra origem e passam
// direto pra rede, sem cache. Sem essa distinção, uma chamada de API lenta
// (comum no 4G) caía pro cache depois de 8s e mostrava dado velho (ou
// nada, na primeira vez que o app é instalado e ainda não tem nada
// salvo) em vez do histórico/produtividade de verdade da equipe.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    Promise.race([
      fetch(event.request).then((resposta) => {
        const copia = resposta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resposta;
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]).catch(() => caches.match(event.request))
  );
});
