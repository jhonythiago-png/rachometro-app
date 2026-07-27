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
    document.getElementById('elenco-titulo').textContent = 'Elenco';
    listEl.innerHTML = '<p class="empty-state">Nenhum jogador cadastrado ainda.<br>Toque em "Cadastrar" para adicionar o primeiro.</p>';
    return;
  }

  document.getElementById('elenco-titulo').textContent = `Elenco (${jogadores.length})`;

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
    .select('id, jogadores_por_time, data, modo_selecao')
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
    .select('id, jogadores_por_time, data, modo_selecao')
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

  const selectModo = document.getElementById('select-modo-selecao');
  selectModo.value = sessao.modo_selecao || 'ordem_chegada';

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

async function handleModoSelecaoChange() {
  const valor = document.getElementById('select-modo-selecao').value;

  const { error } = await supabaseClient
    .from('sessoes_jogo')
    .update({ modo_selecao: valor })
    .eq('id', currentSessaoId);

  if (error) {
    console.error(error);
    showToast('Erro ao salvar o modo de seleção.');
    return;
  }
  showToast(valor === 'aleatorio' ? 'Agora sorteia aleatório entre quem chegou no horário.' : 'Voltou pra ordem de chegada.');
}

// ---------------- HISTÓRICO ----------------

async function goToHistorico() {
  showView('view-historico');
  setNavActive('nav-historico');
  await loadHistorico();
}

async function loadHistorico() {
  const container = document.getElementById('historico-lista');
  container.innerHTML = '<p class="empty-state">Carregando histórico...</p>';

  const { data: sessoes, error } = await supabaseClient
    .from('sessoes_jogo')
    .select('id, data')
    .order('data', { ascending: false })
    .limit(30);

  if (error) {
    console.error(error);
    container.innerHTML = '<p class="empty-state">Erro ao carregar o histórico.</p>';
    return;
  }

  if (!sessoes || sessoes.length === 0) {
    container.innerHTML = '<p class="empty-state">Nenhum dia de jogo registrado ainda.</p>';
    return;
  }

  container.innerHTML = '';

  for (const sessao of sessoes) {
    const { data: partidas } = await supabaseClient
      .from('partidas')
      .select('id, numero')
      .eq('sessao_id', sessao.id)
      .order('numero');

    const dataFormatada = new Date(sessao.data + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    const bloco = document.createElement('div');
    bloco.className = 'historico-dia';

    let conteudoPartidas = '';
    if (!partidas || partidas.length === 0) {
      conteudoPartidas = '<p class="empty-state">Nenhuma partida sorteada nesse dia.</p>';
    } else {
      for (const partida of partidas) {
        const { data: times } = await supabaseClient
          .from('partida_times')
          .select('time, posicao, jogadores(nome)')
          .eq('partida_id', partida.id);

        const teamA = (times || []).filter(t => t.time === 'A' && t.jogadores);
        const teamB = (times || []).filter(t => t.time === 'B' && t.jogadores);

        const listar = (time) => time
          .map(t => `<div class="historico-jogador">${escapeHtml(t.jogadores.nome)}${t.posicao ? ' · ' + formatPosicaoLabel(t.posicao) : ''}</div>`)
          .join('') || '<div class="historico-jogador">—</div>';

        conteudoPartidas += `
          <div class="historico-partida">
            <div class="historico-partida-titulo">${partida.numero}º jogo</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
              <div>
                <div class="team-header team-header-a" style="margin-bottom:6px">Laranja</div>
                ${listar(teamA)}
              </div>
              <div>
                <div class="team-header team-header-b" style="margin-bottom:6px">Azul</div>
                ${listar(teamB)}
              </div>
            </div>
          </div>
        `;
      }
    }

    bloco.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid var(--border-strong)">
        <div class="historico-dia-titulo" style="border:none; padding:0; margin:0">${dataFormatada}</div>
        <button type="button" class="btn-ghost" style="padding:5px 10px; font-size:11px; color:var(--magenta); border-color:var(--magenta)" onclick="handleExcluirDia('${sessao.id}', '${dataFormatada}')">Excluir dia</button>
      </div>
      ${conteudoPartidas}
    `;
    container.appendChild(bloco);
  }
}

async function handleExcluirDia(sessaoId, dataFormatada) {
  if (!confirm(`Excluir todo o histórico de ${dataFormatada}? Isso apaga as partidas, os check-ins e não pode ser desfeito.`)) {
    return;
  }

  const { error } = await supabaseClient
    .from('sessoes_jogo')
    .delete()
    .eq('id', sessaoId);

  if (error) {
    console.error(error);
    showToast('Erro ao excluir esse dia.');
    return;
  }

  showToast('Dia excluído.');
  await loadHistorico();
}

// ---------------- SORTEIO ----------------

const PESO_REPETICAO = 0.75;
const JANELA_DIAS_ANTI_REPETICAO = 28;

let sorteioState = { partidaId: null, numero: 1, timeA: [], timeB: [] };

async function goToSorteio() {
  showView('view-sorteio');
  setNavActive('nav-sorteio');
  await loadSorteio();
}

async function loadSorteio() {
  const sessao = await ensureSessaoHoje();
  if (!sessao) {
    showToast('Erro ao abrir o dia de jogo.');
    return;
  }
  currentSessaoId = sessao.id;

  const { data: partidas, error: errPartidas } = await supabaseClient
    .from('partidas')
    .select('id, numero')
    .eq('sessao_id', currentSessaoId)
    .order('numero', { ascending: false })
    .limit(1);

  if (errPartidas) {
    console.error(errPartidas);
    showToast('Erro ao carregar o sorteio.');
    return;
  }

  const ultimaPartida = partidas && partidas[0];

  if (ultimaPartida) {
    const { data: times, error: errTimes } = await supabaseClient
      .from('partida_times')
      .select('time, jogador_id, posicao, jogadores(id, nome, jogador_posicoes(posicao, nivel, principal))')
      .eq('partida_id', ultimaPartida.id);

    if (errTimes) {
      console.error(errTimes);
      showToast('Erro ao carregar os times.');
      return;
    }

    const paraJogador = (row) => {
      const base = montarJogadorComNivel(row.jogadores);
      if (row.posicao) {
        const posEncontrada = base.posicoesTodas.find(p => p.posicao === row.posicao);
        base.posicaoSlot = formatPosicaoLabel(row.posicao);
        base.nivelSlot = posEncontrada ? posEncontrada.nivel : base.nivel;
        base.posicaoJogada = row.posicao;
      }
      return base;
    };
    sorteioState.partidaId = ultimaPartida.id;
    sorteioState.numero = ultimaPartida.numero;
    sorteioState.timeA = (times || []).filter(t => t.time === 'A').map(paraJogador);
    sorteioState.timeB = (times || []).filter(t => t.time === 'B').map(paraJogador);

    renderSorteio();
  } else {
    sorteioState = { partidaId: null, numero: 1, timeA: [], timeB: [] };
    document.getElementById('sorteio-titulo').textContent = 'Sorteio — 1º jogo';
    document.getElementById('sorteio-times').style.display = 'none';
    document.getElementById('btn-sortear').style.display = 'block';
    document.getElementById('btn-sortear').textContent = 'Sortear times';
    document.getElementById('btn-nova-partida').style.display = 'none';
  }

  await atualizarContadorDisponiveis();
  await carregarJaJogaram();
}

function montarJogadorComNivel(jogador) {
  const posicoes = jogador.jogador_posicoes || [];
  const principal = posicoes.find(p => p.principal) || posicoes[0];
  return {
    id: jogador.id,
    nome: jogador.nome,
    nivel: principal ? principal.nivel : 3,
    posicaoLabel: principal ? formatPosicaoLabel(principal.posicao) : 'sem posição',
    posicaoPrincipal: principal ? principal.posicao : null,
    posicoesTodas: posicoes.map(p => ({ posicao: p.posicao, nivel: p.nivel }))
  };
}

async function atualizarContadorDisponiveis() {
  const { data: sessao } = await supabaseClient
    .from('sessoes_jogo')
    .select('jogadores_por_time')
    .eq('id', currentSessaoId)
    .single();
  const porTime = (sessao && sessao.jogadores_por_time) || 6;
  const necessario = porTime * 2;

  const { data: disponiveis, error } = await supabaseClient
    .from('checkins')
    .select('jogador_id, atrasado, horario_chegada, jogadores(nome)')
    .eq('sessao_id', currentSessaoId)
    .eq('status', 'disponivel')
    .order('atrasado', { ascending: true })
    .order('horario_chegada', { ascending: true });

  const banner = document.getElementById('sorteio-status-banner');
  const lista = document.getElementById('sorteio-lista-disponiveis');

  if (error || !disponiveis) {
    banner.innerHTML = '';
    lista.innerHTML = '';
    return;
  }

  const total = disponiveis.length;
  const ehPrimeiraPartida = sorteioState.numero <= 1 && !sorteioState.partidaId;

  if (total === 0) {
    banner.innerHTML = `<div class="status-banner falta">Nenhum jogador disponível ainda. Volte em "Dia de jogo" e faça o check-in de quem chegou.</div>`;
  } else if (total >= necessario) {
    banner.innerHTML = `<div class="status-banner ok">${total} disponíveis — dá pra fechar os dois times (precisa de ${necessario}).</div>`;
  } else {
    const faltam = necessario - total;
    banner.innerHTML = `<div class="status-banner falta">Só ${total} disponíveis — faltam ${faltam} pro próximo jogo. Reative alguém em "Já jogaram" abaixo, ou aguarde mais chegadas.</div>`;
  }

  lista.innerHTML = '';
  if (total > 0) {
    const titulo = document.createElement('div');
    titulo.className = 'section-title';
    titulo.textContent = `Disponíveis para o próximo sorteio (${total})`;
    lista.appendChild(titulo);

    disponiveis.forEach(c => {
      const nome = c.jogadores ? c.jogadores.nome : '—';
      let badge = '';
      if (c.atrasado) {
        badge = '<span class="badge-atrasado">atrasado</span>';
      } else if (!ehPrimeiraPartida) {
        badge = '<span class="badge-sobra">sobrou do jogo anterior</span>';
      }
      const row = document.createElement('div');
      row.className = 'disponivel-row';
      row.innerHTML = `<span>${escapeHtml(nome)}</span>${badge}`;
      lista.appendChild(row);
    });
  }
}

async function carregarJaJogaram() {
  const { data, error } = await supabaseClient
    .from('checkins')
    .select('jogador_id, jogadores(id, nome)')
    .eq('sessao_id', currentSessaoId)
    .eq('status', 'jogou');

  const section = document.getElementById('ja-jogaram-section');
  const lista = document.getElementById('lista-ja-jogaram');

  if (error || !data || data.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  lista.innerHTML = '';
  data.forEach(row => {
    const j = row.jogadores;
    if (!j) return;
    const card = document.createElement('div');
    card.className = 'checkin-card';
    card.innerHTML = `
      <div class="checkin-left">
        <div class="avatar-ring avatar-ring-sm"><div class="avatar-ring-inner">${getInitials(j.nome)}</div></div>
        <span class="player-name">${escapeHtml(j.nome)}</span>
      </div>
      <button class="btn-chegou" onclick="reativarJogador('${j.id}')">Reativar</button>
    `;
    lista.appendChild(card);
  });
}

async function reativarJogador(jogadorId) {
  const { error } = await supabaseClient
    .from('checkins')
    .update({ status: 'disponivel' })
    .eq('sessao_id', currentSessaoId)
    .eq('jogador_id', jogadorId);

  if (error) {
    console.error(error);
    showToast('Erro ao reativar jogador.');
    return;
  }
  showToast('Jogador reativado — já entra no próximo sorteio.');
  await atualizarContadorDisponiveis();
  await carregarJaJogaram();
}

async function handleSortear() {
  console.log('[sorteio] botão clicado');
  console.log('[sorteio] currentSessaoId:', currentSessaoId);

  const { data: sessao, error: errSessao } = await supabaseClient
    .from('sessoes_jogo')
    .select('jogadores_por_time, modo_selecao')
    .eq('id', currentSessaoId)
    .single();
  console.log('[sorteio] sessao:', sessao, errSessao);
  const porTime = (sessao && sessao.jogadores_por_time) || 6;
  const modoSelecao = (sessao && sessao.modo_selecao) || 'ordem_chegada';
  const necessario = porTime * 2;
  console.log('[sorteio] porTime:', porTime, 'necessario:', necessario, 'modo:', modoSelecao);

  let partidaId = sorteioState.partidaId;
  console.log('[sorteio] sorteioState atual:', JSON.stringify(sorteioState));

  if (partidaId) {
    console.log('[sorteio] regerando partida existente', partidaId);
    const idsAnteriores = [...sorteioState.timeA, ...sorteioState.timeB].map(j => j.id);
    await supabaseClient.from('historico_parcerias').delete().eq('partida_id', partidaId);
    await supabaseClient.from('partida_times').delete().eq('partida_id', partidaId);
    if (idsAnteriores.length > 0) {
      await supabaseClient
        .from('checkins')
        .update({ status: 'disponivel' })
        .eq('sessao_id', currentSessaoId)
        .in('jogador_id', idsAnteriores);
    }
  }

  const { data: checkins, error } = await supabaseClient
    .from('checkins')
    .select('jogador_id, atrasado, horario_chegada, jogadores(id, nome, ativo, jogador_posicoes(posicao, nivel, principal))')
    .eq('sessao_id', currentSessaoId)
    .eq('status', 'disponivel')
    .order('atrasado', { ascending: true })
    .order('horario_chegada', { ascending: true });

  console.log('[sorteio] checkins disponiveis:', checkins, error);

  if (error) {
    console.error('[sorteio] erro ao buscar checkins', error);
    showToast('Erro ao buscar jogadores disponíveis: ' + error.message);
    return;
  }

  const candidatosComAtraso = (checkins || [])
    .filter(c => c.jogadores && c.jogadores.ativo)
    .map(c => ({ ...montarJogadorComNivel(c.jogadores), atrasado: c.atrasado }));

  let naoAtrasados = candidatosComAtraso.filter(c => !c.atrasado);
  let atrasados = candidatosComAtraso.filter(c => c.atrasado);

  if (modoSelecao === 'aleatorio') {
    naoAtrasados = embaralhar(naoAtrasados);
    atrasados = embaralhar(atrasados);
  }

  const candidatos = [...naoAtrasados, ...atrasados];
  console.log('[sorteio] candidatos montados:', candidatos.length, 'modo:', modoSelecao);

  if (candidatos.length < 2) {
    console.log('[sorteio] candidatos insuficientes');
    showToast('Não há jogadores suficientes disponíveis ainda.');
    return;
  }

  let selecionados = candidatos.slice(0, necessario);
  if (selecionados.length % 2 !== 0) selecionados.pop();
  console.log('[sorteio] selecionados:', selecionados.length);

  const parceriaMap = await buscarHistoricoParcerias(selecionados.map(s => s.id));
  console.log('[sorteio] parceriaMap tamanho:', parceriaMap.size);
  const { teamA, teamB } = montarTimes(selecionados, parceriaMap, porTime);
  console.log('[sorteio] teamA:', teamA.length, 'teamB:', teamB.length);

  let repetidas = 0;
  [teamA, teamB].forEach(time => {
    for (let i = 0; i < time.length; i++) {
      for (let j = i + 1; j < time.length; j++) {
        const key = [time[i].id, time[j].id].sort().join('_');
        if (parceriaMap.get(key)) repetidas++;
      }
    }
  });

  if (!partidaId) {
    console.log('[sorteio] criando nova partida numero', sorteioState.numero);
    const { data: partida, error: errPartida } = await supabaseClient
      .from('partidas')
      .insert({ sessao_id: currentSessaoId, numero: sorteioState.numero })
      .select()
      .single();

    console.log('[sorteio] resultado insert partida:', partida, errPartida);

    if (errPartida) {
      if (errPartida.code === '23505') {
        const { data: existente } = await supabaseClient
          .from('partidas')
          .select('id')
          .eq('sessao_id', currentSessaoId)
          .eq('numero', sorteioState.numero)
          .single();
        if (existente) {
          partidaId = existente.id;
        } else {
          showToast('Erro ao criar a partida: ' + errPartida.message);
          return;
        }
      } else {
        console.error(errPartida);
        showToast('Erro ao criar a partida: ' + errPartida.message);
        return;
      }
    } else {
      partidaId = partida.id;
    }
  }

  const posicaoSalva = (j) => j.posicaoJogada || null;
  const linhasTimes = [
    ...teamA.map(j => ({ partida_id: partidaId, time: 'A', jogador_id: j.id, posicao: posicaoSalva(j) })),
    ...teamB.map(j => ({ partida_id: partidaId, time: 'B', jogador_id: j.id, posicao: posicaoSalva(j) })),
  ];
  const { error: errLinhas } = await supabaseClient.from('partida_times').insert(linhasTimes);
  if (errLinhas) {
    console.error(errLinhas);
    showToast('Erro ao salvar os times: ' + errLinhas.message);
    return;
  }

  const parceriasParaGravar = [];
  [teamA, teamB].forEach(time => {
    for (let i = 0; i < time.length; i++) {
      for (let j = i + 1; j < time.length; j++) {
        const [a, b] = [time[i].id, time[j].id].sort();
        parceriasParaGravar.push({ jogador_a_id: a, jogador_b_id: b, partida_id: partidaId });
      }
    }
  });
  if (parceriasParaGravar.length > 0) {
    await supabaseClient.from('historico_parcerias').insert(parceriasParaGravar);
  }

  const idsEscalados = selecionados.map(s => s.id);
  await supabaseClient
    .from('checkins')
    .update({ status: 'jogou' })
    .eq('sessao_id', currentSessaoId)
    .in('jogador_id', idsEscalados);

  sorteioState = { partidaId, numero: sorteioState.numero, timeA: teamA, timeB: teamB, repetidas };
  console.log('[sorteio] concluído com sucesso', sorteioState);
  renderSorteio();
  await atualizarContadorDisponiveis();
  await carregarJaJogaram();
  showToast('Times sorteados!');
}

async function buscarHistoricoParcerias(idsCandidatos) {
  const desde = new Date();
  desde.setDate(desde.getDate() - JANELA_DIAS_ANTI_REPETICAO);

  const { data, error } = await supabaseClient
    .from('historico_parcerias')
    .select('jogador_a_id, jogador_b_id')
    .gte('criado_em', desde.toISOString())
    .or(`jogador_a_id.in.(${idsCandidatos.join(',')}),jogador_b_id.in.(${idsCandidatos.join(',')})`);

  const mapa = new Map();
  if (error) {
    console.error(error);
    return mapa;
  }
  (data || []).forEach(row => {
    const key = [row.jogador_a_id, row.jogador_b_id].sort().join('_');
    mapa.set(key, (mapa.get(key) || 0) + 1);
  });
  return mapa;
}

const SLOTS_UNICOS = [
  'goleiro', 'zagueiro', 'cabeca-de-area', 'meio-campo',
  'lateral-esquerda', 'lateral-direita', 'centroavante'
];

function penalidadeRepeticao(candidato, time, parceriaMap) {
  let total = 0;
  time.forEach(t => {
    const key = [candidato.id, t.id].sort().join('_');
    total += (parceriaMap.get(key) || 0) * PESO_REPETICAO;
  });
  return total;
}

function montarTimes(selecionadosOriginais, parceriaMap, porTime) {
  if (porTime !== 8) {
    return balancearTimes(selecionadosOriginais, parceriaMap);
  }

  const selecionados = selecionadosOriginais.map((j, idx) => ({ ...j, ordem: idx }));
  let pool = [...selecionados];
  const teamA = [];
  const teamB = [];
  let somaA = 0, somaB = 0;

  // quantas vagas de cada posição CADA time precisa (meio-campo tem 2)
  const necessidade = { A: {}, B: {} };
  SLOTS_UNICOS.forEach(slot => {
    const qtd = slot === 'meio-campo' ? 2 : 1;
    necessidade.A[slot] = qtd;
    necessidade.B[slot] = qtd;
  });

  function elegiveisPara(slot) {
    return pool
      .map(j => {
        const posSlot = j.posicoesTodas.find(p => p.posicao === slot);
        return posSlot ? { jogador: j, nivelComRuido: posSlot.nivel + Math.random() * 0.4, nivelSlot: posSlot.nivel } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.nivelComRuido - a.nivelComRuido || a.jogador.ordem - b.jogador.ordem);
  }

  function atribuir(jogador, nivelSlot, slot, time) {
    const jogadorComSlot = { ...jogador, posicaoSlot: formatPosicaoLabel(slot), posicaoJogada: slot, nivelSlot };
    if (time === 'A') { teamA.push(jogadorComSlot); somaA += nivelSlot; }
    else { teamB.push(jogadorComSlot); somaB += nivelSlot; }
    necessidade[time][slot]--;
    pool = pool.filter(p => p.id !== jogador.id);
  }

  // processa primeiro as posições mais raras no grupo de hoje, pra quem tem
  // múltiplas posições não ser "roubado" cedo por uma posição mais comum
  function contarElegiveisNoPool(slot) {
    return pool.filter(j => j.posicoesTodas.some(p => p.posicao === slot)).length;
  }
  const slotsOrdenados = [...SLOTS_UNICOS].sort((a, b) => contarElegiveisNoPool(a) - contarElegiveisNoPool(b));

  slotsOrdenados.forEach(slot => {
    const vezes = slot === 'meio-campo' ? 2 : 1;
    for (let v = 0; v < vezes; v++) {
      // o time que está mais atrás na soma de nível tem prioridade de escolha nessa vaga
      const ordemTimes = somaA <= somaB ? ['A', 'B'] : ['B', 'A'];
      ordemTimes.forEach(time => {
        if (necessidade[time][slot] <= 0) return;
        const elegiveis = elegiveisPara(slot);
        if (elegiveis.length === 0) return;
        const escolhido = elegiveis[0];
        atribuir(escolhido.jogador, escolhido.nivelSlot, slot, time);
      });
    }
  });

  // segunda tentativa: pra quem ainda tem vaga faltando, procura de novo no que sobrou
  // (cobre o caso de alguém que só ficou livre depois de outra posição ser preenchida)
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (const time of ['A', 'B']) {
      for (const slot of SLOTS_UNICOS) {
        if (necessidade[time][slot] <= 0) continue;
        const elegiveis = elegiveisPara(slot);
        if (elegiveis.length === 0) continue;
        const escolhido = elegiveis[0];
        atribuir(escolhido.jogador, escolhido.nivelSlot, slot, time);
        mudou = true;
      }
    }
  }

  // sobra de verdade (ninguém no grupo tem a posição que falta) preenche por nível geral
  pool
    .sort((a, b) => b.nivel - a.nivel)
    .forEach(jOriginal => {
      if (teamA.length >= porTime && teamB.length >= porTime) return;
      const j = { ...jOriginal, posicaoJogada: jOriginal.posicaoPrincipal };
      const custoA = somaA + j.nivel + penalidadeRepeticao(j, teamA, parceriaMap);
      const custoB = somaB + j.nivel + penalidadeRepeticao(j, teamB, parceriaMap);
      if (teamA.length < porTime && (teamB.length >= porTime || custoA <= custoB)) {
        teamA.push(j); somaA += j.nivel;
      } else if (teamB.length < porTime) {
        teamB.push(j); somaB += j.nivel;
      }
    });

  return { teamA, teamB };
}

function embaralhar(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function balancearTimes(jogadores, parceriaMap) {
  const ordenados = embaralhar(jogadores).sort((a, b) => b.nivel - a.nivel);
  const teamA = [];
  const teamB = [];
  let somaA = 0;
  let somaB = 0;

  function penalidade(candidato, time) {
    let total = 0;
    time.forEach(t => {
      const key = [candidato.id, t.id].sort().join('_');
      total += (parceriaMap.get(key) || 0) * PESO_REPETICAO;
    });
    return total;
  }

  ordenados.forEach(pOriginal => {
    const p = { ...pOriginal, posicaoJogada: pOriginal.posicaoPrincipal };
    const custoA = somaA + p.nivel + penalidade(p, teamA) + Math.random() * 0.3;
    const custoB = somaB + p.nivel + penalidade(p, teamB) + Math.random() * 0.3;
    if (custoA < custoB || (custoA === custoB && teamA.length <= teamB.length)) {
      teamA.push(p); somaA += p.nivel;
    } else {
      teamB.push(p); somaB += p.nivel;
    }
  });

  return { teamA, teamB };
}

function renderSorteio() {
  document.getElementById('sorteio-titulo').textContent = `Sorteio — ${sorteioState.numero}º jogo`;
  document.getElementById('sorteio-times').style.display = 'block';
  document.getElementById('btn-sortear').textContent = 'Sortear novamente';
  document.getElementById('btn-nova-partida').style.display = 'block';

  renderTimeColuna('time-a-lista', 'time-a-media', sorteioState.timeA, 'A');
  renderTimeColuna('time-b-lista', 'time-b-media', sorteioState.timeB, 'B');

  const totalRepeticoes = sorteioState.repetidas;
  const msgEl = document.getElementById('sorteio-anti-repeticao');
  if (totalRepeticoes === undefined || totalRepeticoes === null) {
    msgEl.textContent = '';
  } else if (totalRepeticoes === 0) {
    msgEl.innerHTML = '<i class="ti ti-refresh" style="font-size:12px; vertical-align:-1px; margin-right:3px"></i>Nenhuma dupla repetida das últimas semanas';
  } else {
    msgEl.textContent = `${totalRepeticoes} dupla(s) já jogaram juntas recentemente (inevitável com o grupo de hoje)`;
  }
}

const ORDEM_EXIBICAO_FORMACAO = [
  'goleiro', 'zagueiro', 'cabeca-de-area', 'meio-campo',
  'lateral-esquerda', 'lateral-direita', 'centroavante'
];

function ordenarPorFormacao(time) {
  return [...time].sort((a, b) => {
    const slugA = a.posicaoJogada || a.posicaoPrincipal || '';
    const slugB = b.posicaoJogada || b.posicaoPrincipal || '';
    let idxA = ORDEM_EXIBICAO_FORMACAO.indexOf(slugA);
    let idxB = ORDEM_EXIBICAO_FORMACAO.indexOf(slugB);
    if (idxA === -1) idxA = 99;
    if (idxB === -1) idxB = 99;
    return idxA - idxB;
  });
}

function renderTimeColuna(listaId, mediaId, timeOriginal, letra) {
  const el = document.getElementById(listaId);
  el.innerHTML = '';
  const time = ordenarPorFormacao(timeOriginal);
  const media = time.length ? (time.reduce((s, j) => s + j.nivel, 0) / time.length).toFixed(1) : '0.0';
  document.getElementById(mediaId).textContent = `média ${media}`;

  time.forEach(j => {
    const row = document.createElement('div');
    row.className = 'team-player';
    row.onclick = () => trocarJogadorDeTime(j.id, letra);
    row.innerHTML = `
      <div class="avatar-ring"><div class="avatar-ring-inner">${getInitials(j.nome)}</div></div>
      <div class="team-player-info">
        <div class="team-player-name">${escapeHtml(j.nome)}</div>
        <div class="team-player-meta">${j.posicaoSlot || j.posicaoLabel} · nível ${j.nivelSlot ?? j.nivel}</div>
      </div>
    `;
    el.appendChild(row);
  });
}

async function trocarJogadorDeTime(jogadorId, timeAtual) {
  const origem = timeAtual === 'A' ? sorteioState.timeA : sorteioState.timeB;
  const jogador = origem.find(j => j.id === jogadorId);
  if (!jogador) return;

  const nomeTimeDestino = timeAtual === 'A' ? 'azul' : 'laranja';
  if (!confirm(`Mover ${jogador.nome} para o time ${nomeTimeDestino}?`)) {
    return;
  }

  const destino = timeAtual === 'A' ? sorteioState.timeB : sorteioState.timeA;
  const idx = origem.findIndex(j => j.id === jogadorId);
  const [jogadorMovido] = origem.splice(idx, 1);
  destino.push(jogadorMovido);

  renderSorteio();

  const novoTime = timeAtual === 'A' ? 'B' : 'A';
  const { error } = await supabaseClient
    .from('partida_times')
    .update({ time: novoTime })
    .eq('partida_id', sorteioState.partidaId)
    .eq('jogador_id', jogadorId);

  if (error) {
    console.error(error);
    showToast('Erro ao mover jogador (mudança pode não ter salvo).');
  }
}

async function handleNovaPartida() {
  sorteioState = { partidaId: null, numero: sorteioState.numero + 1, timeA: [], timeB: [] };
  document.getElementById('sorteio-titulo').textContent = `Sorteio — ${sorteioState.numero}º jogo`;
  document.getElementById('sorteio-times').style.display = 'none';
  document.getElementById('btn-sortear').style.display = 'block';
  document.getElementById('btn-sortear').textContent = 'Sortear times';
  document.getElementById('btn-nova-partida').style.display = 'none';
  await atualizarContadorDisponiveis();
}

async function handleResetarSorteio() {
  if (!confirm('Reiniciar o sorteio de hoje? Isso apaga todas as partidas já sorteadas hoje e libera todo mundo de volta pra "disponível". O check-in de quem chegou continua valendo.')) {
    return;
  }

  const { error: errDelete } = await supabaseClient
    .from('partidas')
    .delete()
    .eq('sessao_id', currentSessaoId);

  if (errDelete) {
    console.error(errDelete);
    showToast('Erro ao reiniciar o sorteio.');
    return;
  }

  const { error: errCheckins } = await supabaseClient
    .from('checkins')
    .update({ status: 'disponivel' })
    .eq('sessao_id', currentSessaoId);

  if (errCheckins) {
    console.error(errCheckins);
    showToast('Partidas apagadas, mas houve erro ao liberar os jogadores.');
    return;
  }

  sorteioState = { partidaId: null, numero: 1, timeA: [], timeB: [] };
  showToast('Sorteio do dia reiniciado!');
  await loadSorteio();
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
on('nav-sorteio', 'click', goToSorteio);
on('nav-historico', 'click', goToHistorico);
on('btn-sortear', 'click', handleSortear);
on('btn-nova-partida', 'click', handleNovaPartida);
on('btn-resetar-sorteio', 'click', handleResetarSorteio);
on('input-jogadores-time', 'change', handleJogadoresPorTimeChange);
on('select-modo-selecao', 'change', handleModoSelecaoChange);
on('btn-add-posicao', 'click', () => addPosicaoRow(false));
on('btn-salvar-jogador', 'click', handleSalvarJogador);

checkSession();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
