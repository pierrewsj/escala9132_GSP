const $ = (id) => document.getElementById(id);
const SENHA_ADMIN = '4321';
const STORAGE_KEY = 'escalaEquipe9132DadosV5';

function corrigirTextoEscala(valor) {
  if (typeof valor !== 'string') return valor;
  const v = valor.trim();
  const mapa = {
    'Pensilvânia': 'Pensilina',
    'PENSILVÂNIA': 'Pensilina',
    'Canetas': 'Pens.',
    'CANETAS': 'Pens.',
    'G89 interno': 'G89 Interno',
    'G89 Interno': 'G89 Interno',
    'Interne': 'G89 Interno',
    'Interni': 'G89 Interno'
  };
  return mapa[v] || valor;
}

function corrigirDadosAntigos() {
  Object.keys(LEGENDA).forEach(codigo => {
    const info = LEGENDA[codigo];
    if (typeof info === 'string') {
      LEGENDA[codigo] = corrigirTextoEscala(info);
    } else if (info) {
      info.local = corrigirTextoEscala(info.local);
      info.setor = corrigirTextoEscala(info.setor);
    }
  });

  if (LEGENDA['INT-89']) {
    LEGENDA['INT-89'] = { local: 'G89 Interno', setor: 'G89 Interno' };
  }

  ESCALA.forEach(p => {
    if (Array.isArray(p.dias)) {
      p.dias = p.dias.map(corrigirTextoEscala);
    }
  });
}

function clonar(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function turnosDisponiveis() {
  return CONFIG.turnos || ['1º Turno', '2º Turno', '3º Turno'];
}

function normalizarEscala() {
  ESCALA.forEach(p => {
    if (!p.turno) p.turno = CONFIG.turno || '1º Turno';
    if (!Array.isArray(p.dias)) p.dias = Array(31).fill('Pens.');
    while (p.dias.length < 31) p.dias.push('Pens.');
    p.dias = p.dias.slice(0, 31);
  });
}

function carregarDadosSalvos() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) {
    corrigirDadosAntigos();
    normalizarEscala();
    return;
  }

  try {
    const dados = JSON.parse(salvo);
    if (dados.legenda && dados.escala) {
      Object.keys(LEGENDA).forEach(k => delete LEGENDA[k]);
      Object.assign(LEGENDA, dados.legenda);
      ESCALA.splice(0, ESCALA.length, ...dados.escala);
    }
  } catch (erro) {
    console.warn('Não foi possível carregar dados salvos.', erro);
  }

  corrigirDadosAntigos();
  normalizarEscala();
}

function salvarDadosLocais() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    legenda: LEGENDA,
    escala: ESCALA,
    atualizadoEm: new Date().toISOString()
  }));
}

function diaAtualDoMes() {
  return new Date().getDate();
}

function diasDisponiveis() {
  return Array.from({ length: 31 }, (_, i) => i + 1);
}

function pessoasPorTurno(turno = 'todos') {
  if (turno === 'todos') return ESCALA;
  return ESCALA.filter(p => p.turno === turno);
}

function postosDisponiveis(pessoas = ESCALA) {
  return [...new Set([
    ...Object.keys(LEGENDA),
    ...pessoas.flatMap(p => p.dias)
  ])].filter(Boolean).sort((a,b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
}

function postoDescricao(posto) {
  const info = LEGENDA[posto];
  if (!posto) return 'Sem posto definido';
  if (!info) return 'Sem descrição cadastrada';
  if (typeof info === 'string') return info;
  if (info.local && info.setor && info.local.toLowerCase() === info.setor.toLowerCase()) return info.local;
  if (info.local && info.setor) return `${info.local} • ${info.setor}`;
  return info.local || info.setor || 'Sem descrição cadastrada';
}

function postoLegendaCompleta(posto) {
  const info = LEGENDA[posto];
  if (!info) return `${posto} - Sem descrição cadastrada`;
  if (typeof info === 'string') return `${posto} - ${info}`;
  if (info.local && info.setor && info.local.toLowerCase() === info.setor.toLowerCase()) return `${posto} - ${info.local}`;
  return `${posto} - ${info.local || ''} - ${info.setor || ''}`.replace(/ - $/, '');
}

function iniciar() {
  carregarDadosSalvos();
  preencherSelects();
  montarLegenda();
  $('tituloHoje').textContent = CONFIG.titulo;
  $('infoHoje').textContent = 'Use a consulta abaixo para visualizar.';
  registrarServiceWorker();
}

function preencherSelects() {
  $('selectTurnoConsulta').innerHTML = [
    '<option value="todos">Todos os turnos</option>',
    ...turnosDisponiveis().map(t => `<option value="${t}">${t}</option>`)
  ].join('');
  $('selectTurnoConsulta').value = CONFIG.turno || '1º Turno';
  atualizarValorConsulta();
  preencherSelectsAdmin();
}

function atualizarValorConsulta() {
  const tipo = $('tipoConsulta')?.value || 'nome';
  const turno = $('selectTurnoConsulta')?.value || 'todos';
  const pessoas = pessoasPorTurno(turno);

  if (tipo === 'nome') {
    $('valorConsulta').innerHTML = pessoas
      .slice()
      .sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map(p => `<option value="${p.nome}">${p.nome} • ${p.turno}</option>`)
      .join('') || '<option value="">Nenhum colaborador neste turno</option>';
    return;
  }

  if (tipo === 'dia') {
    $('valorConsulta').innerHTML = diasDisponiveis()
      .map(d => `<option value="${d}">Dia ${String(d).padStart(2, '0')}</option>`)
      .join('');
    return;
  }

  const postos = postosDisponiveis(pessoas);
  $('valorConsulta').innerHTML = postos
    .map(p => `<option value="${p}">${p} - ${postoDescricao(p)}</option>`)
    .join('') || '<option value="">Nenhum posto encontrado</option>';
}

function preencherSelectsAdmin() {
  if (!$('adminColaborador')) return;

  const postos = postosDisponiveis();
  const opcoesPostos = ['<option value="">Sem posto</option>', ...postos.map(p => `<option value="${p}">${p} - ${postoDescricao(p)}</option>`)].join('');
  const opcoesTurnos = turnosDisponiveis().map(t => `<option value="${t}">${t}</option>`).join('');

  $('novoTurno').innerHTML = opcoesTurnos;
  $('postoIntervalo').innerHTML = opcoesPostos;
  const colaboradoresOrdenados = ESCALA
    .map((p, index) => ({ ...p, index }))
    .sort((a,b) => (a.turno + a.nome).localeCompare(b.turno + b.nome, 'pt-BR'));

  const opcoesColaboradores = colaboradoresOrdenados
    .map(p => `<option value="${p.index}">${p.nome} • ${p.turno}</option>`).join('');

  $('adminColaborador').innerHTML = opcoesColaboradores;
  if ($('excluirColaborador')) $('excluirColaborador').innerHTML = opcoesColaboradores || '<option value="">Nenhum colaborador</option>';

  $("adminColaborador").onchange = carregarEscalaMensal;
  montarGradeDiasAdmin();
  carregarEscalaMensal();

}

function montarGradeDiasAdmin() {
  if (!$('gradeDiasAdmin')) return;
  const postos = postosDisponiveis();
  const opcoes = ['<option value="">Sem posto</option>', ...postos.map(p => `<option value="${p}">${p}</option>`)].join('');
  $('gradeDiasAdmin').innerHTML = diasDisponiveis().map(d => `
    <div class="dia-admin">
      <label for="diaAdmin_${d}">${String(d).padStart(2, '0')}</label>
      <select id="diaAdmin_${d}">${opcoes}</select>
    </div>
  `).join('');
}

function card({ titulo, badge, descricao, hoje = false, subtitulo = '' }) {
  return `
    <article class="item ${hoje ? 'hoje' : ''}">
      <div class="item-topo">
        <h3>${titulo}</h3>
        <span class="badge">${badge}</span>
      </div>
      ${subtitulo ? `<p class="mini-info">${subtitulo}</p>` : ''}
      <p class="descricao">${descricao}</p>
    </article>
  `;
}

function consultarUnico() {
  const tipo = $('tipoConsulta').value;
  const valor = $('valorConsulta').value;
  if (!valor) {
    $('resultadoConteudo').innerHTML = '<div class="resultado-vazio">Nenhum item disponível para consultar.</div>';
    abrirResultado();
    return;
  }

  if (tipo === 'nome') return buscarPorNome(valor);
  if (tipo === 'dia') return buscarPorDia(Number(valor));
  return buscarPorPosto(valor);
}

function buscarPorNome(nomeInformado) {
  abrirResultado();
  const nome = nomeInformado || $('valorConsulta').value;
  const turnoFiltro = $('selectTurnoConsulta')?.value || 'todos';
  const pessoa = pessoasPorTurno(turnoFiltro).find(p => p.nome === nome) || ESCALA.find(p => p.nome === nome);
  if (!pessoa) return;

  const hoje = diaAtualDoMes();
  $('resultadoConteudo').innerHTML = `
    <div class="lista-cards">
      <div class="card"><h2>${pessoa.nome}</h2><p class="muted">${pessoa.turno}</p></div>
      ${pessoa.dias.map((posto, i) => {
        const dia = i + 1;
        return card({
          titulo: `Dia ${String(dia).padStart(2, '0')}`,
          badge: posto,
          descricao: postoDescricao(posto),
          hoje: dia === hoje
        });
      }).join('')}
    </div>
  `;
}

function buscarPorDia(diaInformado) {
  abrirResultado();
  const dia = Number(diaInformado || $('valorConsulta').value);
  const turnoFiltro = $('selectTurnoConsulta')?.value || 'todos';
  const pessoas = pessoasPorTurno(turnoFiltro);
  const hoje = diaAtualDoMes();
  const tituloTurno = turnoFiltro === 'todos' ? 'Todos os turnos' : turnoFiltro;

  $('resultadoConteudo').innerHTML = `
    <div class="lista-cards">
      <div class="card"><h2>Escala do dia ${String(dia).padStart(2, '0')}</h2><p class="muted">${tituloTurno}</p></div>
      ${pessoas.length ? pessoas.map(pessoa => {
        const posto = pessoa.dias[dia - 1] || '-';
        return card({
          titulo: pessoa.nome,
          badge: posto,
          descricao: postoDescricao(posto),
          subtitulo: pessoa.turno,
          hoje: dia === hoje
        });
      }).join('') : '<div class="resultado-vazio">Nenhum colaborador neste turno.</div>'}
    </div>
  `;
}

function buscarPorPosto(postoInformado) {
  abrirResultado();
  const postoBusca = postoInformado || $('valorConsulta').value;
  const turnoFiltro = $('selectTurnoConsulta')?.value || 'todos';
  const pessoas = pessoasPorTurno(turnoFiltro);
  const hoje = diaAtualDoMes();
  const itens = [];

  pessoas.forEach(pessoa => {
    pessoa.dias.forEach((posto, i) => {
      const dia = i + 1;
      if (posto === postoBusca) {
        itens.push(card({
          titulo: pessoa.nome,
          badge: `Dia ${String(dia).padStart(2, '0')}`,
          descricao: `${postoBusca} • ${postoDescricao(postoBusca)}`,
          subtitulo: pessoa.turno,
          hoje: dia === hoje
        }));
      }
    });
  });

  $('resultadoConteudo').innerHTML = `
    <div class="lista-cards">
      <div class="card"><h2>Local / posto ${postoBusca}</h2><p class="muted">${postoDescricao(postoBusca)}</p></div>
      ${itens.length ? itens.join('') : '<div class="resultado-vazio">Nenhum resultado encontrado.</div>'}
    </div>
  `;
}

function mostrarHoje() {
  const dia = Math.min(diaAtualDoMes(), 31);
  $('tipoConsulta').value = 'dia';
  atualizarValorConsulta();
  $('valorConsulta').value = String(dia);
  buscarPorDia(dia);
}

function montarLegenda() {
  $('legendaConteudo').innerHTML = Object.keys(LEGENDA)
    .sort((a,b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
    .map((codigo) => card({ titulo: codigo, badge: 'Posto', descricao: postoLegendaCompleta(codigo) }))
    .join('');
}

function abrirAba(id, botao) {
  document.querySelectorAll('.painel').forEach(p => p.classList.remove('ativo'));
  document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));
  $(id).classList.add('ativo');
  botao.classList.add('ativa');
}

function abrirResultado() {
  document.querySelectorAll('.painel').forEach(p => p.classList.remove('ativo'));
  document.querySelectorAll('.aba').forEach(a => a.classList.remove('ativa'));
  $('resultado').classList.add('ativo');
  document.querySelector('.aba').classList.add('ativa');
}

function msgAdmin(texto, tipo = 'ok') {
  const el = $('msgAdmin');
  if (!el) return;
  el.textContent = texto;
  el.className = `msg ${tipo}`;
  setTimeout(() => { el.textContent = ''; }, 4500);
}

function entrarAdmin() {
  const senha = $('senhaAdmin').value.trim();
  if (senha !== SENHA_ADMIN) {
    $('msgAdminLogin').textContent = 'Senha incorreta.';
    $('msgAdminLogin').className = 'msg erro';
    return;
  }

  $('adminLogin').hidden = true;
  $('areaAdmin').hidden = false;
  $('senhaAdmin').value = '';
  $('msgAdminLogin').textContent = '';
  preencherSelectsAdmin();
}

function sairAdmin() {
  $('areaAdmin').hidden = true;
  $('adminLogin').hidden = false;
}

function atualizarAppAposEdicao() {
  salvarDadosLocais();
  preencherSelects();
  montarLegenda();
}

function salvarColaborador() {
  const nome = $('novoNome').value.trim().toUpperCase();
  const turno = $('novoTurno').value || '1º Turno';

  if (!nome) {
    msgAdmin('Informe o nome do colaborador.', 'erro');
    return;
  }

  if (ESCALA.some(p => p.nome === nome && p.turno === turno)) {
    msgAdmin('Esse colaborador já existe neste turno.', 'erro');
    return;
  }

  ESCALA.push({ nome, turno, dias: Array(31).fill('') });
  ESCALA.sort((a,b) => (a.turno + a.nome).localeCompare(b.turno + b.nome, 'pt-BR'));
  $('novoNome').value = '';
  atualizarAppAposEdicao();
  msgAdmin(`Colaborador ${nome} adicionado em ${turno}.`);
}

function excluirColaborador() {
  const campo = $('excluirColaborador');
  if (!campo || campo.value === '') {
    msgAdmin('Selecione um colaborador para excluir.', 'erro');
    return;
  }

  const indice = Number(campo.value);
  const pessoa = ESCALA[indice];
  if (!pessoa) {
    msgAdmin('Colaborador não encontrado.', 'erro');
    return;
  }

  const confirmar = confirm(`Deseja excluir ${pessoa.nome} do ${pessoa.turno}?`);
  if (!confirmar) return;

  ESCALA.splice(indice, 1);
  atualizarAppAposEdicao();
  preencherSelectsAdmin();
  msgAdmin(`Colaborador ${pessoa.nome} excluído.`);
}

function salvarPosto() {
  const codigo = $('novoCodigoPosto').value.trim().toUpperCase();
  const local = $('novaLocalizacao').value.trim();
  const setor = $('novoSetor').value.trim();

  if (!codigo || !local) {
    msgAdmin('Informe pelo menos o código e a localização.', 'erro');
    return;
  }

  LEGENDA[codigo] = { local, setor: setor || local };
  $('novoCodigoPosto').value = '';
  $('novaLocalizacao').value = '';
  $('novoSetor').value = '';
  atualizarAppAposEdicao();
  msgAdmin(`Posto ${codigo} salvo.`);
}

function colaboradorAdminSelecionado() {
  const indice = Number($('adminColaborador').value);
  return ESCALA[indice];
}

function carregarEscalaMensal() {
  const pessoa = colaboradorAdminSelecionado();
  if (!pessoa) return;
  diasDisponiveis().forEach(d => {
    const campo = $(`diaAdmin_${d}`);
    if (campo) campo.value = pessoa.dias[d - 1] || '';
  });
}

function aplicarPostoTodosDias() {
  const pessoa = colaboradorAdminSelecionado();
  const posto = $('postoIntervalo').value;

  if (!pessoa) {
    msgAdmin("Selecione um colaborador.", "erro");
    return;
  }

  if (!posto) {
    msgAdmin("Selecione um posto para aplicar.", "erro");
    return;
  }

  pessoa.dias = diasDisponiveis().map(() => posto);
  atualizarAppAposEdicao();
  carregarEscalaMensal();
  msgAdmin("Posto " + posto + " aplicado para " + pessoa.nome + ".");
}
function salvarEscalaMensal() {
  const pessoa = colaboradorAdminSelecionado();
  if (!pessoa) {
    msgAdmin('Selecione um colaborador.', 'erro');
    return;
  }

  pessoa.dias = diasDisponiveis().map(d => $(`diaAdmin_${d}`).value || '');
  atualizarAppAposEdicao();
  msgAdmin(`Escala mensal de ${pessoa.nome} salva.`);
}

async function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('./service-worker.js'); } catch (e) {}
  }
}

let promptInstalacao;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptInstalacao = e;
  $('btnInstalar').hidden = false;
});

$('btnInstalar').addEventListener('click', async () => {
  if (!promptInstalacao) return;
  promptInstalacao.prompt();
  await promptInstalacao.userChoice;
  promptInstalacao = null;
  $('btnInstalar').hidden = true;
});

window.addEventListener('load', iniciar);
