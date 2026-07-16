/* =========================================================
   Coordenação de Operações · Touros — núcleo compartilhado
   Storage local (por navegador), catálogo de cidades/RN com
   ponto central de fallback, e categorização de serviços.
========================================================= */

const OPS = (() => {

  const STORAGE_KEY = 'ops_touros_mapa_servicos_v1';

  // Registro de cidades da região: nome canônico (pra corrigir grafia/maiúsculas
  // inconsistentes vindas da planilha) + coordenada central de fallback.
  const CITY_REGISTRY = {
    'touros':                 { name: 'TOUROS',                lat: -5.1989, lng: -35.4608 },
    'natal':                  { name: 'NATAL',                 lat: -5.7945, lng: -35.2110 },
    'acari':                  { name: 'ACARI',                 lat: -6.4136, lng: -36.6417 },
    'canguaretama':           { name: 'CANGUARETAMA',          lat: -6.3800, lng: -35.1289 },
    'carnauba dos dantas':    { name: 'CARNAÚBA DOS DANTAS',   lat: -6.5464, lng: -36.6533 },
    'ceara mirim':            { name: 'CEARÁ-MIRIM',           lat: -5.5505, lng: -35.3767 },
    'ceara-mirim':            { name: 'CEARÁ-MIRIM',           lat: -5.5505, lng: -35.3767 },
    'extremoz':               { name: 'EXTREMOZ',              lat: -5.6564, lng: -35.2953 },
    'jardim do serido':       { name: 'JARDIM DO SERIDÓ',       lat: -6.5539, lng: -36.8619 },
    'parelhas':               { name: 'PARELHAS',              lat: -6.6822, lng: -36.6608 },
    'sao jose de mipibu':     { name: 'SÃO JOSÉ DE MIPIBU',     lat: -6.0703, lng: -35.2372 },
    'sao miguel do gostoso':  { name: 'SÃO MIGUEL DO GOSTOSO',  lat: -5.0567, lng: -35.6664 },
    'joao camara':            { name: 'JOÃO CÂMARA',           lat: -5.5433, lng: -35.8244 },
    'maxaranguape':           { name: 'MAXARANGUAPE',          lat: -5.4708, lng: -35.3572 },
    'rio do fogo':            { name: 'RIO DO FOGO',           lat: -5.2761, lng: -35.3831 },
    'pureza':                 { name: 'PUREZA',                lat: -5.3611, lng: -35.3922 },
    'taipu':                  { name: 'TAIPU',                 lat: -5.6547, lng: -35.6297 },
    'poco branco':            { name: 'POÇO BRANCO',           lat: -5.6667, lng: -35.6167 },
    'caicara do norte':       { name: 'CAIÇARA DO NORTE',       lat: -5.0919, lng: -35.9308 },
    'sao bento do norte':     { name: 'SÃO BENTO DO NORTE',     lat: -5.2081, lng: -36.2039 },
    'pedra grande':           { name: 'PEDRA GRANDE',          lat: -5.2267, lng: -35.9636 },
    'parazinho':              { name: 'PARAZINHO',             lat: -5.3944, lng: -35.6975 },
    'guamare':                { name: 'GUAMARÉ',               lat: -5.1256, lng: -36.3169 },
    'macau':                  { name: 'MACAU',                 lat: -5.1189, lng: -36.6272 },
    'alto do rodrigues':      { name: 'ALTO DO RODRIGUES',      lat: -5.4444, lng: -36.8036 },
    'pendencias':             { name: 'PENDÊNCIAS',            lat: -5.2872, lng: -36.9439 },
    'caico':                  { name: 'CAICÓ',                 lat: -6.4650, lng: -37.0958 },
    'serra do mel':           { name: 'SERRA DO MEL',          lat: -5.1667, lng: -37.0500 },
    'porto do mangue':        { name: 'PORTO DO MANGUE',       lat: -5.0866, lng: -36.8058 },
    'ipanguacu':              { name: 'IPANGUAÇU',             lat: -5.4739, lng: -36.8503 },
    'afonso bezerra':         { name: 'AFONSO BEZERRA',        lat: -5.5313, lng: -36.6797 },
  };

  // Cidades que pertencem à jurisdição da Unidade Touros (usado pro alerta
  // de "erro de projeto" — serviço nessas cidades deveria ser projeto
  // OP-INST-VT-TOUROS; se vier com outro projeto, é sinal de erro).
  const TOUROS_UNIT_CITIES = [
    'touros', 'sao miguel do gostoso', 'joao camara', 'macau', 'rio do fogo',
    'guamare', 'pendencias', 'sao bento do norte', 'parazinho', 'caicara do norte',
    'pedra grande', 'alto do rodrigues', 'serra do mel', 'porto do mangue',
    'ipanguacu', 'afonso bezerra',
  ];
  function isTourosUnitCity(cidade){
    return TOUROS_UNIT_CITIES.includes(normalize(cidade));
  }

  const TOUROS_PROJECT_CODE = 'OP-INST-VT-TOUROS';
  // Mapeamento conhecido de sufixo do código de projeto -> nome da unidade.
  // Sufixos não listados aqui viram "Unidade <Sufixo>" automaticamente.
  const KNOWN_PROJECT_UNITS = {
    'NATAL': 'Unidade Natal',
    'RN': 'Unidade Parelhas',
    'CAICO': 'Unidade Caicó',
    'TOUROS': 'Unidade Touros',
  };
  // Identifica a unidade de um código de projeto (ex: "OP-INST-VT-NATAL").
  // Retorna { suffix, unitName } ou null se não seguir o padrão OP-INST-VT-*.
  function projectUnit(projeto){
    const m = (projeto || '').toString().trim().match(/^OP-INST-VT-(.+)$/i);
    if (!m) return null;
    const suffix = m[1].toUpperCase();
    const unitName = KNOWN_PROJECT_UNITS[suffix] ||
      ('Unidade ' + suffix.charAt(0) + suffix.slice(1).toLowerCase());
    return { suffix, unitName };
  }
  // Verifica se o registro tem erro de projeto: cidade é da Unidade Touros
  // mas o projeto não é OP-INST-VT-TOUROS.
  function checkProjectError(record){
    if (!isTourosUnitCity(record.cidade)) return null;
    const projetoNorm = (record.projeto || '').toString().trim().toUpperCase();
    if (projetoNorm === TOUROS_PROJECT_CODE) return null;
    const unit = projectUnit(record.projeto);
    return {
      esperado: TOUROS_PROJECT_CODE,
      encontrado: record.projeto || '(vazio)',
      unidadeDetectada: unit ? unit.unitName : null,
    };
  }

  // compatibilidade com código antigo que ainda referencia CITY_CENTERS
  const CITY_CENTERS = CITY_REGISTRY;

  const DEFAULT_CENTER = CITY_REGISTRY['touros'];

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
    const known = CITY_REGISTRY[normalize(cidade)];
    if (known) return known;
    const cached = loadGeocodeCache()[normalize(cidade)];
    return cached || null;
  }

  // -------- geocodificação automática pra cidades fora do cadastro fixo --------
  // Guarda num cache local (por navegador) as coordenadas de cidades que não
  // estão na nossa lista curada (CITY_REGISTRY), pra não ficarem caindo por
  // padrão em Touros. Busca uma vez via OpenStreetMap (Nominatim) e depois
  // usa sempre o valor salvo — sem precisar de internet de novo.
  const GEOCODE_CACHE_KEY = 'ops_touros_geocode_cache_v1';
  function loadGeocodeCache(){
    try{ return JSON.parse(localStorage.getItem(GEOCODE_CACHE_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function saveGeocodeCache(cache){
    localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
  }

  // Garante que uma cidade tem coordenada conhecida — se não estiver no
  // cadastro fixo nem no cache, busca no OpenStreetMap e salva. Retorna
  // { name, lat, lng } ou null se não conseguir localizar de jeito nenhum.
  async function ensureCityGeocoded(cidadeRaw){
    const n = normalize(cidadeRaw);
    if (!n) return null;
    if (CITY_REGISTRY[n]) return CITY_REGISTRY[n];
    const cache = loadGeocodeCache();
    if (cache[n]) return cache[n];

    try{
      const query = encodeURIComponent(cidadeRaw + ', Rio Grande do Norte, Brasil');
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data[0]) return null;
      const found = {
        name: (cidadeRaw || '').toString().trim().toUpperCase(),
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      cache[n] = found;
      saveGeocodeCache(cache);
      return found;
    }catch(e){
      console.error('Falha ao localizar cidade automaticamente:', cidadeRaw, e);
      return null;
    }
  }

  // Corrige a grafia/maiúsculas do nome da cidade pro nome canônico
  // conhecido (ex: "toUros", "Touros ", "TOUROS RN" → "TOUROS").
  // Se a cidade não estiver no registro, devolve o texto original (limpo).
  function canonicalCity(raw){
    const n = normalize(raw).replace(/\s*\|\s*rn$/, '').trim();
    const found = CITY_REGISTRY[n];
    if (found) return found.name;
    const cached = loadGeocodeCache()[n];
    if (cached) return cached.name;
    return (raw || '').toString().trim();
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
  // Retorna { lat, lng, approx, reason } — approx=true quando usamos o ponto
  // central da cidade. reason: 'missing' (sem coordenada própria) ou
  // 'out_of_area' (coordenada informada cai fora da área da cidade).
  function resolveCoords(record){
    const center = cityCenter(record.cidade) || DEFAULT_CENTER;
    const hasOwn = typeof record.lat === 'number' && typeof record.lng === 'number'
      && !isNaN(record.lat) && !isNaN(record.lng);

    if (!hasOwn){
      return { lat: center.lat, lng: center.lng, approx: true, reason: 'missing' };
    }
    const dist = haversineKm(center, { lat: record.lat, lng: record.lng });
    if (dist > MAX_CITY_RADIUS_KM){
      return { lat: center.lat, lng: center.lng, approx: true, reason: 'out_of_area' };

    }
    return { lat: record.lat, lng: record.lng, approx: false, reason: null };
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

  // -------- catálogo de tipos de serviço (fonte: tabela de referência do usuário) --------
  // full = nome completo como aparece na coluna "Tipo de Serviço" da planilha de demanda
  // tipo = nome curto pra exibir  |  tempo = prazo de SLA em horas (0 = sem SLA definido)
  const SERVICE_CATALOG = [
    { full: 'OPERAÇÕES - CABO BAIXO', norm: 'operacoes - cabo baixo', tipo: 'CABO BAIXO', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - SEM ACESSO', norm: 'operacoes - sem acesso', tipo: 'SEM ACESSO', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - RÁDIO SEM ACESSO', norm: 'operacoes - radio sem acesso', tipo: 'SEM ACESSO', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - RÁDIO SEM ACESSO REVISITA', norm: 'operacoes - radio sem acesso revisita', tipo: 'SEM ACESSO', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - SEM ACESSO REVISITA', norm: 'operacoes - sem acesso revisita', tipo: 'SEM ACESSO', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - PROBLEMA RECORRENTE', norm: 'operacoes - problema recorrente', tipo: 'PROBLEMA RECORRENTE', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - DIFICULDADES DE ACESSO', norm: 'operacoes - dificuldades de acesso', tipo: 'DIFICULDADE DE ACESSO', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - REVISITA DIFICULDADES DE ACESSO', norm: 'operacoes - revisita dificuldades de acesso', tipo: 'DIFICULDADE DE ACESSO', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - FIBRA ATIVAÇÃO (INSTALAÇÃO)', norm: 'operacoes - fibra ativacao (instalacao)', tipo: 'ATIVAÇÃO', tempo: 72.0, pontos: 2.0 },
    { full: 'BOT - FIBRA ATIVAÇÃO', norm: 'bot - fibra ativacao', tipo: 'ATIVAÇÃO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - REVISITA - INSTALAÇÃO FIBRA', norm: 'operacoes - revisita - instalacao fibra', tipo: 'ATIVAÇÃO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - TROCA DE ENDEREÇO', norm: 'operacoes - troca de endereco', tipo: 'TROCA DE ENDEREÇO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - REVISITA - TROCA DE ENDEREÇO', norm: 'operacoes - revisita - troca de endereco', tipo: 'TROCA DE ENDEREÇO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - AÇÕES PREVENTIVAS', norm: 'operacoes - acoes preventivas', tipo: 'AÇÕES PREVENTIVAS', tempo: 48.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - AÇÕES PREVENTIVAS RÁDIO', norm: 'operacoes - acoes preventivas radio', tipo: 'AÇÕES PREVENTIVAS', tempo: 48.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - AÇÕES PREVENTIVAS/CRÍTICO', norm: 'operacoes - acoes preventivas/critico', tipo: 'AÇÕES PREVENTIVAS', tempo: 48.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - REVISITA AÇÕES PREVENTIVAS', norm: 'operacoes - revisita acoes preventivas', tipo: 'AÇÕES PREVENTIVAS', tempo: 48.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - SERVIÇOS ADICIONAIS', norm: 'operacoes - servicos adicionais', tipo: 'SERVIÇOS ADICIONAIS', tempo: 48.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - REVISITA SERVIÇOS ADICIONAIS', norm: 'operacoes - revisita servicos adicionais', tipo: 'SERVIÇOS ADICIONAIS', tempo: 48.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - RECOLHIMENTO/TROCA DE ENDEREÇO', norm: 'operacoes - recolhimento/troca de endereco', tipo: 'RECOLHIMENTO', tempo: 48.0, pontos: 1.0 },
    { full: 'ESTOQUE - RECOLHIMENTO', norm: 'estoque - recolhimento', tipo: 'RECOLHIMENTO', tempo: 120.0, pontos: 1.0 },
    { full: 'ESTOQUE - RECOLHIMENTO DE EQUIPAMENTO COMODATO', norm: 'estoque - recolhimento de equipamento comodato', tipo: 'RECOLHIMENTO', tempo: 120.0, pontos: 1.0 },
    { full: 'ESTOQUE - RECOLHIMENTO DE EQUIPAMENTO COMODATO AGENDADO', norm: 'estoque - recolhimento de equipamento comodato agendado', tipo: 'RECOLHIMENTO', tempo: 120.0, pontos: 1.0 },
    { full: 'ESTOQUE - REVISITA DE RECOLHIMENTO EM COMODATO', norm: 'estoque - revisita de recolhimento em comodato', tipo: 'RECOLHIMENTO', tempo: 120.0, pontos: 1.0 },
    { full: 'OPERAÇÕES - RÁDIO ATIVAÇÃO (INSTALAÇÃO)', norm: 'operacoes - radio ativacao (instalacao)', tipo: 'ATIVAÇÃO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - RECOLHIMENTO RÁDIO EM COMODATO', norm: 'operacoes - recolhimento radio em comodato', tipo: 'RECOLHIMENTO', tempo: 120.0, pontos: 1.0 },
    { full: 'OPERAÇÕES - REVISITA DE ATIVAÇÃO CRÍTICA', norm: 'operacoes - revisita de ativacao critica', tipo: 'ATIVAÇÃO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - REVISITA - PROBLEMA RECORRENTE', norm: 'operacoes - revisita - problema recorrente', tipo: 'PROBLEMA RECORRENTE', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - MIGRAÇÃO DE TECNOLOGIA', norm: 'operacoes - migracao de tecnologia', tipo: 'ATIVAÇÃO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - TROCA DE ENDEREÇO/MIGRAÇÃO DE TECNOLOGIA', norm: 'operacoes - troca de endereco/migracao de tecnologia', tipo: 'TROCA DE ENDEREÇO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - REVISITA DE ATIVAÇÃO PREVENTIVA', norm: 'operacoes - revisita de ativacao preventiva', tipo: 'ATIVAÇÃO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - REVISITA DE ATIVAÇÃO AGENDADA', norm: 'operacoes - revisita de ativacao agendada', tipo: 'ATIVAÇÃO', tempo: 72.0, pontos: 2.0 },
    { full: 'OPERAÇÕES - ATIVAÇÃO FIBRA (CORPORATIVO/GOVERNO)', norm: 'operacoes - ativacao fibra (corporativo/governo)', tipo: 'ATIVAÇÃO', tempo: 72.0, pontos: 2.0 },
    { full: 'SUPERVISÃO - ANÁLISE DE INSATISFAÇÃO', norm: 'supervisao - analise de insatisfacao', tipo: 'SUPERVISÃO - ANÁLISE DE INSATISFAÇÃO', tempo: 48.0, pontos: 0.0 },
    { full: 'OPERAÇÕES - RETRABALHO', norm: 'operacoes - retrabalho', tipo: 'RETRABALHO', tempo: 48.0, pontos: 0.0 },
    { full: 'OPERAÇÕES - MASSIVA RETORNO SEM ACESSO', norm: 'operacoes - massiva retorno sem acesso', tipo: 'SEM ACESSO', tempo: 24.0, pontos: 1.33 },
    { full: 'REDES/TI - CORRETIVA FIBRA', norm: 'redes/ti - corretiva fibra', tipo: 'REDES', tempo: 0.0, pontos: 0.0 },
    { full: 'SUPERVISÃO - ANALISE DE INVIABILIDADE POR SUPERVISÃO', norm: 'supervisao - analise de inviabilidade por supervisao', tipo: 'REDES', tempo: 0.0, pontos: 0.0 },
    { full: 'REDES/TI - MANUTENÇÃO CORRETIVA FIBRA', norm: 'redes/ti - manutencao corretiva fibra', tipo: 'REDES', tempo: 0.0, pontos: 0.0 },
    { full: 'REDES/TI - AMPLIAÇÃO', norm: 'redes/ti - ampliacao', tipo: 'REDES', tempo: 0.0, pontos: 0.0 },
    { full: 'REDES/TI - MANUTENÇÃO CORRETIVA RÁDIO', norm: 'redes/ti - manutencao corretiva radio', tipo: 'REDES', tempo: 0.0, pontos: 0.0 },
    { full: 'REDES/TI - RÁDIO MANUTENÇÃO', norm: 'redes/ti - radio manutencao', tipo: 'REDES', tempo: 0.0, pontos: 0.0 },
    { full: 'OPERAÇÕES - RETENÇÃO CLIENTE CRITICO', norm: 'operacoes - retencao cliente critico', tipo: 'RETENÇÃO CLIENTE CRITICO', tempo: 24.0, pontos: 1.33 },
    { full: 'OPERAÇÕES - UPGRADE PLANO/TROCA DE EQUIPAMENTO', norm: 'operacoes - upgrade plano/troca de equipamento', tipo: 'SERVIÇOS ADICIONAIS', tempo: 48.0, pontos: 1.33 },
  ];

  const ICON_BY_TIPO = {
    'CABO BAIXO': '🔌', 'SEM ACESSO': '🚧', 'PROBLEMA RECORRENTE': '⚠️',
    'DIFICULDADE DE ACESSO': '🚧', 'ATIVAÇÃO': '📡', 'TROCA DE ENDEREÇO': '🔀',
    'AÇÕES PREVENTIVAS': '🔧', 'SERVIÇOS ADICIONAIS': '➕', 'RECOLHIMENTO': '📦',
    'REDES': '🛰️', 'RETRABALHO': '🔁', 'RETENÇÃO CLIENTE CRITICO': '🛡️',
  };

  // Busca o tipo de serviço no catálogo por nome completo (coluna "Tipo de Serviço").
  // Retorna { tipoCurto, slaHoras, catalogado, icon }.
  function lookupService(tituloCompleto){
    const n = normalize(tituloCompleto);
    const found = SERVICE_CATALOG.find(c => c.norm === n);
    if (found){
      return { tipoCurto: found.tipo, slaHoras: found.tempo, pontos: found.pontos, catalogado: true, icon: ICON_BY_TIPO[found.tipo] || '⚙️' };
    }
    return { tipoCurto: tituloCompleto, slaHoras: null, pontos: null, catalogado: false, icon: '⚙️' };
  }

  // Converte "DD/MM/AAAA HH:mm" (formato do sistema de OS) em Date.
  // Datas-placeholder como "01/01/0001 00:00" são tratadas como inválidas (null).
  function parseBRDateTime(str){
    if (!str) return null;
    const m = String(str).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]), h = Number(m[4]), mi = Number(m[5]);
    if (y <= 1) return null;
    const dt = new Date(y, mo - 1, d, h, mi);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // Horas decorridas desde uma data/hora (ISO string ou Date) até agora.
  function elapsedHoursSince(isoOrDate){
    if (!isoOrDate) return null;
    const dt = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (isNaN(dt.getTime())) return null;
    return (Date.now() - dt.getTime()) / 3600000;
  }

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
      reader.onload = async () => {
        try{
          let data = new Uint8Array(reader.result);

          // Alguns exportadores de planilha geram células de texto ("inlineStr")
          // com uma declaração de xmlns repetida dentro da tag <is>, o que faz
          // a biblioteca de leitura (SheetJS) devolver tudo como texto vazio,
          // silenciosamente. Corrige isso descompactando o .xlsx (é um zip),
          // removendo o xmlns duplicado do XML da planilha, e reempacotando
          // antes de entregar pro leitor normal.
          if (typeof JSZip !== 'undefined'){
            try{
              const zip = await JSZip.loadAsync(data);
              const worksheetNames = Object.keys(zip.files).filter(n => /^xl\/worksheets\/.*\.xml$/.test(n));
              let changed = false;
              for (const wsName of worksheetNames){
                const xml = await zip.files[wsName].async('string');
                const fixed = xml.replace(/(<is\b[^>]*)\s+xmlns="[^"]*"/g, '$1');
                if (fixed !== xml){ zip.file(wsName, fixed); changed = true; }
              }
              if (changed){
                data = await zip.generateAsync({ type: 'uint8array' });
              }
            }catch(zipErr){
              console.warn('Não consegui pré-processar o Excel (seguindo com leitura normal):', zipErr);
            }
          }

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

  // -------- escala / rodízio de fim de semana --------
  // Cada colaborador tem um dia de folga fixo na semana + um "grupo" (A ou B)
  // pro rodízio de fim de semana. Um único ponto de calibração (qual grupo
  // folga em qual sábado) define o rodízio pra sempre, alternando sozinho.
  const DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
  const RODIZIO_KEY = 'ops_touros_rodizio_fds_v1';

  function getRodizioConfig(){
    try{ return JSON.parse(localStorage.getItem(RODIZIO_KEY) || 'null'); }catch(e){ return null; }
  }
  function setRodizioConfig(cfg){
    localStorage.setItem(RODIZIO_KEY, JSON.stringify(cfg));
  }

  // Sábado da semana (domingo-sábado) que contém a data informada.
  function saturdayOfWeek(date){
    const d = new Date(date);
    d.setHours(0,0,0,0);
    const day = d.getDay();
    d.setDate(d.getDate() + (6 - day));
    return d;
  }

  // Qual grupo (A/B) folga no sábado informado, segundo a calibração salva.
  function grupoFolgaNoSabado(sabado){
    const cfg = getRodizioConfig();
    if (!cfg || !cfg.dataReferencia) return null;
    const ref = saturdayOfWeek(new Date(cfg.dataReferencia + 'T00:00:00'));
    const weeksDiff = Math.round((sabado - ref) / (7 * 86400000));
    const par = ((weeksDiff % 2) + 2) % 2 === 0;
    return par ? cfg.grupoFolgaNaReferencia : (cfg.grupoFolgaNaReferencia === 'A' ? 'B' : 'A');
  }

  // Esse colaborador folga no dia informado (folga fixa semanal ou rodízio de FDS)?
  function isFolgaNoDia(colaborador, date){
    const dow = date.getDay();
    if (colaborador.folgaFixaSemana && DIAS_SEMANA[dow] === colaborador.folgaFixaSemana) return true;
    if (dow === 0 || dow === 6){
      if (!colaborador.grupoFDS) return false;
      const grupoFolga = grupoFolgaNoSabado(saturdayOfWeek(date));
      if (grupoFolga && grupoFolga === colaborador.grupoFDS) return true;
    }
    return false;
  }

  // Status (folga/trabalha/indefinido) do colaborador no próximo fim de semana.
  function proximoFimDeSemanaStatus(colaborador, fromDate){
    const hoje = new Date(fromDate || new Date()); hoje.setHours(0,0,0,0);
    let sab = saturdayOfWeek(hoje);
    if (sab < hoje) sab = new Date(sab.getTime() + 7 * 86400000);
    const grupoFolga = grupoFolgaNoSabado(sab);
    if (!colaborador.grupoFDS || !grupoFolga) return { status: 'indefinido', sabado: sab };
    return { status: grupoFolga === colaborador.grupoFDS ? 'folga' : 'trabalha', sabado: sab };
  }

  // -------- sincronização compartilhada (Planilha Google via Apps Script) --------
  // Mesma URL usada pelo Mapa de Serviços; "collection" escolhe a aba/tipo de
  // dado (ex: 'PessoasData', 'FrotasData', 'LavagensData').
  const OPS_SYNC_BASE_URL = 'https://script.google.com/macros/s/AKfycbzkAsAB4_iEMJB-XGCiVyWyi8Ftn0c7yH5wgRv45fnuS8lfbmFw2ufV47YgkQUrzkqP/exec';

  async function syncPull(collection){
    try{
      const res = await fetch(`${OPS_SYNC_BASE_URL}?collection=${encodeURIComponent(collection)}&cachebust=${Date.now()}`);
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? data : null;
    }catch(e){
      console.error('Falha ao buscar dados compartilhados (' + collection + ')', e);
      return null;
    }
  }

  async function syncPush(collection, records){
    try{
      const res = await fetch(OPS_SYNC_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ collection, records }),
      });
      const data = await res.json();
      return !!(data && data.ok);
    }catch(e){
      console.error('Falha ao sincronizar (' + collection + ')', e);
      return false;
    }
  }

  function showToast(msg){
    const toast = document.createElement('div');
    toast.className = 'ops-toast';
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--bg-panel);border:1px solid var(--line);border-radius:8px;padding:12px 16px;color:var(--ink);font-size:13px;z-index:999;box-shadow:var(--shadow);max-width:320px';
    toast.textContent = msg;
    document.body.appendChild(toast);
    return toast;
  }

  async function syncPushWithToast(collection, records){
    const toast = showToast('☁️ Sincronizando com todos os usuários...');
    const ok = await syncPush(collection, records);
    toast.textContent = ok ? '✅ Sincronizado com todos os usuários' : '⚠️ Não consegui sincronizar agora (dados salvos só neste navegador)';
    setTimeout(() => toast.remove(), 3000);
    return ok;
  }

  return {
    STORAGE_KEY, CITY_CENTERS, CITY_REGISTRY, DEFAULT_CENTER, MAX_CITY_RADIUS_KM,
    normalize, cityCenter, canonicalCity, haversineKm, resolveCoords,
    ensureCityGeocoded, loadGeocodeCache,
    classifyType, allTypes, TYPE_OTHER,
    load, save, clearAll, uid,
    loadData, saveData, parseCSV, downloadCSV, readSpreadsheetFile,
    SERVICE_CATALOG, lookupService, parseBRDateTime, elapsedHoursSince,
    TOUROS_UNIT_CITIES, TOUROS_PROJECT_CODE, isTourosUnitCity, projectUnit, checkProjectError,
    syncPull, syncPush, syncPushWithToast, showToast,
    DIAS_SEMANA, getRodizioConfig, setRodizioConfig, saturdayOfWeek,
    grupoFolgaNoSabado, isFolgaNoDia, proximoFimDeSemanaStatus,
  };
})();

/* ---------------- login + shell (sidebar) compartilhados ----------------
   A lista de quem pode acessar o site fica numa Planilha Google — pra dar ou
   tirar acesso de alguém, basta adicionar/apagar uma linha na planilha
   (colunas: USUARIO, SENHA, LIMITE DE ACESSO). Não precisa mexer no código.
   LIMITE DE ACESSO = "TOTAL" (vê tudo) ou uma lista de módulos separados por
   vírgula (ex: "mapa-servicos, indicadores") pra ver só partes específicas.
   É uma trava informal, não uma autenticação segura de verdade — qualquer
   pessoa com o link da planilha consegue ver usuário e senha. */

const OPS_USERS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1YADg1BB_jRveKt0Tr_7bwh8Pyv9oHUdNrPNYnb8cDns/export?format=csv&gid=0';

// Lista de emergência: usada apenas se a planilha não puder ser lida
// (sem internet, link não configurado, ou a planilha ficou fora do ar).
const OPS_USERS_FALLBACK = { coordenador: { senha: 'ops2024', acesso: 'TOTAL' } };

// Módulos válidos pra usar na coluna LIMITE DE ACESSO (mesma chave do href, sem .html)
const OPS_MODULE_KEYS = ['index', 'mapa-servicos', 'gestao-pessoas', 'frotas', 'desligamentos', 'indicadores'];

function parseAcesso(raw){
  const v = (raw || '').trim();
  if (!v || OPS.normalize(v) === 'total') return 'TOTAL';
  return v.split(/[,;]/).map(s => OPS.normalize(s).replace(/\s+/g,'-')).filter(Boolean);
}

async function fetchSheetUsers(){
  if (!OPS_USERS_SHEET_CSV_URL) return null;
  try{
    const sep = OPS_USERS_SHEET_CSV_URL.includes('?') ? '&' : '?';
    const res = await fetch(OPS_USERS_SHEET_CSV_URL + sep + 'cachebust=' + Date.now());
    if (!res.ok) return null;
    const text = await res.text();
    const rows = OPS.parseCSV(text).filter(r => r.some(c => (c||'').trim() !== ''));
    if (rows.length < 2) return null;
    const map = {};
    rows.slice(1).forEach(cols => {
      const u = (cols[0] || '').trim();
      const p = (cols[1] || '').trim();
      const acesso = parseAcesso(cols[2]);
      if (u && p) map[u] = { senha: p, acesso };
    });
    return map;
  }catch(e){
    console.error('Falha ao carregar lista de acessos da planilha', e);
    return null;
  }
}

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
    const btn = document.getElementById('lg-btn');
    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    fetchSheetUsers().then(sheetUsers => {
      const users = sheetUsers || OPS_USERS_FALLBACK;
      btn.disabled = false;
      btn.textContent = originalLabel;
      const user = users[u];
      if (user && user.senha === p){
        sessionStorage.setItem('ops_user', u);
        sessionStorage.setItem('ops_access', JSON.stringify(user.acesso));
        wrap.remove();
        onSuccess();
      } else {
        document.getElementById('lg-err').style.display = 'block';
      }
    });
  }
  document.getElementById('lg-btn').addEventListener('click', attempt);
  wrap.querySelectorAll('input').forEach(inp =>
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); })
  );
  wrap.querySelector('#lg-usr').focus();
}

function getCurrentAccess(){
  try{
    const raw = sessionStorage.getItem('ops_access');
    return raw ? JSON.parse(raw) : 'TOTAL';
  }catch(e){ return 'TOTAL'; }
}
function hasAccess(moduleKey, access){
  if (access === 'TOTAL') return true;
  if (moduleKey === 'index') return true; // sempre pode voltar pro início
  return Array.isArray(access) && access.includes(moduleKey);
}

function initShell(active, pageTitle){
  document.body.classList.add('has-shell', 'authed');

  const access = getCurrentAccess();
  const activeKey = active.replace('.html', '');
  const allowed = hasAccess(activeKey, access);

  // move todo o conteúdo já presente no body (exceto <script>) para dentro do shell
  const contentNodes = Array.from(document.body.children).filter(el => el.tagName !== 'SCRIPT');
  if (!allowed){
    // esconde o conteúdo da página (usuário não tem esse módulo liberado)
    contentNodes.forEach(n => n.remove());
  }

  const visibleLinks = OPS_NAV_LINKS.filter(l => hasAccess(l.href.replace('.html',''), access));

  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sb-brand">
      <div class="tag">OPS · Coord.</div>
      <h1>Coord. Regional</h1>
      <p>Unidade Touros</p>
    </div>
    <div class="sb-section">Painéis</div>
    ${visibleLinks.map(l => `<a class="sb-item ${l.href === active ? 'active' : ''}" href="${l.href}"><span class="ico">${l.icon}</span><span>${l.label}</span></a>`).join('')}
    <div class="sb-footer">
      <div class="sb-update">Última atualização</div>
      <div class="sb-date" id="sb-date">--/--/----</div>
      <div class="sb-update" id="sb-import-label" style="margin-top:8px;display:none">Última importação</div>
      <div class="sb-date" id="sb-import-info" style="font-size:11px;display:none"></div>
      <button class="btn-refresh" id="sb-refresh">↻ Atualizar</button>
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
  if (allowed){
    contentNodes.forEach(n => shellContent.appendChild(n));
  } else {
    shellContent.innerHTML = `
      <div class="page">
        <div class="panel placeholder">
          <div class="glyph">🔒</div>
          <h2>Sem permissão para este módulo</h2>
          <p class="page-sub">Seu acesso não inclui "${pageTitle}". Fale com o coordenador se precisar dessa liberação.</p>
          <a class="btn primary" href="index.html" style="margin-top:14px;display:inline-flex">← Voltar ao início</a>
        </div>
      </div>
    `;
  }
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

  function stampUltimaAtualizacao(){
    const now = new Date();
    sidebar.querySelector('#sb-date').textContent =
      `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  }
  stampUltimaAtualizacao();
  window.OPS_STAMP_UPDATE = stampUltimaAtualizacao;

  // "Última importação" (Mapa de Serviços) — lê o mesmo registro que a
  // página do Mapa de Serviços salva ao importar uma planilha.
  function stampUltimaImportacao(){
    const labelEl = sidebar.querySelector('#sb-import-label');
    const infoEl = sidebar.querySelector('#sb-import-info');
    let meta = null;
    try{ meta = JSON.parse(localStorage.getItem('ops_touros_mapa_servicos_import_meta_v1') || 'null'); }catch(e){}
    if (!meta){ labelEl.style.display = 'none'; infoEl.style.display = 'none'; return; }
    const dt = new Date(meta.data);
    const dataFmt = `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()} · ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    labelEl.style.display = 'block';
    infoEl.style.display = 'block';
    infoEl.textContent = `${dataFmt} · ${meta.usuario}`;
  }
  stampUltimaImportacao();
  window.OPS_STAMP_IMPORT = stampUltimaImportacao;

  sidebar.querySelector('#sb-refresh').addEventListener('click', () => {
    if (typeof window.OPS_ON_REFRESH === 'function') window.OPS_ON_REFRESH();
    stampUltimaAtualizacao();
    stampUltimaImportacao();
  });

  topbar.querySelector('#user-pill').addEventListener('click', () => {
    sessionStorage.removeItem('ops_user');
    sessionStorage.removeItem('ops_access');
    location.reload();
  });
}
