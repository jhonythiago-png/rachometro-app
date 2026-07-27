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

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  try {
    if (!window.supabase || !supabaseClient) {
      errorEl.textContent = 'Erro ao carregar a biblioteca do Supabase. Recarregue a página.';
      return;
    }
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    if (error) {
      errorEl.textContent = 'Não foi possível entrar: ' + error.message;
      return;
    }
    showScreen('app-screen');
    goToElenco();
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Erro inesperado: ' + err.message;
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  showScreen('login-screen');
}

// ---------------- ELENCO ----------------

function goToElenco() {
  showScreen('view-elenco');
  setNavActive('nav-elenco');
  document.getElementById('fab-add').style.display = 'none';
  loadElenco();
}

async function loadElenco() {
  const listEl = document.getElementById('lista-elenco');
  listEl.innerHTML = '<p class="empty-state">Carregando elenco...</p>';

  const { data: jogadores, error } = await supabaseClient
    .from('jogadores')
    .select('id, nome, ativo, jogador_posicoes(posicao, nivel, principal)')
    .eq('ativo', true)
    .order('nome');

  if (error) {
    listEl.innerHTML = '<p class="empty-state">Erro ao carregar o elenco.</p>';
    console.error(error);
    return;
  }

  if (!jogadores || jogadores.length === 0) {
    listEl.innerHTML = '<p class="empty-state">Nenhum jogador cadastrado ainda.<br>Toque no + para adicionar o primeiro.</p>';
    return;
  }

  listEl.innerHTML = '';
  jogadores.forEach(j => {
    const posicoes = (j.jogador_posicoes || [])
      .sort((a, b) => (b.principal === true) - (a.principal === true))
      .map(p => `${p.posicao} (nível ${p.nivel})`)
      .join(' · ');

    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <div>
        <div class="player-name">${escapeHtml(j.nome)}</div>
        <div class="player-meta">${posicoes || 'sem posição cadastrada'}</div>
      </div>
    `;
    listEl.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------------- CADASTRO ----------------

const POSICOES = ['goleiro', 'zagueiro', 'meio-campo', 'atacante'];

function goToCadastro() {
  showScreen('view-cadastro');
  setNavActive('nav-cadastro');
  document.getElementById('fab-add').style.display = 'none';
  resetCadastroForm();
}

function resetCadastroForm() {
  document.getElementById('cadastro-nome').value = '';
  const container = document.getElementById('posicoes-container');
  container.innerHTML = '';
  posicaoCounter = 0;
  addPosicaoRow(true);
}

function addPosicaoRow(principal = false) {
  posicaoCounter++;
  const id = `posicao-row-${posicaoCounter}`;
  const container = document.getElementById('posicoes-container');

  const row = document.createElement('div');
  row.className = 'posicao-row';
  row.id = id;
  row.innerHTML = `
    <select class="posicao-select">
      ${POSICOES.map(p => `<option value="${p}">${capitalize(p)}</option>`).join('')}
    </select>
    <select class="nivel-select">
      ${[5,4,3,2,1].map(n => `<option value="${n}">Nível ${n}</option>`).join('')}
    </select>
    ${principal ? '' : `<button type="button" class="remove-btn" onclick="document.getElementById('${id}').remove()">&times;</button>`}
  `;
  container.appendChild(row);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
    const posicao = row.querySelector('.posicao-select').value;
    const nivel = parseInt(row.querySelector('.nivel-select').value, 10);
    if (posicoesVistas.has(posicao)) {
      temErro = true;
      return;
    }
    posicoesVistas.add(posicao);
    posicoes.push({ posicao, nivel, principal: idx === 0 });
  });

  if (temErro) {
    showToast('Não repita a mesma posição duas vezes.');
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

  showToast('Jogador salvo!');
  goToElenco();
}

// ---------------- DIA DE JOGO ----------------

function hojeISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

async function goToDia() {
  showScreen('view-dia');
  setNavActive('nav-dia');
  document.getElementById('fab-add').style.display = 'none';
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
      row.className = 'checkin-row';
      row.innerHTML = `
        <span class="player-name">${escapeHtml(j.nome)}</span>
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
      row.className = 'checkin-row';
      row.innerHTML = `
        <span class="player-name">${escapeHtml(j.nome)}</span>
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
      row.className = 'checkin-row';
      row.innerHTML = `
        <span class="player-name">${escapeHtml(j.nome)}</span>
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

document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('logout-btn').addEventListener('click', handleLogout);
document.getElementById('nav-elenco').addEventListener('click', goToElenco);
document.getElementById('nav-cadastro').addEventListener('click', goToCadastro);
document.getElementById('nav-dia').addEventListener('click', goToDia);
document.getElementById('input-jogadores-time').addEventListener('change', handleJogadoresPorTimeChange);
document.getElementById('btn-add-posicao').addEventListener('click', () => addPosicaoRow(false));
document.getElementById('btn-salvar-jogador').addEventListener('click', handleSalvarJogador);

checkSession();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
