const CONFIG = {
  mes: '09/2025',
  equipe: '9132',
  turno: '1º Turno',
  titulo: 'Escala de Trabalho - Equipe 9132'
};

const LEGENDA = {
  '69': { local: 'Pátio central', setor: 'Carregamento' },
  '70': { local: 'Pátio central', setor: 'Carregamento' },
  'CMP': { local: 'Pátio central', setor: 'Carregamento' },
  '71': { local: 'G89', setor: 'Caixaria' },
  '72': { local: 'G04', setor: 'JIT' },
  '73': { local: 'G04', setor: 'JIT' },
  '74': { local: 'Pensilina', setor: 'Pensilina' },
  '75': { local: 'Pensilina', setor: 'Pensilina' },
  '76': { local: 'Pensilina', setor: 'Pensilina' },
  '77': { local: 'Pensilina', setor: 'Pensilina' },
  'G38': { local: 'Ilha ecológica', setor: 'Ilha ecológica' },
  'G15': { local: 'Pátio de sucatas', setor: 'Pátio de sucatas' },
  'G76': { local: 'Galpão 76', setor: 'Expedição vasilhame' },
  '66AU': { local: 'G9', setor: 'FTP' },
  'INT-89': { local: 'G89', setor: 'Interne' },
  'FPT/CX': { local: 'G8 FPT', setor: 'Caixaria' },
  'RÁDIO': { local: 'Central de Segurança', setor: 'Disponível para demandas' },
  'Pens.': { local: 'Pensilina', setor: 'Pensilina' }
};

const CICLO = ['69','72','74','INT-89','77','CMP','73','66AU','70','75','71','76','G76','RÁDIO','FPT/CX'];
function cicloAPartir(inicio, qtd = 31) {
  const i = CICLO.indexOf(inicio);
  const start = i >= 0 ? i : 0;
  return Array.from({ length: qtd }, (_, n) => CICLO[(start + n) % CICLO.length]);
}

const ESCALA = [
  { nome: 'VANDER', dias: Array(31).fill('G15') },
  { nome: 'PIERRE', dias: Array(31).fill('G38') },
  { nome: 'DANIEL', dias: Array(31).fill('Pens.') },
  { nome: 'POLIANA S.', dias: Array(31).fill('Pens.') },
  { nome: 'VIANA', dias: Array(31).fill('Pens.') },
  { nome: 'JULIANO', dias: cicloAPartir('69') },
  { nome: 'AIMEN', dias: cicloAPartir('72') },
  { nome: 'CARLOS', dias: cicloAPartir('74') },
  { nome: 'GINALDO', dias: cicloAPartir('INT-89') },
  { nome: 'JAIR', dias: cicloAPartir('77') },
  { nome: 'DORIEL', dias: cicloAPartir('CMP') },
  { nome: 'POLIANA G.', dias: cicloAPartir('73') },
  { nome: 'RENATO', dias: cicloAPartir('66AU') },
  { nome: 'MAXILENE', dias: cicloAPartir('70') },
  { nome: 'ADRIANA', dias: cicloAPartir('75') },
  { nome: 'ALEXANDRE', dias: cicloAPartir('71') },
  { nome: 'REGINALDO', dias: cicloAPartir('76') },
  { nome: 'AMANDA', dias: cicloAPartir('G76') },
  { nome: 'FABIANA', dias: cicloAPartir('RÁDIO') },
  { nome: 'CINTIA', dias: cicloAPartir('FPT/CX') }
];
