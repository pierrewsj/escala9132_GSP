const $ = (id) => document.getElementById(id);
const SENHA_ADMIN = '4321';
const STORAGE_KEY = 'escalaEquipe9132DadosV3';

function clonar(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function carregarDadosSalvos() {
  const salvo = localStorage.getItem(STORAGE_KEY);
  if (!salvo) return;

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
}

function salvarDadosLocais() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    legenda: LEGENDA,
    escala: ESCALA,
    atualizadoEm: new Date().toISOString()
  }));
}

function diaAtualDoMes() {
  const hoje = new Date();
  return hoje.getDate();
}

function diasDisponiveis() {
  return Array.from({ length: 31 }, (_, i) => i + 1);
}

function postosDisponiveis() {
  return [...new Set([
    ...Object.keys(LEGENDA),
    ...ESCALA.flatMap(p => p.dias)
  ])].filter(Boolean).sort((a,b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
}

function postoDescricao(posto) {
  const info = LEGENDA[posto];
  if (!info) return 'Sem descrição cadastrada';

  if (typeof info === 'string') return info;

  if (info.local && info.setor && info.local.toLowerCase() === info.setor.toLowerCase()) {
    return info.local;
  }

  if (info.local && info.setor) {
    return `${info.local} • ${info.setor}`;
  }

  return info.local || info.setor || 'Sem descrição cadastrada';
}

function postoLegendaCompleta(posto) {
  const info = LEGENDA[posto];
  if (!info) return `${posto} - Sem descrição cadastrada`;

  if (typeof info === 'string') return `${posto} - ${info}`;

  if (info.local && info.setor && info.local.toLowerCase() === info.setor.toLowerCase()) {
    return `${posto} - ${info.local}`;
  }

  return `${posto} - ${info.local || ''} - ${info.setor || ''}`.replace(/ - $/, '');
}

function iniciar() {
  carregarDadosSalvos();
  preencherSelects();
  montarLegenda();
  $('tituloHoje').textContent = `${CONFIG.titulo}`;
  $('infoHoje').textContent = `${CONFIG.turno} • mês ${CONFIG.mes}`;
  registrarServiceWorker();
}

function preencherSelects() {
  $('selectNome').innerHTML = ESCALA.map(p => `<option value="${p.nome}">${p.nome}</option>`).join('');
  $('selectDia').innerHTML = diasDisponiveis().map(d => `<option value="${d}">Dia ${String(d).padStart(2, '0')}</option>`).join('');

  const postos = postosDisponiveis();
  $('selectPosto').innerHTML = postos.map(p => `<option value="${p}">${p}</option>`).join('');

  preencherSelectsAdmin();
}

function preencherSelectsAdmin() {
  if (!$('adminColaborador')) return;

  const postos = postosDisponiveis();
  $('postoPadrao').innerHTML = postos.map(p => `<option value="${p}">${p} - ${postoDescricao(p)}</option>`).join('');
  $('adminPosto').innerHTML = postos.map(p => `<option value="${p}">${p} - ${postoDescricao(p)}</option>`).join('');
  $('adminColaborador').innerHTML = ESCALA.map(p => `<option value="${p.nome}">${p.nome}</option>`).join('');
  $('adminDia').innerHTML = diasDisponiveis().map(d => `<option value="${d}">Dia ${String(d).padStart(2, '0')}</option>`).join('');
}

function card({ titulo, badge, descricao, hoje = false }) {
  return `
    <article class="item ${hoje ? 'hoje' : ''}">
      <div class="item-topo">
        <h3>${titulo}</h3>
        <span class="badge">${badge}</span>
      </div>
      <p class="descricao">${descricao}</p>
    </article>
  `;
}

function buscarPorNome() {
  abrirResultado();
  const nome = $('selectNome').value;
  const pessoa = ESCALA.find(p => p.nome === nome);
  if (!pessoa) return;

  const hoje = diaAtualDoMes();

  $('resultadoConteudo').innerHTML = `
    <div class="lista-cards">
      <div class="card"><h2>${pessoa.nome} • ${CONFIG.turno}</h2><p class="muted">Mês ${CONFIG.mes}</p></div>
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
  const dia = Number(diaInformado || $('selectDia').value);
  const hoje = diaAtualDoMes();

  $('resultadoConteudo').innerHTML = `
    <div class="lista-cards">
      <div class="card"><h2>Escala do dia ${String(dia).padStart(2, '0')}</h2><p class="muted">${CONFIG.turno} • Equipe ${CONFIG.equipe}</p></div>
      ${ESCALA.map(pessoa => {
        const posto = pessoa.dias[dia - 1] || '-';
        return card({
          titulo: pessoa.nome,
          badge: posto,
          descricao: postoDescricao(posto),
          hoje: dia === hoje
        });
      }).join('')}
    </div>
  `;
}

function buscarPorPosto() {
  abrirResultado();
  const postoBusca = $('selectPosto').value;
  const hoje = diaAtualDoMes();
  const itens = [];

  ESCALA.forEach(pessoa => {
    pessoa.dias.forEach((posto, i) => {
      const dia = i + 1;
      if (posto === postoBusca) {
        itens.push(card({
          titulo: pessoa.nome,
          badge: `Dia ${String(dia).padStart(2, '0')}`,
          descricao: `${postoBusca} • ${postoDescricao(postoBusca)}`,
          hoje: dia === hoje
        }));
      }
    });
  });

  $('resultadoConteudo').innerHTML = `
    <div class="lista-cards">
      <div class="card"><h2>Posto ${postoBusca}</h2><p class="muted">${postoDescricao(postoBusca)}</p></div>
      ${itens.length ? itens.join('') : '<div class="resultado-vazio">Nenhum resultado encontrado.</div>'}
    </div>
  `;
}

function mostrarHoje() {
  const dia = Math.min(diaAtualDoMes(), 31);
  $('selectDia').value = String(dia);
  buscarPorDia(dia);
}

function buscaRapida() {
  abrirResultado();
  const termo = $('campoBusca').value.trim().toUpperCase();
  if (!termo) {
    $('resultadoConteudo').innerHTML = '<div class="resultado-vazio">Digite algo para pesquisar.</div>';
    return;
  }

  const numero = Number(termo);
  if (numero >= 1 && numero <= 31) {
    buscarPorDia(numero);
    return;
  }

  const pessoa = ESCALA.find(p => p.nome.includes(termo));
  if (pessoa) {
    $('selectNome').value = pessoa.nome;
    buscarPorNome();
    return;
  }

  const posto = postosDisponiveis().find(p => p.toUpperCase().includes(termo));
  if (posto) {
    $('selectPosto').value = posto;
    buscarPorPosto();
    return;
  }

  $('resultadoConteudo').innerHTML = '<div class="resultado-vazio">Nenhum resultado encontrado.</div>';
}

function montarLegenda() {
  $('legendaConteudo').innerHTML = Object.keys(LEGENDA).sort((a,b) => a.localeCompare(b, 'pt-BR', { numeric: true })).map((codigo) => card({
    titulo: codigo,
    badge: 'Posto',
    descricao: postoLegendaCompleta(codigo)
  })).join('');
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
  const posto = $('postoPadrao').value || 'Pens.';

  if (!nome) {
    msgAdmin('Informe o nome do colaborador.', 'erro');
    return;
  }

  if (ESCALA.some(p => p.nome === nome)) {
    msgAdmin('Esse colaborador já existe.', 'erro');
    return;
  }

  ESCALA.push({ nome, dias: Array(31).fill(posto) });
  ESCALA.sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  $('novoNome').value = '';
  atualizarAppAposEdicao();
  msgAdmin(`Colaborador ${nome} adicionado.`);
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

function salvarEscalaDia() {
  const nome = $('adminColaborador').value;
  const dia = Number($('adminDia').value);
  const posto = $('adminPosto').value;
  const pessoa = ESCALA.find(p => p.nome === nome);

  if (!pessoa || !dia || !posto) {
    msgAdmin('Confira colaborador, dia e posto.', 'erro');
    return;
  }

  pessoa.dias[dia - 1] = posto;
  atualizarAppAposEdicao();
  msgAdmin(`Escala atualizada: ${nome}, dia ${String(dia).padStart(2, '0')}, posto ${posto}.`);
}

function exportarDados() {
  const dados = {
    legenda: LEGENDA,
    escala: ESCALA,
    exportadoEm: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup-escala-9132-${new Date().toISOString().slice(0,10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  msgAdmin('Backup exportado.');
}

function importarDados(event) {
  const arquivo = event.target.files[0];
  if (!arquivo) return;

  const leitor = new FileReader();
  leitor.onload = () => {
    try {
      const dados = JSON.parse(leitor.result);
      if (!dados.legenda || !dados.escala) throw new Error('Arquivo inválido');

      Object.keys(LEGENDA).forEach(k => delete LEGENDA[k]);
      Object.assign(LEGENDA, dados.legenda);
      ESCALA.splice(0, ESCALA.length, ...dados.escala);

      atualizarAppAposEdicao();
      msgAdmin('Backup importado com sucesso.');
    } catch (erro) {
      msgAdmin('Não foi possível importar esse arquivo.', 'erro');
    }
  };
  leitor.readAsText(arquivo);
  event.target.value = '';
}

function restaurarPadrao() {
  const confirmar = confirm('Deseja apagar as alterações deste aparelho e voltar para a escala padrão?');
  if (!confirmar) return;

  localStorage.removeItem(STORAGE_KEY);
  location.reload();
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
