/* =========================================================
   Coordenação de Operações · Touros — núcleo compartilhado
   Storage local (por navegador), catálogo de cidades/RN com
   ponto central de fallback, e categorização de serviços.
========================================================= */

const OPS = (() => {

  const STORAGE_KEY = 'ops_touros_mapa_servicos_v1';

  // Coordenadas centrais aproximadas dos municípios (fallback quando
  // o registro não tem coordenada própria, ou quando a coordenada
  // informada cai fora de um raio plausível para a cidade).
  const CITY_CENTERS = {
    'touros':                 { lat: -5.1989, lng: -35.4608 },
    'natal':                  { lat: -5.7945, lng: -35.2110 },
    'acari':                  { lat: -6.4136, lng: -36.6417 },
    'canguaretama':           { lat: -6.3800, lng: -35.1289 },
    'carnauba dos dantas':    { lat: -6.5464, lng: -36.6533 },
    'ceara mirim':            { lat: -5.5505, lng: -35.3767 },
    'ceara-mirim':            { lat: -5.5505, lng: -35.3767 },
    'extremoz':               { lat: -5.6564, lng: -35.2953 },
    'jardim do serido':       { lat: -6.5539, lng: -36.8619 },
    'parelhas':               { lat: -6.6822, lng: -36.6608 },
    'sao jose de mipibu':     { lat: -6.0703, lng: -35.2372 },
    'sao miguel do gostoso':  { lat: -5.0567, lng: -35.6664 },
    'joao camara':            { lat: -5.5433, lng: -35.8244 },
    'maxaranguape':           { lat: -5.4708, lng: -35.3572 },
    'rio do fogo':            { lat: -5.2761, lng: -35.3831 },
    'pureza':                 { lat: -5.3611, lng: -35.3922 },
    'taipu':                  { lat: -5.6547, lng: -35.6297 },
    'poco branco':            { lat: -5.6667, lng: -35.6167 },
  };

  const DEFAULT_CENTER = CITY_CENTERS['touros'];

  // raio (km) além do qual consideramos a coordenada informada
  // "fora da cidade" e usamos o ponto central no lugar dela.
  const MAX_CITY_RADIUS_KM = 40;

  function normalize(str){
    return (str || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos
  }

  function cityCenter(cidade){
    return CITY_CENTERS[normalize(cidade)] || null;
  }

  function haversineKm(a, b){
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI/180;
    const dLng = (b.lng - a.lng) * Math.PI/180;
    const s = Math.sin(dLat/2)**2 +
      Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  // Resolve a coordenada "efetiva" de um registro para exibição no mapa.
  // Retorna { lat, lng, approx } — approx=true quando usamos o ponto
  // central da cidade (coordenada ausente ou fora do raio esperado).
  function resolveCoords(record){
    const center = cityCenter(record.cidade) || DEFAULT_CENTER;
    const hasOwn = typeof record.lat === 'number' && typeof record.lng === 'number'
      && !isNaN(record.lat) && !isNaN(record.lng);

    if (!hasOwn){
      return { lat: center.lat, lng: center.lng, approx: true };
    }
    const dist = haversineKm(center, { lat: record.lat, lng: record.lng });
    if (dist > MAX_CITY_RADIUS_KM){
      return { lat: center.lat, lng: center.lng, approx: true };
    }
    return { lat: record.lat, lng: record.lng, approx: false };
  }

  // Categorização de tipo de serviço a partir do título — usado para
  // ícone no mapa e filtro por tipo.
  const TYPE_RULES = [
    { key: 'ativacao',    label: 'Ativação (instalação)',    icon: '📡', test: /fibra ativa|instala/i },
    { key: 'troca',       label: 'Troca de endereço',        icon: '🔀', test: /troca de endere/i },
    { key: 'recolhimento',label: 'Recolhimento',             icon: '📦', test: /recolhimento/i },
    { key: 'sem_acesso',  label: 'Sem acesso / dificuldade',  icon: '🚧', test: /sem acesso|dificuldade/i },
    { key: 'cabo_baixo',  label: 'Cabo baixo',               icon: '🔌', test: /cabo baixo/i },
    { key: 'retencao',    label: 'Retenção de cliente',      icon: '🛡️', test: /retencao|reten..o/i },
    { key: 'adicional',   label: 'Serviços adicionais',      icon: '➕', test: /adicion/i },
  ];
  const TYPE_OTHER = { key: 'outros', label: 'Outros', icon: '⚙️' };

  function classifyType(titulo){
    const t = normalize(titulo);
    for (const rule of TYPE_RULES){
      if (rule.test.test(t)) return rule;
    }
    return TYPE_OTHER;
  }

  function allTypes(){ return [...TYPE_RULES, TYPE_OTHER]; }

  // -------- storage --------
  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(e){ console.error('Falha ao ler dados salvos', e); return null; }
  }
  function save(records){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
  function clearAll(){
    localStorage.removeItem(STORAGE_KEY);
  }

  // -------- storage genérico (usado por outros módulos: pessoas, frotas, desligamentos) --------
  function loadData(key){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(e){ console.error('Falha ao ler dados salvos', e); return null; }
  }
  function saveData(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }

  // -------- CSV --------
  function parseCSV(text){
    const rows = [];
    let row = [], field = '', inQuotes = false;
    for (let i = 0; i < text.length; i++){
      const c = text[i];
      if (inQuotes){
        if (c === '"' && text[i+1] === '"'){ field += '"'; i++; }
        else if (c === '"'){ inQuotes = false; }
        else field += c;
      } else {
        if (c === '"'){ inQuotes = true; }
        else if (c === ','){ row.push(field); field = ''; }
        else if (c === '\n' || c === '\r'){
          if (c === '\r' && text[i+1] === '\n') continue;
          row.push(field); field = '';
          if (row.length > 1 || row[0] !== '') rows.push(row);
          row = [];
        } else field += c;
      }
    }
    if (field !== '' || row.length){ row.push(field); rows.push(row); }
    return rows;
  }

  function downloadCSV(filename, headers, dataRows){
    const lines = [headers.join(',')];
    dataRows.forEach(row => {
      lines.push(row.map(v => `"${(v ?? '').toString().replace(/"/g,'""')}"`).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  // Lê um arquivo CSV ou Excel (.xlsx/.xls) e devolve uma matriz de linhas
  // (array de arrays) igual ao parseCSV — pronto pra mapear colunas.
  // callback(rows) é chamado quando terminar de ler.
  function readSpreadsheetFile(file, callback){
    const name = (file.name || '').toLowerCase();
    const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls');
    const reader = new FileReader();
    if (isExcel){
      reader.onload = () => {
        try{
          const data = new Uint8Array(reader.result);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
            .map(r => r.map(c => (c === null || c === undefined) ? '' : String(c)));
          callback(rows);
        }catch(e){
          console.error('Falha ao ler Excel', e);
          alert('Não consegui ler esse arquivo Excel. Verifique se é um .xlsx/.xls válido.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => callback(parseCSV(reader.result).filter(r => r.some(c => (c||'').trim() !== '')));
      reader.readAsText(file, 'UTF-8');
    }
  }

  function uid(){
    return 'r' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  return {
    STORAGE_KEY, CITY_CENTERS, DEFAULT_CENTER, MAX_CITY_RADIUS_KM,
    normalize, cityCenter, haversineKm, resolveCoords,
    classifyType, allTypes, TYPE_OTHER,
    load, save, clearAll, uid,
    loadData, saveData, parseCSV, downloadCSV, readSpreadsheetFile,
  };
})();

/* ---------------- login + shell (sidebar) compartilhados ----------------
   Gate simples de usuário/senha (mesmo esquema já usado no painel de
   Indicadores) protegendo o site inteiro. É uma trava informal, não uma
   autenticação segura — usuário e senha ficam visíveis no código-fonte. */

const OPS_USERS = { coordenador: 'ops2024', admin: 'touros2025' };
const OPS_NAV_LINKS = [
  { href: 'index.html',           label: 'Início',            icon: '📊' },
  { href: 'mapa-servicos.html',    label: 'Mapa de Serviços',   icon: '📍' },
  { href: 'gestao-pessoas.html',   label: 'Gestão de Pessoas',  icon: '👥' },
  { href: 'frotas.html',          label: 'Frotas',             icon: '🚚' },
  { href: 'desligamentos.html',    label: 'Desligamentos',      icon: '📤' },
  { href: 'indicadores.html',      label: 'Indicadores',        icon: '📈' },
];

function requireAuthThenInit(active, pageTitle){
  if (sessionStorage.getItem('ops_user')){
    initShell(active, pageTitle);
  } else {
    showLogin(() => initShell(active, pageTitle));
  }
}

function showLogin(onSuccess){
  const wrap = document.createElement('div');
  wrap.id = 'login-wrap';
  wrap.innerHTML = `
    <div class="login-box">
      <div class="lbox-brand">
        <div class="icon">OPS</div>
        <div><h2>Coordenação de Operações</h2><p>Unidade Touros</p></div>
      </div>
      <div class="lfield"><label>Usuário</label><input type="text" id="lg-usr" placeholder="coordenador" autocomplete="username"></div>
      <div class="lfield"><label>Senha</label><input type="password" id="lg-pwd" placeholder="••••••••" autocomplete="current-password"></div>
      <button class="lbtn" id="lg-btn">Entrar no sistema</button>
      <div class="lerr" id="lg-err">Usuário ou senha incorretos.</div>
    </div>
  `;
  document.body.appendChild(wrap);

  function attempt(){
    const u = document.getElementById('lg-usr').value.trim();
    const p = document.getElementById('lg-pwd').value;
    if (OPS_USERS[u] && OPS_USERS[u] === p){
      sessionStorage.setItem('ops_user', u);
      wrap.remove();
      onSuccess();
    } else {
      document.getElementById('lg-err').style.display = 'block';
    }
  }
  document.getElementById('lg-btn').addEventListener('click', attempt);
  wrap.querySelectorAll('input').forEach(inp =>
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); })
  );
  wrap.querySelector('#lg-usr').focus();
}

function initShell(active, pageTitle){
  document.body.classList.add('has-shell', 'authed');

  // move todo o conteúdo já presente no body (exceto <script>) para dentro do shell
  const contentNodes = Array.from(document.body.children).filter(el => el.tagName !== 'SCRIPT');

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sb-brand">
      <div class="tag">OPS · Coord.</div>
      <h1>Coord. Regional</h1>
      <p>Unidade Touros</p>
    </div>
    <div class="sb-section">Painéis</div>
    ${OPS_NAV_LINKS.map(l => `<a class="sb-item ${l.href === active ? 'active' : ''}" href="${l.href}"><span class="ico">${l.icon}</span><span>${l.label}</span></a>`).join('')}
    <div class="sb-footer">
      <div class="sb-update">Última atualização</div>
      <div class="sb-date" id="sb-date">--/--/----</div>
    </div>
  `;

  const topbar = document.createElement('div');
  topbar.className = 'topbar';
  topbar.innerHTML = `
    <div class="crumb">
      <span class="unit">OPS · Coordenação</span>
      <span class="sep">·</span>
      <span class="page">${pageTitle}</span>
    </div>
    <div class="spacer"></div>
    <div class="clock" id="ops-clock"></div>
    <span class="user-pill" id="user-pill" title="Sair">${(sessionStorage.getItem('ops_user') || 'usuário')} ×</span>
  `;

  const shellMain = document.createElement('div');
  shellMain.className = 'shell-main';
  const shellContent = document.createElement('div');
  shellContent.className = 'shell-content';
  contentNodes.forEach(n => shellContent.appendChild(n));
  shellMain.appendChild(topbar);
  shellMain.appendChild(shellContent);

  document.body.appendChild(sidebar);
  document.body.appendChild(shellMain);

  const clockEl = topbar.querySelector('#ops-clock');
  function tick(){
    const now = new Date();
    clockEl.textContent = now.toLocaleDateString('pt-BR') + ' · ' + now.toLocaleTimeString('pt-BR');
  }
  tick(); setInterval(tick, 1000);

  const now = new Date();
  sidebar.querySelector('#sb-date').textContent =
    `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;

  topbar.querySelector('#user-pill').addEventListener('click', () => {
    sessionStorage.removeItem('ops_user');
    location.reload();
  });
}
