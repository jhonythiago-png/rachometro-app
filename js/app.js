// Rachômetro - app.js
let posicaoCounter = 0;
let currentSessaoId = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showView(id) {
  document.querySelectorAll('.view').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function setNavActive(navId) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(navId);
  if (btn) btn.classList.add('active');
}

// ---------------- AUTH ----------------

async function checkSession() {
  try {
    if (!window.supabase || !supabaseClient) {
      console.error('Supabase não carregou.');
      showScreen('login-screen');
      return;
    }
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
      showScreen('app-screen');
      goToElenco();
    } else {
      showScreen('login-screen');
    }
  } catch (err) {
    console.error(err);
    showScreen('login-screen');
  }
}

const DOMINIO_LOGIN = 'rachometro.com';

async function handleLogin(e) {
  e.preventDefault();
  console.log('[login] submit disparado');
  const digitado = document.getElementById('login-email').value.trim();
  const email = digitado.includes('@') ? digitado : `${digitado}@${DOMINIO_LOGIN}`;
  const senha = document.getElementById('login-senha').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  console.log('[login] email:', email);

  try {
    if (!window.supabase || !supabaseClient) {
      console.log('[login] supabaseClient ausente');
      errorEl.textContent = 'Erro ao carregar a biblioteca do Supabase. Recarregue a página.';
      return;
    }
    console.log('[login] chamando signInWithPassword...');
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    console.log('[login] resposta recebida', { data, error });
    if (error) {
      errorEl.textContent = 'Não foi possível entrar: ' + error.message;
      return;
    }
    console.log('[login] sucesso, indo pro app');
    showScreen('app-screen');
    goToElenco();
  } catch (err) {
    console.error('[login] excecao', err);
    errorEl.textContent = 'Erro inesperado: ' + err.message;
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  showScreen('login-screen');
}

// ---------------- ELENCO ----------------

let elencoCache = {};

function goToElenco() {
  showView('view-elenco');
  setNavActive('nav-elenco');
  loadElenco();
}

async function loadElenco() {
  const listEl = document.getElementById('lista-elenco');
  listEl.innerHTML = '<p class="empty-state">Carregando elenco...</p>';

  const { data: jogadores, error } = await supabaseClient
    .from('jogadores')
    .select('id, nome, ativo, jogador_posicoes(id, posicao, nivel, principal)')
    .eq('ativo', true)
    .order('nome');

  if (error) {
    listEl.innerHTML = '<p class="empty-state">Erro ao carregar o elenco.</p>';
    console.error(error);
    return;
  }

  if (!jogadores || jogadores.length === 0) {
    listEl.innerHTML = '<p class="empty-state">Nenhum jogador cadastrado ainda.<br>Toque em "Cadastrar" para adicionar o primeiro.</p>';
    return;
  }

  elencoCache = {};
  jogadores.forEach(j => { elencoCache[j.id] = j; });

  listEl.innerHTML = '';
  jogadores.forEach(j => {
    const posicoes = (j.jogador_posicoes || [])
      .sort((a, b) => (b.principal === true) - (a.principal === true))
      .map(p => `${formatPosicaoLabel(p.posicao)} (nível ${p.nivel})`)
      .join(' · ');

    const row = document.createElement('div');
    row.className = 'player-card';
    row.style.cursor = 'pointer';
    row.onclick = () => editarJogador(j.id);
    row.innerHTML = `
      <div class="avatar-ring"><div class="avatar-ring-inner">${getInitials(j.nome)}</div></div>
      <div class="player-info">
        <div class="player-name">${escapeHtml(j.nome)}</div>
        <div class="player-meta">${posicoes || 'sem posição cadastrada'}</div>
      </div>
      <i class="edit-hint">editar</i>
    `;
    listEl.appendChild(row);
  });
}

function getInitials(nome) {
  const partes = nome.trim().split(/\s+/);
  const iniciais = partes.slice(0, 2).map(p => p.charAt(0).toUpperCase());
  return iniciais.join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatPosicaoLabel(valor) {
  const conhecida = POSICOES.find(p => p.valor === valor);
  if (conhecida) return conhecida.label;
  return valor.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ---------------- CADASTRO ----------------

const POSICOES = [
  { valor: 'goleiro', label: 'Goleiro' },
  { valor: 'zagueiro', label: 'Zagueiro' },
  { valor: 'cabeca-de-area', label: 'Cabeça de Área' },
  { valor: 'meio-campo', label: 'Meio de Campo' },
  { valor: 'lateral-esquerda', label: 'Lateral Esquerda' },
  { valor: 'lateral-direita', label: 'Lateral Direita' },
  { valor: 'centroavante', label: 'Centroavante' },
];
const OUTRA_POSICAO = '__outra__';

let editingJogadorId = null;

function goToCadastro() {
  showView('view-cadastro');
  setNavActive('nav-cadastro');
  // só reseta se o formulário estiver vazio (não apaga o que já foi preenchido)
  const container = document.getElementById('posicoes-container');
  if (container.children.length === 0) {
    resetCadastroForm();
  }
}

function resetCadastroForm() {
  editingJogadorId = null;
  document.getElementById('cadastro-titulo').textContent = 'Novo jogador';
  document.getElementById('btn-cancelar-edicao').style.display = 'none';
  document.getElementById('btn-excluir-jogador').style.display = 'none';
  document.getElementById('btn-salvar-jogador').textContent = 'Salvar jogador';
  document.getElementById('cadastro-nome').value = '';
  const container = document.getElementById('posicoes-container');
  container.innerHTML = '';
  posicaoCounter = 0;
  addPosicaoRow(true);
}

function editarJogador(jogadorId) {
  const jogador = elencoCache[jogadorId];
  if (!jogador) return;

  editingJogadorId = jogadorId;
  showView('view-cadastro');
  setNavActive('nav-cadastro');

  document.getElementById('cadastro-titulo').textContent = 'Editar jogador';
  document.getElementById('btn-cancelar-edicao').style.display = 'inline-block';
  document.getElementById('btn-excluir-jogador').style.display = 'block';
  document.getElementById('btn-salvar-jogador').textContent = 'Salvar alterações';
  document.getElementById('cadastro-nome').value = jogador.nome;

  const container = document.getElementById('posicoes-container');
  container.innerHTML = '';
  posicaoCounter = 0;

  const posicoesOrdenadas = [...(jogador.jogador_posicoes || [])]
    .sort((a, b) => (b.principal === true) - (a.principal === true));

  if (posicoesOrdenadas.length === 0) {
    addPosicaoRow(true);
  } else {
    posicoesOrdenadas.forEach((p, idx) => {
      addPosicaoRow(idx === 0, p.posicao, p.nivel);
    });
  }
}

function cancelarEdicao() {
  goToElenco();
}

async function handleExcluirJogador() {
  if (!editingJogadorId) return;
  const jogador = elencoCache[editingJogadorId];
  const nome = jogador ? jogador.nome : 'este jogador';

  if (!confirm(`Remover ${nome} do elenco? Isso não apaga o histórico de jogos já registrados.`)) {
    return;
  }

  const { error } = await supabaseClient
    .from('jogadores')
    .update({ ativo: false })
    .eq('id', editingJogadorId);

  if (error) {
    showToast('Erro ao excluir jogador.');
    console.error(error);
    return;
  }

  showToast('Jogador removido do elenco.');
  goToElenco();
}

function addPosicaoRow(principal = false, valorInicial = null, nivelInicial = null) {
  posicaoCounter++;
  const id = `posicao-row-${posicaoCounter}`;
  const container = document.getElementById('posicoes-container');

  const ehConhecida = valorInicial && POSICOES.some(p => p.valor === valorInicial);
  const selecionarOutra = valorInicial && !ehConhecida;

  const row = document.createElement('div');
  row.className = 'posicao-row';
  row.id = id;
  row.innerHTML = `
    <select class="posicao-select" onchange="togglePosicaoCustom(this)">
      ${POSICOES.map(p => `<option value="${p.valor}" ${p.valor === valorInicial ? 'selected' : ''}>${p.label}</option>`).join('')}
      <option value="${OUTRA_POSICAO}" ${selecionarOutra ? 'selected' : ''}>Outra posição...</option>
    </select>
    <input type="text" class="posicao-custom-input" placeholder="Nome da posição"
      value="${selecionarOutra ? escapeHtml(formatPosicaoLabel(valorInicial)) : ''}"
      style="display:${selecionarOutra ? 'block' : 'none'}; flex:1.4">
    <select class="nivel-select">
      ${[5,4,3,2,1].map(n => `<option value="${n}" ${n === (nivelInicial || 5) ? 'selected' : ''}>Nível ${n}</option>`).join('')}
    </select>
    ${principal ? '' : `<button type="button" class="remove-btn" onclick="document.getElementById('${id}').remove()">&times;</button>`}
  `;
  if (selecionarOutra) {
    row.querySelector('.posicao-select').style.display = 'none';
  }
  container.appendChild(row);
  row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function togglePosicaoCustom(selectEl) {
  const row = selectEl.closest('.posicao-row');
  const customInput = row.querySelector('.posicao-custom-input');
  if (selectEl.value === OUTRA_POSICAO) {
    selectEl.style.display = 'none';
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    selectEl.style.display = 'block';
  }
}

function getPosicaoRowValue(row) {
  const select = row.querySelector('.posicao-select');
  if (select.value === OUTRA_POSICAO) {
    return row.querySelector('.posicao-custom-input').value.trim().toLowerCase();
  }
  return select.value;
}

async function handleSalvarJogador() {
  const nome = document.getElementById('cadastro-nome').value.trim();
  if (!nome) {
    showToast('Digite o nome do jogador.');
    return;
  }

  const rows = document.querySelectorAll('#posicoes-container .posicao-row');
  const posicoesVistas = new Set();
  const posicoes = [];
  let temErro = false;

  rows.forEach((row, idx) => {
    const posicao = getPosicaoRowValue(row);
    const nivel = parseInt(row.querySelector('.nivel-select').value, 10);
    if (!posicao) {
      temErro = 'vazio';
      return;
    }
    if (posicoesVistas.has(posicao)) {
      temErro = 'duplicada';
      return;
    }
    posicoesVistas.add(posicao);
    posicoes.push({ posicao, nivel, principal: idx === 0 });
  });

  if (temErro === 'vazio') {
    showToast('Preencha o nome da posição personalizada.');
    return;
  }
  if (temErro === 'duplicada') {
    showToast('Não repita a mesma posição duas vezes.');
    return;
  }

  if (editingJogadorId) {
    const { error: errUpdate } = await supabaseClient
      .from('jogadores')
      .update({ nome })
      .eq('id', editingJogadorId);

    if (errUpdate) {
      showToast('Erro ao salvar alterações.');
      console.error(errUpdate);
      return;
    }

    const { error: errDelete } = await supabaseClient
      .from('jogador_posicoes')
      .delete()
      .eq('jogador_id', editingJogadorId);

    if (errDelete) {
      showToast('Erro ao atualizar posições.');
      console.error(errDelete);
      return;
    }

    const posicoesParaInserir = posicoes.map(p => ({ ...p, jogador_id: editingJogadorId }));
    const { error: errInsert } = await supabaseClient
      .from('jogador_posicoes')
      .insert(posicoesParaInserir);

    if (errInsert) {
      showToast('Alterações salvas, mas houve erro nas posições.');
      console.error(errInsert);
      return;
    }

    showToast('Alterações salvas!');
    goToElenco();
    return;
  }

  const { data: jogador, error: errJogador } = await supabaseClient
    .from('jogadores')
    .insert({ nome })
    .select()
    .single();

  if (errJogador) {
    showToast('Erro ao salvar o jogador.');
    console.error(errJogador);
    return;
  }

  const posicoesParaInserir = posicoes.map(p => ({ ...p, jogador_id: jogador.id }));
  const { error: errPosicoes } = await supabaseClient
    .from('jogador_posicoes')
    .insert(posicoesParaInserir);

  if (errPosicoes) {
    showToast('Jogador salvo, mas houve erro nas posições.');
    console.error(errPosicoes);
    return;
  }

  showToast('Jogador salvo! Pode cadastrar o próximo.');
  resetCadastroForm();
  document.getElementById('cadastro-nome').focus();
}

// ---------------- DIA DE JOGO ----------------

function hojeISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

async function goToDia() {
  showView('view-dia');
  setNavActive('nav-dia');
  await loadDia();
}

async function ensureSessaoHoje() {
  const hoje = hojeISO();

  const { data: existente, error: errBusca } = await supabaseClient
    .from('sessoes_jogo')
    .select('id, jogadores_por_time, data')
    .eq('data', hoje)
    .eq('status', 'aberta')
    .maybeSingle();

  if (errBusca) {
    console.error(errBusca);
    return null;
  }

  if (existente) return existente;

  const { data: nova, error: errCriar } = await supabaseClient
    .from('sessoes_jogo')
    .insert({ data: hoje, jogadores_por_time: 6, status: 'aberta' })
    .select('id, jogadores_por_time, data')
    .single();

  if (errCriar) {
    console.error(errCriar);
    return null;
  }
  return nova;
}

async function loadDia() {
  const sessao = await ensureSessaoHoje();
  if (!sessao) {
    showToast('Erro ao abrir o dia de jogo.');
    return;
  }
  currentSessaoId = sessao.id;

  const dataFormatada = new Date(sessao.data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long'
  });
  document.getElementById('dia-data').textContent = dataFormatada;

  const inputTime = document.getElementById('input-jogadores-time');
  inputTime.value = sessao.jogadores_por_time;

  const { data: jogadores, error: errJog } = await supabaseClient
    .from('jogadores')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome');

  const { data: checkins, error: errCheck } = await supabaseClient
    .from('checkins')
    .select('jogador_id, atrasado, status, horario_chegada')
    .eq('sessao_id', currentSessaoId);

  if (errJog || errCheck) {
    console.error(errJog || errCheck);
    showToast('Erro ao carregar os jogadores.');
    return;
  }

  const checkinMap = {};
  (checkins || []).forEach(c => { checkinMap[c.jogador_id] = c; });

  renderCheckinLists(jogadores || [], checkinMap);
}

function renderCheckinLists(jogadores, checkinMap) {
  const aguardandoEl = document.getElementById('lista-aguardando');
  const chegaramEl = document.getElementById('lista-chegaram');
  const atrasadosEl = document.getElementById('lista-atrasados');
  aguardandoEl.innerHTML = '';
  chegaramEl.innerHTML = '';
  atrasadosEl.innerHTML = '';

  const aguardando = [];
  const chegaram = [];
  const atrasados = [];

  jogadores.forEach(j => {
    const c = checkinMap[j.id];
    if (!c) { aguardando.push(j); return; }
    if (c.atrasado) atrasados.push({ ...j, horario: c.horario_chegada });
    else chegaram.push({ ...j, horario: c.horario_chegada });
  });

  chegaram.sort((a, b) => new Date(a.horario) - new Date(b.horario));
  atrasados.sort((a, b) => new Date(a.horario) - new Date(b.horario));

  if (aguardando.length === 0) {
    aguardandoEl.innerHTML = '<p class="empty-state">Todo mundo já fez check-in.</p>';
  } else {
    aguardando.forEach(j => {
      const row = document.createElement('div');
      row.className = 'checkin-card';
      row.innerHTML = `
        <div class="checkin-left">
          <div class="avatar-ring avatar-ring-sm"><div class="avatar-ring-inner">${getInitials(j.nome)}</div></div>
          <span class="player-name">${escapeHtml(j.nome)}</span>
        </div>
        <div class="checkin-actions">
          <button class="btn-chegou" onclick="fazerCheckin('${j.id}', false)">Chegou</button>
          <button class="btn-atrasado" onclick="fazerCheckin('${j.id}', true)">Atrasado</button>
        </div>
      `;
      aguardandoEl.appendChild(row);
    });
  }

  if (chegaram.length === 0) {
    chegaramEl.innerHTML = '<p class="empty-state">Ninguém chegou ainda.</p>';
  } else {
    chegaram.forEach(j => {
      const row = document.createElement('div');
      row.className = 'checkin-card';
      row.innerHTML = `
        <div class="checkin-left">
          <div class="avatar-ring avatar-ring-sm"><div class="avatar-ring-inner">${getInitials(j.nome)}</div></div>
          <span class="player-name">${escapeHtml(j.nome)}</span>
        </div>
        <div class="checkin-actions">
          <span class="badge-chegou">chegou</span>
          <button class="btn-remover-checkin" onclick="removerCheckin('${j.id}')">&times;</button>
        </div>
      `;
      chegaramEl.appendChild(row);
    });
  }

  if (atrasados.length === 0) {
    atrasadosEl.innerHTML = '<p class="empty-state">Nenhum atrasado por enquanto.</p>';
  } else {
    atrasados.forEach(j => {
      const row = document.createElement('div');
      row.className = 'checkin-card';
      row.innerHTML = `
        <div class="checkin-left">
          <div class="avatar-ring avatar-ring-sm"><div class="avatar-ring-inner">${getInitials(j.nome)}</div></div>
          <span class="player-name">${escapeHtml(j.nome)}</span>
        </div>
        <div class="checkin-actions">
          <span class="badge-atrasado">atrasado</span>
          <button class="btn-remover-checkin" onclick="removerCheckin('${j.id}')">&times;</button>
        </div>
      `;
      atrasadosEl.appendChild(row);
    });
  }
}

async function fazerCheckin(jogadorId, atrasado) {
  const { error } = await supabaseClient
    .from('checkins')
    .insert({
      sessao_id: currentSessaoId,
      jogador_id: jogadorId,
      atrasado: atrasado,
      status: 'disponivel'
    });

  if (error) {
    console.error(error);
    showToast('Erro ao registrar chegada.');
    return;
  }
  loadDia();
}

async function removerCheckin(jogadorId) {
  const { error } = await supabaseClient
    .from('checkins')
    .delete()
    .eq('sessao_id', currentSessaoId)
    .eq('jogador_id', jogadorId);

  if (error) {
    console.error(error);
    showToast('Erro ao desfazer check-in.');
    return;
  }
  loadDia();
}

async function handleJogadoresPorTimeChange() {
  const valor = parseInt(document.getElementById('input-jogadores-time').value, 10);
  if (!valor || valor < 2) return;

  const { error } = await supabaseClient
    .from('sessoes_jogo')
    .update({ jogadores_por_time: valor })
    .eq('id', currentSessaoId);

  if (error) {
    console.error(error);
    showToast('Erro ao salvar quantidade por time.');
  }
}

// ---------------- INIT ----------------

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`Elemento #${id} não encontrado (index.html desatualizado?).`);
    return;
  }
  el.addEventListener(event, handler);
  console.log(`[init] listener registrado em #${id}`);
}

on('login-form', 'submit', handleLogin);
on('logout-btn', 'click', handleLogout);
on('nav-elenco', 'click', goToElenco);
on('nav-cadastro', 'click', goToCadastro);
on('nav-dia', 'click', goToDia);
on('input-jogadores-time', 'change', handleJogadoresPorTimeChange);
on('btn-add-posicao', 'click', () => addPosicaoRow(false));
on('btn-salvar-jogador', 'click', handleSalvarJogador);

checkSession();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
