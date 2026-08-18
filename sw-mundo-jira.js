const CACHE_NAME = 'mundo-jira-v3';
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
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
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
