// Rachômetro - app.js
let posicaoCounter = 0;

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
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) {
    showScreen('app-screen');
    goToElenco();
  } else {
    showScreen('login-screen');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
  if (error) {
    errorEl.textContent = 'Não foi possível entrar. Confira o email e a senha.';
    return;
  }
  showScreen('app-screen');
  goToElenco();
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

// ---------------- INIT ----------------

document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('logout-btn').addEventListener('click', handleLogout);
document.getElementById('nav-elenco').addEventListener('click', goToElenco);
document.getElementById('nav-cadastro').addEventListener('click', goToCadastro);
document.getElementById('btn-add-posicao').addEventListener('click', () => addPosicaoRow(false));
document.getElementById('btn-salvar-jogador').addEventListener('click', handleSalvarJogador);

checkSession();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
