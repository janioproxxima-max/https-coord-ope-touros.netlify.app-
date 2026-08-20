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
    'bento fernandes':        { name: 'BENTO FERNANDES',        lat: -5.5942, lng: -35.9083 },
    'jacana':                 { name: 'JAÇANÃ',                 lat: -6.4394, lng: -35.9917 },
    'sitio novo':             { name: 'SÍTIO NOVO',              lat: -6.1364, lng: -35.7789 },
    'santana do serido':      { name: 'SANTANA DO SERIDÓ',       lat: -6.6939, lng: -36.8825 },
    'sao paulo do potengi':   { name: 'SÃO PAULO DO POTENGI',    lat: -5.9014, lng: -35.6800 },
    'santa cruz':             { name: 'SANTA CRUZ',              lat: -6.2225, lng: -36.0225 },
    'sao rafael':             { name: 'SÃO RAFAEL',              lat: -5.8144, lng: -36.8836 },
    'ipueira':                { name: 'IPUEIRA',                 lat: -6.6797, lng: -37.1522 },
    'bom jesus':              { name: 'BOM JESUS',               lat: -5.9975, lng: -35.5847 },
    'jucurutu':               { name: 'JUCURUTU',                lat: -6.0122, lng: -37.0189 },
    'equador':                { name: 'EQUADOR',                 lat: -6.2044, lng: -36.9553 },
    'timbauba dos batistas':  { name: 'TIMBAÚBA DOS BATISTAS',   lat: -6.3025, lng: -37.2606 },
    'lajes pintadas':         { name: 'LAJES PINTADAS',          lat: -6.5544, lng: -36.1478 },
    'riachuelo':              { name: 'RIACHUELO',               lat: -5.9497, lng: -35.6981 },
    'cruzeta':                { name: 'CRUZETA',                 lat: -6.4189, lng: -36.7842 },
    'sao joao do sabugi':     { name: 'SÃO JOÃO DO SABUGI',      lat: -6.5992, lng: -37.1550 },
    'santa maria':            { name: 'SANTA MARIA',             lat: -5.9142, lng: -35.6858 },
    'barcelona':              { name: 'BARCELONA',               lat: -5.9186, lng: -35.6600 },
    'jardim de piranhas':     { name: 'JARDIM DE PIRANHAS',      lat: -6.3489, lng: -37.4306 },
    'tangara':                { name: 'TANGARÁ',                 lat: -6.0664, lng: -36.0567 },
    'santa luzia':            { name: 'SANTA LUZIA',             lat: -6.8853, lng: -36.9153 },
    'sao fernando':           { name: 'SÃO FERNANDO',            lat: -6.7942, lng: -36.9667 },
    'ouro branco':            { name: 'OURO BRANCO',             lat: -6.7397, lng: -36.7975 },
    'sao jose do serido':     { name: 'SÃO JOSÉ DO SERIDÓ',      lat: -6.1300, lng: -36.8069 },
    'coronel ezequiel':       { name: 'CORONEL EZEQUIEL',        lat: -6.1719, lng: -36.1550 },
    'pendencias':             { name: 'PENDÊNCIAS',            lat: -5.2872, lng: -36.9439 },
    'caico':                  { name: 'CAICÓ',                 lat: -6.4650, lng: -37.0958 },
    'serra do mel':           { name: 'SERRA DO MEL',          lat: -5.1667, lng: -37.0500 },
    'porto do mangue':        { name: 'PORTO DO MANGUE',       lat: -5.0866, lng: -36.8058 },
    'ipanguacu':              { name: 'IPANGUAÇU',             lat: -5.4739, lng: -36.8503 },
    'afonso bezerra':         { name: 'AFONSO BEZERRA',        lat: -5.5313, lng: -36.6797 },
    'senador georgino avelino': { name: 'SENADOR GEORGINO AVELINO', lat: -6.2306, lng: -35.1875 },
    'nisia floresta':         { name: 'NÍSIA FLORESTA',        lat: -6.0919, lng: -35.2075 },
    'ares':                   { name: 'ARÊS',                  lat: -6.1892, lng: -35.1667 },
    'goianinha':              { name: 'GOIANINHA',             lat: -6.2597, lng: -35.1836 },
    'tibau do sul':           { name: 'TIBAU DO SUL',          lat: -6.1897, lng: -35.0864 },
    'vila flor':              { name: 'VILA FLOR',             lat: -6.3170, lng: -35.0670 },
    'nova cruz':              { name: 'NOVA CRUZ',             lat: -6.4761, lng: -35.4386 },
    'logradouro':             { name: 'LOGRADOURO',            lat: -6.3500, lng: -35.1500 },
    'sao goncalo do amarante':{ name: 'SÃO GONÇALO DO AMARANTE', lat: -5.7842, lng: -35.3328 },
    'macaiba':                { name: 'MACAÍBA',               lat: -5.8578, lng: -35.3553 },
    'parnamirim':             { name: 'PARNAMIRIM',            lat: -5.9156, lng: -35.2628 },
    'ielmo marinho':          { name: 'IELMO MARINHO',         lat: -5.7719, lng: -35.6033 },
  };

  // Cidades que pertencem à jurisdição da Unidade Touros (usado pro alerta
  // de "erro de projeto" — serviço nessas cidades deveria ser projeto
  // OP-INST-VT-TOUROS; se vier com outro projeto, é sinal de erro).
  const TOUROS_UNIT_CITIES = [
    'touros', 'sao miguel do gostoso', 'joao camara', 'macau', 'rio do fogo',
    'guamare', 'pendencias', 'sao bento do norte', 'parazinho', 'caicara do norte',
    'pedra grande', 'alto do rodrigues', 'serra do mel', 'porto do mangue',
    'ipanguacu', 'afonso bezerra', 'bento fernandes',
  ];
  const NATAL_UNIT_CITIES = [
    'senador georgino avelino', 'sao jose de mipibu', 'nisia floresta', 'ares',
    'goianinha', 'canguaretama', 'tibau do sul', 'vila flor', 'nova cruz',
    'logradouro', 'sao goncalo do amarante', 'macaiba', 'taipu', 'poco branco',
    'parnamirim', 'natal', 'extremoz', 'ceara-mirim', 'maxaranguape', 'pureza',
    'ielmo marinho',
  ];
  // Registro de unidades — facilita adicionar mais unidades no futuro.
  const UNIT_CITIES = { TOUROS: TOUROS_UNIT_CITIES, NATAL: NATAL_UNIT_CITIES };
  function isTourosUnitCity(cidade){
    return TOUROS_UNIT_CITIES.includes(normalize(cidade));
  }
  // Devolve o nome da unidade (ex: 'TOUROS', 'NATAL') a que a cidade pertence,
  // ou null se não estiver em nenhuma unidade cadastrada.
  function unitForCity(cidade){
    const n = normalize(cidade);
    for (const [unidade, cidades] of Object.entries(UNIT_CITIES)){
      if (cidades.includes(n)) return unidade;
    }
    return null;
  }
  function isUnitCity(cidade, unidade){
    return unitForCity(cidade) === unidade;
  }

  // Mapeamento fixo de cidade -> supervisor responsável (mais confiável do
  // que usar o campo "Supervisor" solto da planilha, que pode vir inconsistente).
  const SUPERVISOR_BY_CITY = {
    'touros': 'JOEL TAVARES',
    'sao miguel do gostoso': 'JOEL TAVARES',
    'rio do fogo': 'JOEL TAVARES',
    'caicara do norte': 'MARCELLO ROCHA',
    'sao bento do norte': 'MARCELLO ROCHA',
    'pedra grande': 'MARCELLO ROCHA',
    'parazinho': 'MARCELLO ROCHA',
    'joao camara': 'MARCELLO ROCHA',
    'guamare': 'MARCELLO ROCHA',
    'macau': 'MARCELLO ROCHA',
    'alto do rodrigues': 'MARCELLO ROCHA',
    'pendencias': 'MARCELLO ROCHA',
    'bento fernandes': 'MARCELLO ROCHA',
  };
  function supervisorForCity(cidade){
    return SUPERVISOR_BY_CITY[normalize(cidade)] || null;
  }

  const TOUROS_PROJECT_CODE = 'OP-INST-VT-TOUROS';
  const NATAL_PROJECT_CODE = 'OP-INST-VT-NATAL';
  // Código de projeto esperado por unidade — adicionar aqui quando cadastrar novas unidades.
  const UNIT_PROJECT_CODE = { TOUROS: TOUROS_PROJECT_CODE, NATAL: NATAL_PROJECT_CODE };
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
  // Verifica se o registro tem erro de projeto: a cidade pertence a alguma
  // unidade cadastrada (Touros, Natal, ...) mas o projeto não é o código
  // esperado para aquela unidade.
  function checkProjectError(record){
    const unidade = unitForCity(record.cidade);
    if (!unidade) return null;
    const esperado = UNIT_PROJECT_CODE[unidade];
    if (!esperado) return null; // unidade cadastrada mas sem código de projeto definido ainda
    const projetoNorm = (record.projeto || '').toString().trim().toUpperCase();
    if (projetoNorm === esperado) return null;
    const unit = projectUnit(record.projeto);
    return {
      esperado,
      encontrado: record.projeto || '(vazio)',
      unidadeDetectada: unit ? unit.unitName : null,
    };
  }

  // Distritos/localidades da Unidade Touros — pontos de referência pra achar
  // coordenada quando o registro tem bairro reconhecível mas a lat/long
  // própria falhou ou está fora da área do município (fonte: KMZ enviado
  // pelo usuário, mais "Arizona" adicionado manualmente).
  const DISTRICT_REGISTRY = [
    { nome: 'CARNAUBAL', lat: -5.256728, lng: -35.553567 },
    { nome: 'Vila Israel', lat: -5.201028, lng: -35.552106 },
    { nome: 'Monte Alegre', lat: -5.134685, lng: -35.597778 },
    { nome: 'Carnaubinha', lat: -5.215286, lng: -35.43415 },
    { nome: 'Boqueirão - Touros', lat: -5.252608, lng: -35.551431 },
    { nome: 'Lagoa da Prata', lat: -5.327978, lng: -35.500091 },
    { nome: 'Vila Assis', lat: -5.238299, lng: -35.584595 },
    { nome: 'São José', lat: -5.136085, lng: -35.575961 },
    { nome: 'Golandim', lat: -5.328022, lng: -35.509531 },
    { nome: 'Vila Mayne', lat: -5.187532, lng: -35.596009 },
    { nome: 'Cajueiro', lat: -5.153004, lng: -35.51769 },
    { nome: 'Santa Luzia', lat: -5.311176, lng: -35.474232 },
    { nome: 'Cana Brava', lat: -5.309624, lng: -35.581618 },
    { nome: 'Bebida Velha', lat: -5.332074, lng: -35.532045 },
    { nome: 'Lagoa do Sal', lat: -5.150683, lng: -35.539438 },
    { nome: 'Boa Cica', lat: -5.278985, lng: -35.559801 },
    { nome: 'Tubibas', lat: -5.334957, lng: -35.825508 },
    { nome: 'Baixa do Quinquim', lat: -5.217491, lng: -35.618688 },
    { nome: 'Marco 0', lat: -5.159927, lng: -35.497158 },
    { nome: 'Lagoa de Serra Verde', lat: -5.301887, lng: -35.775122 },
    { nome: 'Canto da Ilha de Cima', lat: -5.072175, lng: -35.848829 },
    { nome: 'Juá', lat: -5.291251, lng: -35.759268 },
    { nome: 'Acauã', lat: -5.098908, lng: -35.800596 },
    { nome: 'Zabelê', lat: -5.37495, lng: -35.738618 },
    { nome: 'Colorado', lat: -5.290878, lng: -35.719083 },
    { nome: 'As Cem', lat: -5.353198, lng: -35.729743 },
    { nome: 'Santo Antônio', lat: -5.336652, lng: -35.7232853 },
    { nome: 'Arribão', lat: -5.31967, lng: -35.785134 },
    { nome: 'Baixa Funda', lat: -5.440658, lng: -35.796474 },
    { nome: 'Canudos', lat: -5.262776, lng: -35.615792 },
    { nome: 'Cajá', lat: -5.40363, lng: -35.770275 },
    { nome: 'Chico Mendes 2', lat: -5.320652, lng: -35.811252 },
    { nome: 'Chico Mendes 1', lat: -5.327302, lng: -35.780994 },
    { nome: 'Aracati', lat: -5.309378, lng: -35.663292 },
    { nome: 'Planalto', lat: -5.253104, lng: -35.645769 },
    { nome: 'Reduto', lat: -5.1117306, lng: -35.6833657 },
    { nome: 'Tábua do Rebuto', lat: -5.1365904, lng: -35.7012294 },
    { nome: 'Mundo Novo', lat: -5.2259544, lng: -35.6864373 },
    { nome: 'Angico', lat: -5.172265, lng: -35.6908356 },
    { nome: 'Antônio Conselheiro', lat: -5.1989162, lng: -35.7111826 },
    { nome: 'Morro dos Martins', lat: -5.1004942, lng: -35.760339 },
    { nome: 'Fazendinha', lat: -5.1637943, lng: -35.642422 },
    { nome: 'Zumbi', lat: -5.3330795, lng: -35.3630764 },
    { nome: 'Punaú', lat: -5.3513992, lng: -35.4228852 },
    { nome: 'Catolé', lat: -5.3831433, lng: -35.4789166 },
    { nome: 'Canto Grande', lat: -5.4062429, lng: -35.4537059 },
    { nome: 'Pititinga', lat: -5.3795259, lng: -35.3386888 },
    { nome: 'Brejinho', lat: -5.526294, lng: -35.8167116 },
    { nome: 'Queimadas', lat: -5.3637511, lng: -35.8828689 },
    { nome: 'Lajeado de Baixo', lat: -5.4645486, lng: -35.801369 },
    { nome: 'Baixa Do Macaco', lat: -5.407794, lng: -35.8233241 },
    { nome: 'Quixabeira', lat: -5.2097403, lng: -35.8328617 },
    { nome: 'Umburana', lat: -5.2403315, lng: -35.7939029 },
    { nome: 'Emburana', lat: -5.2146422, lng: -35.8020724 },
    { nome: 'Baixinha da França', lat: -5.2581726, lng: -35.8111907 },
    { nome: 'Estrada da Lagoa de Vera Cruz', lat: -5.2361466, lng: -35.8618158 },
    { nome: 'Pereiros', lat: -5.2799412, lng: -35.9855818 },
    { nome: 'Amazonas', lat: -5.2965115, lng: -36.0124351 },
    { nome: 'São Luís', lat: -5.2957955, lng: -35.9424077 },
    { nome: '3 Irmãos', lat: -5.3014695, lng: -35.9086402 },
    { nome: 'Santa Luzia', lat: -5.2198314, lng: -35.8969714 },
    { nome: 'Alivio', lat: -5.2417126, lng: -35.9064128 },
    { nome: 'Santa Vitoria', lat: -5.2231083, lng: -35.9943034 },
    { nome: 'Rua Baixa da Quixaba', lat: -5.0728214, lng: -35.9993746 },
    { nome: 'Baixa da Quixaba 2', lat: -5.1001629, lng: -36.0007827 },
    { nome: 'Alto do Oriente', lat: -5.2275923, lng: -36.0567155 },
    { nome: 'São Miguel', lat: -5.1656752, lng: -35.9374838 },
    { nome: 'São Francisco', lat: -5.1524465, lng: -35.9308339 },
    { nome: 'Juremal', lat: -5.1167777, lng: -35.9396281 },
    { nome: 'Guajiru', lat: -5.0746178, lng: -35.9457019 },
    { nome: 'Maria das Graças', lat: -5.4979424, lng: -35.793013 },
    { nome: 'Santa Luzia', lat: -5.5088634, lng: -35.8180365 },
    { nome: 'Boa Sorte', lat: -5.4693111, lng: -35.8328455 },
    { nome: 'Xoar', lat: -5.439951, lng: -35.8364202 },
    { nome: 'Lajeado de Cima', lat: -5.4672187, lng: -35.8138793 },
    { nome: 'Chico Santana', lat: -5.4509363, lng: -35.7502758 },
    { nome: 'Parazinho', lat: -5.2261572, lng: -35.8397958 },
    { nome: 'Baixa do Meio', lat: -5.253706, lng: -36.3559039 },
    { nome: 'Arizona', lat: -5.27361, lng: -35.70681 },
  ];

  // compatibilidade com código antigo que ainda referencia CITY_CENTERS
  const CITY_CENTERS = CITY_REGISTRY;

  const DEFAULT_CENTER = CITY_REGISTRY['touros'];

  // raio (km) além do qual consideramos a coordenada informada
  // "fora da cidade" e usamos o ponto central no lugar dela.
  const MAX_CITY_RADIUS_KM = 70;

  function normalize(str){
    return (str || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // remove acentos
  }

  // Alguns registros de Gestão de Pessoas foram digitados direto na
  // planilha do Google (não pelo formulário do site), e às vezes a coluna
  // acaba com um nome ligeiramente diferente do que o site espera (ex:
  // "Nome" com maiúscula, "Nome completo", espaço a mais) — isso faz
  // p.nome vir undefined mesmo com o dado preenchido na planilha. Essa
  // função corrige isso, procurando em variações comuns do nome da coluna.
  function corrigirCamposPessoa(p){
    if (!p.nome){
      const chaveNome = Object.keys(p).find(k => {
        const kn = normalize(k).replace(/[^a-z]/g, '');
        return kn === 'nome' || kn === 'nomecompleto' || kn === 'nomecolaborador'
          || kn === 'colaborador' || kn === 'funcionario' || kn === 'tecnico' || kn === 'nometecnico';
      });
      if (chaveNome && p[chaveNome]) p.nome = p[chaveNome];
    }
    // se ainda assim não tem nome, mas tem login no padrão "nome.sobrenome",
    // usa isso como último recurso — melhor um nome aproximado (marcado como
    // tal) do que ficar completamente sem aparecer em lugar nenhum
    if (!p.nome && p.usuarioLogin && /^[a-z]+\.[a-z]+$/i.test(p.usuarioLogin.trim())){
      p.nome = p.usuarioLogin.trim().split('.').map(parte => parte.charAt(0).toUpperCase() + parte.slice(1)).join(' ');
      p.nomeReconstruido = true; // sinaliza que foi um "chute" a partir do login, não o dado real
    }
    return p;
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
  // -------- limite real do município (malha do IBGE) --------
  // Carrega uma vez (assíncrono) o contorno oficial dos municípios do RN.
  // Enquanto não carrega, ou se a cidade não estiver na malha, cai no método
  // antigo (distância até um ponto de referência) como respaldo.
  let municipioPolygons = null;
  let municipioPolygonsLoading = null;
  function loadMunicipioPolygons(){
    if (municipioPolygons) return Promise.resolve(municipioPolygons);
    if (municipioPolygonsLoading) return municipioPolygonsLoading;
    municipioPolygonsLoading = fetch('rn-municipios.json')
      .then(r => r.json())
      .then(geo => {
        const map = {};
        geo.features.forEach(f => {
          const nome = normalize(f.properties.name);
          const geom = f.geometry;
          let polygons = [];
          if (geom.type === 'Polygon') polygons = [geom.coordinates];
          else if (geom.type === 'MultiPolygon') polygons = geom.coordinates;
          map[nome] = polygons;
        });
        municipioPolygons = map;
        return map;
      })
      .catch(err => { console.warn('Não consegui carregar o limite municipal do IBGE (usando método de raio como respaldo):', err); return null; });
    return municipioPolygonsLoading;
  }
  function pointInRing(lng, lat, ring){
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++){
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  function pointInPolygon(lng, lat, polygon){
    if (!pointInRing(lng, lat, polygon[0])) return false;
    for (let k = 1; k < polygon.length; k++){
      if (pointInRing(lng, lat, polygon[k])) return false; // dentro de um "buraco"
    }
    return true;
  }
  // Devolve true/false se souber, ou null se ainda não carregou a malha ou
  // não achou essa cidade nela.
  function isPointInMunicipio(lat, lng, cidadeNome){
    if (!municipioPolygons) return null;
    const polygons = municipioPolygons[normalize(cidadeNome)];
    if (!polygons || !polygons.length) return null;
    return polygons.some(poly => pointInPolygon(lng, lat, poly));
  }

  // Resolve a coordenada de exibição de um registro: usa a própria lat/long
  // se ela realmente cair dentro do limite do município informado (checagem
  // real, via malha do IBGE, quando disponível); caso contrário, cai no
  // central da cidade. reason: 'missing' (sem coordenada própria) ou
  // 'out_of_area' (coordenada informada cai fora da área da cidade).
  // A coluna "Latitude/Longitude" da planilha bruta vem às vezes com ponto
  // decimal ("-5.53,-35.82") e às vezes em formato brasileiro, com vírgula
  // decimal ("-5,53409218322486,-35,8096517063677") — nesse segundo caso
  // dá 4 pedaços ao separar por vírgula, não 2. Essa função entende os dois.
  function parseLatLngPair(text){
    if (!text) return null;
    const partes = text.trim().split(',').map(s => s.trim()).filter(s => s !== '');
    if (partes.length === 2){
      const lat = parseFloat(partes[0]);
      const lng = parseFloat(partes[1]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    if (partes.length === 4){
      // formato brasileiro: vírgula é separador decimal — junta de volta com ponto
      const lat = parseFloat(partes[0] + '.' + partes[1]);
      const lng = parseFloat(partes[2] + '.' + partes[3]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    return null;
  }

  // distância de edição simples (Levenshtein) — usada só pra achar bairro
  // "parecido" quando não bate exato (ex: erro de digitação na planilha)
  function levenshtein(a, b){
    const m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++){
      for (let j = 1; j <= n; j++){
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  const DISTRICT_REGISTRY_NORM = DISTRICT_REGISTRY.map(d => ({ ...d, norm: normalize(d.nome) }));

  // acha um distrito conhecido pelo nome do bairro do registro — igual,
  // contido, ou parecido (poucos caracteres de diferença, cobre erro de
  // digitação tipo "Arizona" vs "Arisona").
  function findDistrictByBairro(bairroTexto){
    const alvo = normalize(bairroTexto);
    if (!alvo) return null;
    let exato = DISTRICT_REGISTRY_NORM.find(d => d.norm === alvo);
    if (exato) return exato;
    let contido = DISTRICT_REGISTRY_NORM.find(d => alvo.includes(d.norm) || d.norm.includes(alvo));
    if (contido) return contido;
    let melhor = null, melhorDist = Infinity;
    DISTRICT_REGISTRY_NORM.forEach(d => {
      const limite = Math.max(2, Math.round(Math.max(d.norm.length, alvo.length) * 0.2));
      const dist = levenshtein(alvo, d.norm);
      if (dist <= limite && dist < melhorDist){ melhor = d; melhorDist = dist; }
    });
    return melhor;
  }

  function resolveCoords(record){
    const center = cityCenter(record.cidade) || DEFAULT_CENTER;
    const hasOwn = typeof record.lat === 'number' && typeof record.lng === 'number'
      && !isNaN(record.lat) && !isNaN(record.lng);

    if (!hasOwn){
      const distrito = findDistrictByBairro(record.bairro);
      if (distrito) return { lat: distrito.lat, lng: distrito.lng, approx: true, reason: 'bairro' };
      return { lat: center.lat, lng: center.lng, approx: true, reason: 'missing' };
    }

    const dentro = isPointInMunicipio(record.lat, record.lng, record.cidade);
    if (dentro === true){
      return { lat: record.lat, lng: record.lng, approx: false, reason: null };
    }
    if (dentro === false){
      const distrito = findDistrictByBairro(record.bairro);
      if (distrito) return { lat: distrito.lat, lng: distrito.lng, approx: true, reason: 'bairro' };
      return { lat: center.lat, lng: center.lng, approx: true, reason: 'out_of_area' };
    }
    // dentro === null: malha ainda não carregou, ou cidade não está nela —
    // respaldo pelo método antigo (raio de distância)
    const dist = haversineKm(center, { lat: record.lat, lng: record.lng });
    if (dist > MAX_CITY_RADIUS_KM){
      const distrito = findDistrictByBairro(record.bairro);
      if (distrito) return { lat: distrito.lat, lng: distrito.lng, approx: true, reason: 'bairro' };
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


  const PRODUTIVIDADE_CATALOG = [
    { desc: 'OPERAÇÕES - COM VIABILIDADE', norm: 'operacoes - com viabilidade', produtivo: true, pontos: 2.0 },
    { desc: 'OPERAÇÕES - CABO ATENUADO', norm: 'operacoes - cabo atenuado', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - CABO BAIXO OU NO CHÃO', norm: 'operacoes - cabo baixo ou no chao', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - CABO ROMPIDO', norm: 'operacoes - cabo rompido', produtivo: true, pontos: 1.33 },
    { desc: 'OPERACOES - CORRECAO DE SINAL DB ENTRE RESIDENCIA E CTO', norm: 'operacoes - correcao de sinal db entre residencia e cto', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - DIFICULDADES DE ACESSO', norm: 'operacoes - dificuldades de acesso', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - DNS', norm: 'operacoes - dns', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - EQUIPAMENTO DESATUALIZADO', norm: 'operacoes - equipamento desatualizado', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - EQUIPAMENTO DESLIGADO', norm: 'operacoes - equipamento desligado', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - EQUIPAMENTO JÁ COMPATÍVEL', norm: 'operacoes - equipamento ja compativel', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - EQUIPAMENTO RESETADO', norm: 'operacoes - equipamento resetado', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - EQUIPAMENTO TRAVADO', norm: 'operacoes - equipamento travado', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - EXTENSÃO DE REDE', norm: 'operacoes - extensao de rede', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - FIXAR EQUIPAMENTO', norm: 'operacoes - fixar equipamento', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - FONTE QUEIMADA', norm: 'operacoes - fonte queimada', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - INTERFERÊNCIA', norm: 'operacoes - interferencia', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - LATÊNCIA ALTA', norm: 'operacoes - latencia alta', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - MUDANÇA DE CÔMODO', norm: 'operacoes - mudanca de comodo', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - ONU DESPROVISIONADA', norm: 'operacoes - onu desprovisionada', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - ORGANIZAÇÃO DE CTO', norm: 'operacoes - organizacao de cto', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - PASSAGEM DE CABO', norm: 'operacoes - passagem de cabo', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - PROBLEMA COM PÁGINAS/APP ESPECÍFICOS', norm: 'operacoes - problema com paginas/app especificos', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - PROBLEMA NA REDE INTERNA', norm: 'operacoes - problema na rede interna', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - PROBLEMA NO CONECTOR', norm: 'operacoes - problema no conector', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - PROBLEMA NO EQUIPAMENTO', norm: 'operacoes - problema no equipamento', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - ROTEADOR MAL LOCALIZADO', norm: 'operacoes - roteador mal localizado', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - SERVIÇO EXTRA', norm: 'operacoes - servico extra', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - SINAL ALTO', norm: 'operacoes - sinal alto', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - TROCA DE EQUIPAMENTO', norm: 'operacoes - troca de equipamento', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - TROCA DE ONU BRIDGE', norm: 'operacoes - troca de onu bridge', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - TROCA DE ONU WIFI', norm: 'operacoes - troca de onu wifi', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - TROCA DE RÁDIO', norm: 'operacoes - troca de radio', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - TROCA DE ROTEADOR', norm: 'operacoes - troca de roteador', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - TROCA DE TORRE', norm: 'operacoes - troca de torre', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES- ALTERAR SENHA DO WI-FI', norm: 'operacoes- alterar senha do wi-fi', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - ANÁLISE TÉCNICA', norm: 'operacoes - analise tecnica', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - DVR', norm: 'operacoes - dvr', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - IPTV', norm: 'operacoes - iptv', produtivo: true, pontos: 1.33 },
    { desc: 'OPERAÇÕES - REATIVAÇÃO DE CONTRATO', norm: 'operacoes - reativacao de contrato', produtivo: true, pontos: 1.33 },
    { desc: 'ESTOQUE - EQUIPAMENTO RÁDIO', norm: 'estoque - equipamento radio', produtivo: true, pontos: 1.0 },
    { desc: 'ESTOQUE - EQUIPAMENTO RECOLHIDO', norm: 'estoque - equipamento recolhido', produtivo: true, pontos: 1.0 },
    { desc: 'OPERAÇÕES - EQUIPAMENTO RECOLHIDO', norm: 'operacoes - equipamento recolhido', produtivo: true, pontos: 1.0 },
    { desc: 'OPERAÇÕES - NÃO COERENTE COM O RELATO', norm: 'operacoes - nao coerente com o relato', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - ORIGEM INFRA', norm: 'operacoes - origem infra', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - ORIGEM REDES', norm: 'operacoes - origem redes', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - PONTO EM MANUTENÇÃO', norm: 'operacoes - ponto em manutencao', produtivo: false, pontos: 0.0 },
    { desc: 'ALOCAR PRODUTO E/OU PATRIMONIO', norm: 'alocar produto e/ou patrimonio', produtivo: false, pontos: 0.0 },
    { desc: 'ESTOQUE - CLIENTE AUSENTE', norm: 'estoque - cliente ausente', produtivo: false, pontos: 0.0 },
    { desc: 'ESTOQUE - CLIENTE JÁ DEVOLVEU', norm: 'estoque - cliente ja devolveu', produtivo: false, pontos: 0.0 },
    { desc: 'ESTOQUE - CLIENTE MUDOU DE ENDEREÇO', norm: 'estoque - cliente mudou de endereco', produtivo: false, pontos: 0.0 },
    { desc: 'ESTOQUE - CLIENTE NEGOU ENTREGA', norm: 'estoque - cliente negou entrega', produtivo: false, pontos: 0.0 },
    { desc: 'ESTOQUE - CLIENTE QUER DEVOLVER EM LOJA', norm: 'estoque - cliente quer devolver em loja', produtivo: false, pontos: 0.0 },
    { desc: 'ESTOQUE - CLIENTE REATIVOU', norm: 'estoque - cliente reativou', produtivo: false, pontos: 0.0 },
    { desc: 'ESTOQUE - ENDEREÇO NÃO LOCALIZADO', norm: 'estoque - endereco nao localizado', produtivo: false, pontos: 0.0 },
    { desc: 'ESTOQUE - EQUIPAMENTO NÃO LOCALIZADO', norm: 'estoque - equipamento nao localizado', produtivo: false, pontos: 0.0 },
    { desc: 'ESTOQUE - EQUIPAMENTO NÃO RECOLHIDO', norm: 'estoque - equipamento nao recolhido', produtivo: false, pontos: 0.0 },
    { desc: 'INVIABILIDADE - CLIENTE NÃO ACEITOU PAGAR EXCEDENTE', norm: 'inviabilidade - cliente nao aceitou pagar excedente', produtivo: false, pontos: 0.0 },
    { desc: 'INVIABILIDADE - CTO COM POTÊNCIA ALTA', norm: 'inviabilidade - cto com potencia alta', produtivo: false, pontos: 0.0 },
    { desc: 'INVIABILIDADE - CTO LOTADA', norm: 'inviabilidade - cto lotada', produtivo: false, pontos: 0.0 },
    { desc: 'INVIABILIDADE - METRAGEM MÁXIMA ATINGIDA', norm: 'inviabilidade - metragem maxima atingida', produtivo: false, pontos: 0.0 },
    { desc: 'INVIABILIDADE - REGIÃO SEM COBERTURA (SEM REDES)', norm: 'inviabilidade - regiao sem cobertura (sem redes)', produtivo: false, pontos: 0.0 },
    { desc: 'INVIABILIDADE - SEM REDE DE POSTES', norm: 'inviabilidade - sem rede de postes', produtivo: false, pontos: 0.0 },
    { desc: 'INVIABILIDADE - TUBULAÇÃO OBSTRUÍDA', norm: 'inviabilidade - tubulacao obstruida', produtivo: false, pontos: 0.0 },
    { desc: 'INVIABILIDADE - VISADA OBSTRUÍDA', norm: 'inviabilidade - visada obstruida', produtivo: false, pontos: 0.0 },
    { desc: 'INVIABLIDADE - INFRAESTRUTURA DANIFICADA', norm: 'inviablidade - infraestrutura danificada', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - CLIENTE AUSENTE', norm: 'operacoes - cliente ausente', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - CLIENTE DESISTIU', norm: 'operacoes - cliente desistiu', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - CLIENTE EM MASSIVA ABERTA', norm: 'operacoes - cliente em massiva aberta', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - CLIENTE EM MASSIVA FECHADA', norm: 'operacoes - cliente em massiva fechada', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - CLIENTE NÃO INFORMOU', norm: 'operacoes - cliente nao informou', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - CONCORRÊNCIA ATIVOU', norm: 'operacoes - concorrencia ativou', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - ENDEREÇO INCOMPLETO', norm: 'operacoes - endereco incompleto', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - EQUIPAMENTO NÃO RECOLHIDO', norm: 'operacoes - equipamento nao recolhido', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - NÃO LOCALIZADO', norm: 'operacoes - nao localizado', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - ORIGEM FINANCEIRO', norm: 'operacoes - origem financeiro', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - PRAZO ALTO', norm: 'operacoes - prazo alto', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - REAGENDAMENTO A PEDIDO DO CLIENTE', norm: 'operacoes - reagendamento a pedido do cliente', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - REMARCAÇÃO DE TURNO SOLICITADO PELO CLIENTE', norm: 'operacoes - remarcacao de turno solicitado pelo cliente', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - SOLICITAÇÃO DUPLICADA', norm: 'operacoes - solicitacao duplicada', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - VISITA IMPRODUTIVA', norm: 'operacoes - visita improdutiva', produtivo: false, pontos: 0.0 },
    { desc: 'OPERAÇÕES - VISITA TECNICA SEM AJUSTE', norm: 'operacoes - visita tecnica sem ajuste', produtivo: false, pontos: 0.0 },
  ];

  // Consulta o catálogo de produtividade pela Descrição do Encerramento.
  // Aplica também a regra do plano 2R/3R/4R (ativação ou troca de endereço
  // com esses planos vale 2,40 pontos, sobrescrevendo o valor da tabela).
  function lookupProdutividade(descricaoEncerramento, tipoCurto, planoProduto){
    const n = normalize(descricaoEncerramento).replace(/\.+$/, ''); // ignora ponto final
    const found = PRODUTIVIDADE_CATALOG.find(c => c.norm === n);
    let pontos = found ? found.pontos : null;
    const produtivo = found ? found.produtivo : null;
    const planoNorm = normalize(planoProduto);
    const ehAtivacaoOuMudanca = tipoCurto === 'ATIVAÇÃO' || tipoCurto === 'TROCA DE ENDEREÇO';
    // o bônus só vale pra fechamento de ativação/mudança de verdade — "COM
    // VIABILIDADE" é só uma checagem de viabilidade, não conclui o serviço,
    // então continua com a pontuação normal do catálogo (2.00)
    const ehComViabilidade = n === 'operacoes - com viabilidade';
    if (ehAtivacaoOuMudanca && !ehComViabilidade && /(^| )(2r|3r|4r)( |$)/.test(planoNorm) && produtivo){
      pontos = 2.40;
    }
    return { encontrado: !!found, produtivo, pontos };
  }

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
  // localStorage tem uma cota pequena (~5-10MB) - volumes grandes de
  // protocolos (import de semanas/mês inteiro) podem estourar isso. O
  // caminho normal continua sendo localStorage (rápido, síncrono); quando
  // não cabe, cai numa reserva em IndexedDB (bem maior) em vez de travar a
  // importação ou perder dado.
  const IDB_DB_NAME = 'ops_touros_fallback';
  const IDB_STORE = 'kv';
  function idbAbrir(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbSet(key, val){
    const db = await idbAbrir();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function idbGet(key){
    const db = await idbAbrir();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result === undefined ? null : req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function idbDelete(key){
    const db = await idbAbrir();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  function ehErroDeCota(e){
    return e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
  }

  function load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(e){ console.error('Falha ao ler dados salvos', e); return null; }
  }
  async function loadFallbackFromIdb(){
    try{ return await idbGet(STORAGE_KEY); }catch(e){ return null; }
  }
  function save(records){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      idbDelete(STORAGE_KEY).catch(() => {});
    }catch(e){
      if (!ehErroDeCota(e)) throw e;
      idbSet(STORAGE_KEY, records).catch(err => console.error('Falha ao salvar na reserva IndexedDB', err));
    }
  }
  function clearAll(){
    localStorage.removeItem(STORAGE_KEY);
    idbDelete(STORAGE_KEY).catch(() => {});
  }

  // -------- storage genérico (usado por outros módulos: pessoas, frotas, desligamentos) --------
  function loadData(key){
    try{
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(e){ console.error('Falha ao ler dados salvos', e); return null; }
  }
  async function loadDataFallbackFromIdb(key){
    try{ return await idbGet(key); }catch(e){ return null; }
  }
  function saveData(key, val){
    try{
      localStorage.setItem(key, JSON.stringify(val));
      idbDelete(key).catch(() => {});
    }catch(e){
      if (!ehErroDeCota(e)) throw e;
      idbSet(key, val).catch(err => console.error('Falha ao salvar na reserva IndexedDB', err));
    }
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

  // Exporta em Excel de verdade (.xlsx), usando a biblioteca SheetJS (XLSX)
  // já carregada nas páginas. filename pode vir com ou sem ".xlsx".
  function downloadXLSX(filename, headers, dataRows, sheetName){
    if (typeof XLSX === 'undefined'){
      // sem a biblioteca disponível por algum motivo — cai pra CSV, pra não travar
      downloadCSV(filename.replace(/\.xlsx$/i, '.csv'), headers, dataRows);
      return;
    }
    const aoa = [headers, ...dataRows.map(row => row.map(v => v ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (sheetName || 'Dados').slice(0, 31));
    const finalName = filename.toLowerCase().endsWith('.xlsx') ? filename : filename.replace(/\.csv$/i, '') + '.xlsx';
    XLSX.writeFile(wb, finalName);
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

  // Colaborador está indisponível numa data (ausência pontual registrada,
  // ou dentro do período de um atestado)?
  function isIndisponivelNoDia(colaboradorId, date, ausencias, atestados){
    const dateStr = date.toISOString().slice(0,10);
    if (ausencias && ausencias.some(a => a.colaboradorId === colaboradorId && a.data === dateStr)) return true;
    if (atestados && atestados.some(a => a.colaboradorId === colaboradorId && a.dataInicio <= dateStr && dateStr <= a.dataFim)) return true;
    return false;
  }

  function uid(){
    return 'r' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  // -------- datas "à prova de Google Sheets" --------
  // O Google Sheets às vezes converte um texto tipo "2026-07-16" pra um
  // formato de data por conta própria quando os dados vão e voltam da
  // sincronização. Essas funções aceitam qualquer formato razoável (data
  // simples "AAAA-MM-DD", data/hora ISO completa, ou já um objeto Date) e
  // sempre devolvem algo exibível, em vez de "Invalid Date".
  function toDateSafe(v){
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    const s = String(v).trim();
    if (!s) return null;
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) d = new Date(s + 'T00:00:00');
    else d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  function formatDateBR(v){
    const d = toDateSafe(v);
    return d ? d.toLocaleDateString('pt-BR') : '—';
  }
  function formatDateTimeBR(v){
    const d = toDateSafe(v);
    if (!d) return '—';
    return d.toLocaleDateString('pt-BR') + ' · ' + d.toLocaleTimeString('pt-BR').slice(0,5);
  }
  // Devolve "AAAA-MM-DD" (pra usar em <input type="date">), a partir de
  // qualquer formato de data recebido.
  function toDateInputValue(v){
    const d = toDateSafe(v);
    if (!d) return '';
    const pad = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
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
    // sincroniza pra todo mundo ver a mesma calibração (não bloqueia a UI)
    syncPush('RodizioConfigData', [cfg]).catch(() => {});
  }
  async function pullRodizioConfig(){
    const shared = await syncPull('RodizioConfigData');
    if (shared && shared[0]){
      localStorage.setItem(RODIZIO_KEY, JSON.stringify(shared[0]));
      return shared[0];
    }
    return getRodizioConfig();
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

  // -------- MapaServicosData migrou pro Supabase --------
  // O Mapa de Serviços é de longe a coleção mais pesada (milhares de
  // protocolos, atualizada a cada poucos minutos) e vinha derrubando o
  // desempenho do Apps Script pra TODAS as outras coleções, que dividem a
  // mesma cota diária de execução (conta Google pessoal, não Workspace).
  // Só essa coleção foi movida pro banco de verdade - o resto (Pessoas,
  // Frotas, SLA, Indicadores) continua no Google Sheets, sem mudança.
  const MAPA_SUPABASE_URL = 'https://hkopoafzceczmmbjvogi.supabase.co';
  const MAPA_SUPABASE_KEY = 'sb_publishable_pxL9kT16nTgq_UBcF3QQKg_YOqMiVxm';
  const MAPA_SUPABASE_TABLE = 'mapa_servicos_registros';
  const MAPA_SUPABASE_HEADERS = {
    apikey: MAPA_SUPABASE_KEY,
    Authorization: `Bearer ${MAPA_SUPABASE_KEY}`,
  };

  async function mapaSupabasePull(){
    try{
      const TAMANHO_PAGINA = 1000;
      let todos = [];
      let inicio = 0;
      while (true){
        const res = await fetch(`${MAPA_SUPABASE_URL}/rest/v1/${MAPA_SUPABASE_TABLE}?select=dados`, {
          headers: Object.assign({ 'Range-Unit': 'items', Range: `${inicio}-${inicio + TAMANHO_PAGINA - 1}` }, MAPA_SUPABASE_HEADERS),
        });
        if (!res.ok) return null;
        const pagina = await res.json();
        todos = todos.concat((pagina || []).map(r => r.dados));
        if (!pagina || pagina.length < TAMANHO_PAGINA) break;
        inicio += TAMANHO_PAGINA;
      }
      return todos;
    }catch(e){
      console.error('Falha ao buscar dados do Mapa (Supabase)', e);
      return null;
    }
  }

  // "records" é sempre a lista completa e correta do estado atual (mesmo
  // contrato que o Apps Script tinha) - insere/atualiza tudo primeiro, só
  // depois apaga o que sobrou de desatualizado. Nessa ordem, se a
  // sincronização falhar no meio do caminho, o Mapa nunca fica vazio - na
  // pior das hipóteses fica com uma mistura de dado novo e velho até a
  // próxima sincronização dar certo.
  async function mapaSupabasePush(records){
    try{
      const inicioDaSincronizacao = new Date().toISOString();
      const TAMANHO_LOTE = 500;
      for (let i = 0; i < records.length; i += TAMANHO_LOTE){
        const lote = records.slice(i, i + TAMANHO_LOTE).map(r => ({
          protocolo: r.protocolo, dados: r, atualizado_em: inicioDaSincronizacao,
        }));
        const res = await fetch(`${MAPA_SUPABASE_URL}/rest/v1/${MAPA_SUPABASE_TABLE}?on_conflict=protocolo`, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, MAPA_SUPABASE_HEADERS),
          body: JSON.stringify(lote),
        });
        if (!res.ok) return false;
      }
      const del = await fetch(`${MAPA_SUPABASE_URL}/rest/v1/${MAPA_SUPABASE_TABLE}?atualizado_em=lt.${encodeURIComponent(inicioDaSincronizacao)}`, {
        method: 'DELETE',
        headers: MAPA_SUPABASE_HEADERS,
      });
      return del.ok;
    }catch(e){
      console.error('Falha ao sincronizar Mapa (Supabase)', e);
      return false;
    }
  }

  async function syncPull(collection){
    if (collection === 'MapaServicosData') return mapaSupabasePull();
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
    if (collection === 'MapaServicosData') return mapaSupabasePush(records);
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

  // Busca uma aba de OUTRA planilha do Google (fora da planilha "banco de
  // dados" do site), passando pelo mesmo Apps Script — evita bloqueio de
  // CORS do navegador, já que o Apps Script lê a planilha do lado do
  // servidor. Devolve as linhas cruas (lista de listas), ou lança erro com
  // uma mensagem que já pode ser mostrada pro usuário.
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

  // -------- importação da planilha do Mapa de Serviços --------
  // Fica aqui (compartilhado) pra funcionar de qualquer aba do site, não só
  // de dentro do Mapa de Serviços.
  function mapHeaderMapaServicos(h){
    const n = normalize(h);
    if (n.includes('ordem servico') || n === 'protocolo') return 'protocolo';
    if (n === 'tipo de servico') return 'tituloCompleto';
    if (n.includes('titulo') && !n.includes('subtipo')) return 'tituloCompleto';
    if (n === 'area') return 'areaCidade';
    if (n === 'localidade') return 'localidadeBairro';
    if (n === 'cidade') return 'cidadeLiteral';
    if (n === 'bairro') return 'bairroLiteral';
    if (n === 'endereco') return 'endereco';
    if (n === 'numero') return 'numero';
    if (n === 'complemento') return 'complemento';
    if (n.includes('telefone principal')) return 'telefone';
    if (n === 'supervisor') return 'supervisor';
    if (n === 'status') return 'statusAtendimento';
    if (n.includes('data') && n.includes('agendamento')) return 'dataAgendamento';
    if (n.includes('descricao') && n.includes('encerramento')) return 'descricaoEncerramento';
    if (n.includes('fim do atendimento') || (n.includes('data') && n.includes('fim'))) return 'dataFimAtendimento';
    if (n.includes('plano') || n.includes('produto')) return 'planoProduto';
    if (n.includes('tecnico auxiliar')) return 'tecnicoAuxiliar';
    if (n === 'responsavel') return 'responsavel';
    if (n === 'cliente') return 'nomeCliente';
    if (n.includes('projeto')) return 'projeto';
    if (n.includes('observacao') && !n.includes('tecnico')) return 'observacao';
    if (n.includes('observacao') && n.includes('tecnico')) return 'observacaoTecnico';
    if (n.includes('latitude') && n.includes('longitude')) return 'latlng';
    if (n.includes('criado em')) return 'criadoEmLegacy';
    if (n.includes('data') && n.includes('criacao')) return 'dataCriacao';
    if (n.includes('abertura original')) return 'dataAberturaOriginal';
    if (n.includes('sla horas')) return 'slaLegacy';
    if (n.includes('tempo')) return 'tempoLegacy';
    if (n.includes('prazo')) return 'prazoRawLegacy';
    if (n === 'lat') return 'lat';
    if (n === 'lng' || n === 'lon') return 'lng';
    return null;
  }

  const MAPA_SERVICOS_IMPORT_META_KEY = 'ops_touros_mapa_servicos_import_meta_v1';
  const MAPA_SERVICOS_IMPORT_META_SYNC = 'MapaServicosImportMetaData';

  // Importa um arquivo (Excel/CSV) do Mapa de Serviços — pode ser chamado de
  // qualquer página do site. Busca os dados atuais na nuvem, mescla ou
  // substitui conforme escolha do usuário, e sincroniza pra todo mundo.
  // Devolve a lista final de registros, ou null se cancelado/sem dados.
  async function importMapaServicosFile(file){
    return new Promise((resolve) => {
      const tLendo = showToast('📖 Lendo a planilha...');
      readSpreadsheetFile(file, async (rows) => {
       try{
        tLendo.remove();
        console.log('[Importação] Linhas lidas da planilha:', rows ? rows.length : 0);
        if (!rows || rows.length < 2){ alert('Planilha vazia ou sem dados.'); resolve(null); return; }
        const tProcessando = showToast(`⚙️ Processando ${rows.length - 1} linha(s)...`);

        function scoreRow(row){
          const mapped = (row || []).map(mapHeaderMapaServicos);
          return { score: mapped.filter(Boolean).length, temProtocolo: mapped.includes('protocolo') };
        }
        let headerRowIdx;
        const row1Score = scoreRow(rows[1]);
        const row0Score = scoreRow(rows[0]);
        if (row1Score.temProtocolo) headerRowIdx = 1;
        else if (row0Score.temProtocolo) headerRowIdx = 0;
        else {
          headerRowIdx = 1;
          let bestScore = -1;
          for (let i = 0; i < Math.min(rows.length, 10); i++){
            const s = scoreRow(rows[i]);
            if (s.temProtocolo && s.score > bestScore){ bestScore = s.score; headerRowIdx = i; }
          }
        }
        const headers = rows[headerRowIdx].map(mapHeaderMapaServicos);
        const missingTypes = new Set();

        const imported = rows.slice(headerRowIdx + 1).map(cols => {
          const row = {};
          headers.forEach((key, idx) => { if (key) row[key] = (cols[idx] ?? '').toString().trim(); });
          if (!row.protocolo) return null;

          const tituloCompleto = row.tituloCompleto || '';
          const svc = lookupService(tituloCompleto);
          if (tituloCompleto && !svc.catalogado) missingTypes.add(tituloCompleto);

          const cidade = canonicalCity(row.areaCidade || row.cidadeLiteral || '');
          const bairro = row.localidadeBairro || row.bairroLiteral || '';

          let lat, lng;
          if (row.latlng){
            const parsed = parseLatLngPair(row.latlng);
            if (parsed){ lat = parsed.lat; lng = parsed.lng; }
          }
          if (lat === undefined && row.lat){ const v = parseFloat(row.lat.replace(',', '.')); if (!isNaN(v)) lat = v; }
          if (lng === undefined && row.lng){ const v = parseFloat(row.lng.replace(',', '.')); if (!isNaN(v)) lng = v; }

          const suffixMatch = row.protocolo.match(/\/(\d+)\s*$/);
          const suffix = suffixMatch ? parseInt(suffixMatch[1], 10) : 1;
          let baseDt = null;
          if (row.criadoEmLegacy){
            const d = new Date(row.criadoEmLegacy);
            if (!isNaN(d.getTime())) baseDt = d;
          }
          if (!baseDt){
            const dtCriacao = parseBRDateTime(row.dataCriacao);
            const dtOriginal = parseBRDateTime(row.dataAberturaOriginal);
            baseDt = (suffix >= 2 && dtOriginal) ? dtOriginal : (dtCriacao || dtOriginal || null);
          }

          let slaHoras = svc.catalogado ? svc.slaHoras : null;
          if (row.slaLegacy){ const v = Number(row.slaLegacy.replace(',', '.')); if (!isNaN(v)) slaHoras = v; }

          let tempoManual = null, prazoManual = null;
          if (!baseDt && row.tempoLegacy){ const v = Number(row.tempoLegacy.replace(',', '.')); if (!isNaN(v)) tempoManual = v; }
          if (!baseDt && row.prazoRawLegacy) prazoManual = normalize(row.prazoRawLegacy).includes('fora') ? 'fora' : 'dentro';

          return {
            id: uid(),
            protocolo: row.protocolo,
            tituloCompleto,
            tipoCurto: svc.catalogado ? svc.tipoCurto : (tituloCompleto || 'Outros'),
            slaHoras,
            catalogado: svc.catalogado,
            cidade, bairro,
            telefone: row.telefone || '',
            supervisor: row.supervisor || '',
            statusAtendimento: row.statusAtendimento || '',
            dataAgendamento: (() => {
              const d = parseBRDateTime(row.dataAgendamento);
              return d ? d.toISOString() : null;
            })(),
            endereco: row.endereco || '',
            numero: row.numero || '',
            complemento: row.complemento || '',
            projeto: row.projeto || '',
            observacao: row.observacao || '',
            observacaoTecnico: row.observacaoTecnico || '',
            lat, lng,
            criadoEm: baseDt ? baseDt.toISOString() : null,
            tempoManual, prazoManual,
            descricaoEncerramento: row.descricaoEncerramento || '',
            dataFimAtendimento: (() => {
              const d = parseBRDateTime(row.dataFimAtendimento);
              return d ? d.toISOString() : null;
            })(),
            planoProduto: row.planoProduto || '',
            responsavel: row.responsavel || '',
            nomeCliente: row.nomeCliente || '',
            // se vier mais de um auxiliar na mesma célula (separados por
            // vírgula), só considera o primeiro
            tecnicoAuxiliar: (row.tecnicoAuxiliar || '').split(',')[0].replace(/^\s*\d+\s*-?\s*/, '').trim(),
          };
        }).filter(Boolean);

        tProcessando.remove();
        console.log('[Importação] headerRowIdx:', headerRowIdx, '| registros válidos encontrados:', imported.length);
        if (!imported.length){
          const colunasAchadas = headers.filter(Boolean);
          alert(
            `Não encontrei registros válidos nessa planilha.\n\n` +
            `Usei a linha ${headerRowIdx + 1} como cabeçalho e reconheci ${colunasAchadas.length} coluna(s): ${colunasAchadas.join(', ') || '(nenhuma)'}.\n\n` +
            `Confira se a linha ${headerRowIdx + 1} da planilha é mesmo a que tem "Nº. Ordem Serviço", "Tipo de Serviço", "Área", "Localidade" etc. Se não for, me avise qual linha é.`
          );
          resolve(null);
          return;
        }

        const cidadesNovas = [...new Set(imported.map(r => r.cidade).filter(Boolean))].filter(c => !cityCenter(c));
        if (cidadesNovas.length){
          const banner = document.createElement('div');
          banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:var(--brand);color:#0B1512;padding:14px 20px;font-weight:700;font-size:14px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.4)';
          banner.innerHTML = `📍 Localizando ${cidadesNovas.length} cidade(s) nova(s) no mapa — isso pode levar até ${Math.ceil(cidadesNovas.length * 1.2 / 60 * 10) / 10} minuto(s). Não feche nem atualize a página...<br><span id="geocode-progress-text" style="font-weight:400"></span>`;
          document.body.appendChild(banner);
          for (let i = 0; i < cidadesNovas.length; i++){
            const progText = banner.querySelector('#geocode-progress-text');
            if (progText) progText.textContent = `(${i+1}/${cidadesNovas.length}) ${cidadesNovas[i]}`;
            await ensureCityGeocoded(cidadesNovas[i]);
            if (i < cidadesNovas.length - 1) await new Promise(res => setTimeout(res, 1100));
          }
          banner.remove();
        }

        tProcessando.remove();
        const mode = confirm(`Foram lidos ${imported.length} registros.\nOK = substituir toda a base atual.\nCancelar = adicionar aos registros existentes.`);
        console.log('[Importação] Modo escolhido:', mode ? 'substituir' : 'adicionar');
        const tSalvando = showToast('💾 Salvando e sincronizando...');
        const atual = (await syncPull('MapaServicosData')) || loadData(STORAGE_KEY) || [];
        console.log('[Importação] Registros atuais na nuvem/local antes de salvar:', atual.length);
        const finalRecords = mode ? imported : [...atual, ...imported];

        saveData(STORAGE_KEY, finalRecords);
        const meta = { data: new Date().toISOString(), usuario: sessionStorage.getItem('ops_user') || 'desconhecido' };
        localStorage.setItem(MAPA_SERVICOS_IMPORT_META_KEY, JSON.stringify(meta));
        tSalvando.remove();
        const syncOk = await syncPushWithToast('MapaServicosData', finalRecords);
        console.log('[Importação] Sincronização com a nuvem deu certo?', syncOk, '| total final:', finalRecords.length);
        if (syncOk) await syncPush(MAPA_SERVICOS_IMPORT_META_SYNC, [meta]);

        const tSucesso = showToast(`✅ Importação concluída! ${finalRecords.length} protocolo(s) no total.`);
        setTimeout(() => tSucesso.remove(), 6000);

        if (syncOk){
          alert(
            `✅ Planilha importada com sucesso!\n\n` +
            `${imported.length} registro(s) lido(s) da planilha.\n` +
            `${mode ? `A base foi substituída — agora tem ${finalRecords.length} protocolo(s) no total.` : `Foram adicionados aos que já existiam — agora tem ${finalRecords.length} protocolo(s) no total.`}\n\n` +
            `✅ Já sincronizado na nuvem — todo mundo já consegue ver.`
          );
          const paginasComMapa = ['mapa-servicos.html', 'sla.html'];
          const paginaAtual = window.location.pathname.split('/').pop();
          if (!paginasComMapa.includes(paginaAtual) && confirm('Quer ir agora pro Mapa de Serviços pra conferir os dados importados?')){
            window.location.href = 'mapa-servicos.html';
          }
        } else {
          alert(
            `⚠️ A planilha foi lida (${imported.length} registro(s)), mas NÃO consegui sincronizar com a nuvem agora.\n\n` +
            `Os dados ficaram salvos só neste navegador — outras pessoas ainda não vão ver essa atualização.\n\n` +
            `Isso costuma ser internet instável ou a planilha ser muito grande pra sincronizar de uma vez. Tente clicar em "↻ Atualizar" daqui a pouco pra tentar sincronizar de novo, ou me avise se continuar acontecendo.`
          );
        }

        if (missingTypes.size){
          alert(
            `Atenção: ${missingTypes.size} tipo(s) de serviço não estavam no catálogo (ficaram com o nome completo em vez do nome curto):\n\n` +
            [...missingTypes].join('\n') +
            `\n\nMe avise esses nomes na conversa que eu adiciono ao catálogo.`
          );
        }

        resolve(finalRecords);
       }catch(err){
         document.querySelectorAll('.ops-toast').forEach(t => t.remove());
         console.error('Falha ao importar planilha', err);
         alert('❌ Deu um erro ao importar a planilha:\n\n' + (err && err.message ? err.message : err) + '\n\nMe avise na conversa com esse texto do erro.');
         resolve(null);
       }
      });
    });
  }

  return {
    STORAGE_KEY, CITY_CENTERS, CITY_REGISTRY, DEFAULT_CENTER, MAX_CITY_RADIUS_KM,
    normalize, cityCenter, canonicalCity, haversineKm, resolveCoords, corrigirCamposPessoa,
    ensureCityGeocoded, loadGeocodeCache,
    classifyType, allTypes, TYPE_OTHER,
    load, save, clearAll, uid, loadFallbackFromIdb,
    loadData, saveData, loadDataFallbackFromIdb, parseCSV, downloadCSV, downloadXLSX, readSpreadsheetFile,
    SERVICE_CATALOG, lookupService, parseBRDateTime, elapsedHoursSince,
    PRODUTIVIDADE_CATALOG, lookupProdutividade,
    TOUROS_UNIT_CITIES, NATAL_UNIT_CITIES, UNIT_CITIES, TOUROS_PROJECT_CODE, NATAL_PROJECT_CODE, UNIT_PROJECT_CODE,
    isTourosUnitCity, unitForCity, isUnitCity, projectUnit, checkProjectError,
    loadMunicipioPolygons, isPointInMunicipio,
    SUPERVISOR_BY_CITY, supervisorForCity,
    syncPull, syncPush, syncPushWithToast, showToast, importMapaServicosFile,
    DIAS_SEMANA, getRodizioConfig, setRodizioConfig, pullRodizioConfig, saturdayOfWeek,
    grupoFolgaNoSabado, isFolgaNoDia, proximoFimDeSemanaStatus, isIndisponivelNoDia,
    toDateSafe, formatDateBR, formatDateTimeBR, toDateInputValue,
  };
})();

/* ---------------- login + shell (sidebar) compartilhados ----------------
   A lista de quem pode acessar o site fica numa Planilha Google — pra dar ou
   tirar acesso de alguém, basta adicionar/apagar uma linha na planilha
   (colunas: USUARIO, SENHA, LIMITE DE ACESSO). Não precisa mexer no código.
   LIMITE DE ACESSO = "TOTAL" (vê tudo) ou uma lista de módulos separados por
   vírgula (ex: "mapa-servicos, gestao-operacional") pra ver só partes específicas.
   É uma trava informal, não uma autenticação segura de verdade — qualquer
   pessoa com o link da planilha consegue ver usuário e senha. */

const OPS_USERS_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1YADg1BB_jRveKt0Tr_7bwh8Pyv9oHUdNrPNYnb8cDns/export?format=csv&gid=0';

// Lista de emergência: usada apenas se a planilha não puder ser lida
// (sem internet, link não configurado, ou a planilha ficou fora do ar).
const OPS_USERS_FALLBACK = { coordenador: { senha: 'ops2024', acesso: 'TOTAL' } };

// Módulos válidos pra usar na coluna LIMITE DE ACESSO (mesma chave do href, sem .html)
const OPS_MODULE_KEYS = ['index', 'mapa-servicos', 'mundo-jira', 'gestao-operacional', 'gestao-pessoas', 'frotas', 'alerta'];

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
  { href: 'mundo-jira.html',       label: 'Mundo Jira',         icon: '🎫' },
  { href: 'gestao-operacional.html', label: 'Gestão Operacional', icon: '🧭' },
  { href: 'alerta.html',           label: 'Alerta',             icon: '🚨' },
  { href: 'gestao-pessoas.html',   label: 'Gestão de Pessoas',  icon: '👥' },
  { href: 'frotas.html',          label: 'Frotas',             icon: '🚚' },
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
        <div class="icon">OPE</div>
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
      <div class="tag">OPE · Coord.</div>
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
    <div class="crumb-left">
      <button class="sb-toggle-mobile" id="sb-toggle-mobile" aria-label="Abrir menu">☰</button>
      <span class="unit">OPE · Coordenação</span>
    </div>
    <div class="crumb-center"><span class="page">${pageTitle}</span></div>
    <div class="crumb-right">
      <div class="clock" id="ops-clock"></div>
      <span class="user-pill" id="user-pill" title="Sair">${(sessionStorage.getItem('ops_user') || 'usuário')} ×</span>
    </div>
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

  const overlayMobile = document.createElement('div');
  overlayMobile.className = 'sb-overlay-mobile';
  document.body.appendChild(sidebar);
  document.body.appendChild(overlayMobile);
  document.body.appendChild(shellMain);

  function fecharMenuMobile(){ document.body.classList.remove('sidebar-open-mobile'); }
  topbar.querySelector('#sb-toggle-mobile').addEventListener('click', () => {
    document.body.classList.toggle('sidebar-open-mobile');
  });
  overlayMobile.addEventListener('click', fecharMenuMobile);
  // fecha o menu sozinho ao navegar pra outra página, pra não ficar aberto
  // quando a próxima tela carregar
  sidebar.querySelectorAll('.sb-item').forEach(a => a.addEventListener('click', fecharMenuMobile));

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
  async function stampUltimaImportacao(){
    const labelEl = sidebar.querySelector('#sb-import-label');
    const infoEl = sidebar.querySelector('#sb-import-info');
    let meta = null;
    const shared = await OPS.syncPull('MapaServicosImportMetaData');
    if (shared && shared[0]){
      meta = shared[0];
      localStorage.setItem('ops_touros_mapa_servicos_import_meta_v1', JSON.stringify(meta));
    } else {
      try{ meta = JSON.parse(localStorage.getItem('ops_touros_mapa_servicos_import_meta_v1') || 'null'); }catch(e){}
    }
    if (!meta){ labelEl.style.display = 'none'; infoEl.style.display = 'none'; return; }
    labelEl.style.display = 'block';
    infoEl.style.display = 'block';
    infoEl.textContent = `${OPS.formatDateTimeBR(meta.data)} · ${meta.usuario}`;
  }
  stampUltimaImportacao();
  window.OPS_STAMP_IMPORT = stampUltimaImportacao;

  sidebar.querySelector('#sb-refresh').addEventListener('click', async () => {
    const btn = sidebar.querySelector('#sb-refresh');
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = '↻ Atualizando...';
    let ok = true;
    if (typeof window.OPS_ON_REFRESH === 'function'){
      try{
        const resultado = await window.OPS_ON_REFRESH();
        // se a página não devolver nada (undefined), considera sucesso —
        // só marca falha quando o retorno for explicitamente false
        ok = resultado !== false;
      }catch(e){
        console.error('Falha ao atualizar', e);
        ok = false;
      }
    }
    await stampUltimaAtualizacao();
    await stampUltimaImportacao();
    btn.disabled = false;
    btn.textContent = textoOriginal;
    if (!ok){
      const aviso = OPS.showToast('⚠️ Não consegui buscar os dados mais recentes da nuvem agora — verifique sua internet e tente de novo. A tela continua com os últimos dados salvos neste navegador.');
      setTimeout(() => aviso.remove(), 6000);
    }
  });

  topbar.querySelector('#user-pill').addEventListener('click', () => {
    sessionStorage.removeItem('ops_user');
    sessionStorage.removeItem('ops_access');
    location.reload();
  });
}
