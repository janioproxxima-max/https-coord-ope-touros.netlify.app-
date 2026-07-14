/* Carga inicial de exemplo — baseada no modelo da planilha
   "Plano de Ação KPI (Serviços) - Unidade Touros".
   Substitua importando seu CSV real (botão "Importar planilha").
   Algumas linhas trazem lat/lng próprios (para mostrar o pino exato);
   as demais ficam sem coordenada própria, caindo no ponto central
   da cidade automaticamente. */
const OPS_SEED_DATA = [
  { protocolo:'8596631/1', titulo:'OPERAÇÕES - SERVIÇOS ADICIONAIS',            cidade:'Acari',                bairro:'Dinarte Mariz',              projeto:'OP-INST-VT-RN', tempo:4,   prazoStatus:'dentro' },
  { protocolo:'8596364/1', titulo:'OPERAÇÕES - TROCA DE ENDEREÇO',              cidade:'Canguaretama',         bairro:'Vila Vintém (rua de trás)',  projeto:'OP-INST-VT-RN', tempo:4,   prazoStatus:'dentro', lat:-6.379, lng:-35.131 },
  { protocolo:'8596206/1', titulo:'OPERAÇÕES - CABO BAIXO',                     cidade:'Carnaúba dos Dantas',  bairro:'Dom José Adelino Dantas',    projeto:'OP-INST-VT-RN', tempo:4,   prazoStatus:'dentro' },
  { protocolo:'8595934/1', titulo:'OPERAÇÕES - SEM ACESSO',                     cidade:'Carnaúba dos Dantas',  bairro:'Conjunto Seu Anísio',        projeto:'OP-INST-VT-RN', tempo:5,   prazoStatus:'dentro', lat:-6.551, lng:-36.649 },
  { protocolo:'8598265/1', titulo:'OPERAÇÕES - DIFICULDADES DE ACESSO',         cidade:'Ceará-Mirim',          bairro:'Planalto',                   projeto:'OP-INST-VT-RN', tempo:0,   prazoStatus:'dentro' },
  { protocolo:'8595430/1', titulo:'OPERAÇÕES - SEM ACESSO',                     cidade:'Ceará-Mirim',          bairro:'Muriú',                      projeto:'OP-INST-VT-RN', tempo:6,   prazoStatus:'dentro', lat:-5.556, lng:-35.365 },
  { protocolo:'8593117/1', titulo:'OPERAÇÕES - FIBRA ATIVAÇÃO (INSTALAÇÃO)',    cidade:'Extremoz',             bairro:'Sport Club Natureza',        projeto:'OP-INST-VT-RN', tempo:45,  prazoStatus:'dentro' },
  { protocolo:'8557522/2', titulo:'BOT - FIBRA ATIVAÇÃO',                       cidade:'Jardim do Seridó',     bairro:'Bela Vista',                 projeto:'OP-INST-VT-RN', tempo:172, prazoStatus:'fora' },
  { protocolo:'8596904/1', titulo:'OPERAÇÕES - FIBRA ATIVAÇÃO (INSTALAÇÃO)',    cidade:'Natal',                bairro:'Felipe Camarão',             projeto:'OP-INST-VT-RN', tempo:3,   prazoStatus:'dentro', lat:-5.812, lng:-35.246 },
  { protocolo:'8597833/1', titulo:'OPERAÇÕES - RECOLHIMENTO/TROCA DE ENDEREÇO', cidade:'Parelhas',             bairro:'Ivan Bezerra',               projeto:'OP-INST-VT-RN', tempo:1,   prazoStatus:'dentro' },
  { protocolo:'8597815/1', titulo:'OPERAÇÕES - TROCA DE ENDEREÇO',              cidade:'Parelhas',             bairro:'Ivan Bezerra',               projeto:'OP-INST-VT-RN', tempo:1,   prazoStatus:'dentro' },
  { protocolo:'8597042/1', titulo:'OPERAÇÕES - RECOLHIMENTO/TROCA DE ENDEREÇO', cidade:'Parelhas',             bairro:'Ivan Bezerra',               projeto:'OP-INST-VT-RN', tempo:3,   prazoStatus:'dentro', lat:-6.676, lng:-36.655 },
  { protocolo:'8595129/1', titulo:'OPERAÇÕES - FIBRA ATIVAÇÃO (INSTALAÇÃO)',    cidade:'Parelhas',             bairro:'Maria Terceira',             projeto:'OP-INST-VT-RN', tempo:6,   prazoStatus:'dentro' },
  { protocolo:'8591338/3', titulo:'OPERAÇÕES - FIBRA ATIVAÇÃO (INSTALAÇÃO)',    cidade:'Parelhas',             bairro:'Ivan Bezerra',               projeto:'OP-INST-VT-RN', tempo:0,   prazoStatus:'dentro' },
  { protocolo:'8584930/3', titulo:'BOT - FIBRA ATIVAÇÃO',                       cidade:'Parelhas',             bairro:'Ivan Bezerra',               projeto:'OP-INST-VT-RN', tempo:4,   prazoStatus:'dentro' },
  { protocolo:'8583762/4', titulo:'OPERAÇÕES - RETENÇÃO CLIENTE CRÍTICO',       cidade:'Parelhas',             bairro:'Centro',                     projeto:'OP-INST-VT-RN', tempo:24,  prazoStatus:'dentro' },
  { protocolo:'8458046/1', titulo:'OPERAÇÕES - RECOLHIMENTO/TROCA DE ENDEREÇO', cidade:'Parelhas',             bairro:'Maria Terceira',             projeto:'OP-INST-VT-RN', tempo:3,   prazoStatus:'dentro' },
  { protocolo:'8596444/1', titulo:'OPERAÇÕES - FIBRA ATIVAÇÃO (INSTALAÇÃO)',    cidade:'São José de Mipibu',   bairro:'Taborda',                    projeto:'OP-INST-VT-RN', tempo:4,   prazoStatus:'dentro', lat:-6.065, lng:-35.241 },
];
