@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600&family=Inter:wght@400;500;600&display=swap');

:root {
  --bg: #F7F7F3;
  --card: #FFFFFF;
  --dark: #173404;
  --primary: #3B6D11;
  --primary-hover: #27500A;
  --text: #2C2C2A;
  --muted: #5F5E5A;
  --border: #E3E1D8;
  --coral: #D85A30;
  --blue: #185FA5;
  --warn-bg: #FAEEDA;
  --warn-text: #854F0B;
  --ok-bg: #EAF3DE;
  --ok-text: #27500A;
  --radius: 12px;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

h1, h2, h3 {
  font-family: 'Oswald', sans-serif;
  font-weight: 600;
  margin: 0;
  color: var(--dark);
}

button {
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  border: none;
  border-radius: var(--radius);
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}
.btn-primary:active { background: var(--primary-hover); }

.btn-ghost {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--border);
}

input, select {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  background: #fff;
  color: var(--text);
}

.screen { display: none; min-height: 100vh; }
.screen.active { display: block; }

/* ---------- LOGIN ---------- */
#login-screen {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
  min-height: 100vh;
}
#login-screen.active { display: flex; }
.login-card {
  width: 100%;
  max-width: 340px;
  background: var(--card);
  border-radius: 16px;
  padding: 28px 24px;
  border: 1px solid var(--border);
}
.login-logo { width: 72px; height: 72px; display: block; margin: 0 auto 12px; border-radius: 16px; }
.login-card h1 { font-size: 24px; margin-bottom: 4px; text-align: center; }
.login-card p { text-align: center; }
.login-card p { color: var(--muted); font-size: 13px; margin: 0 0 20px; }
.login-card input { margin-bottom: 10px; }
.login-error { color: var(--coral); font-size: 12px; min-height: 16px; margin-bottom: 8px; }

/* ---------- APP SHELL ---------- */
#app-screen { padding-bottom: 76px; }
.topbar {
  background: var(--dark);
  color: #fff;
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.topbar-brand { display: flex; align-items: center; gap: 10px; }
.topbar-logo { width: 32px; height: 32px; border-radius: 8px; }
.topbar h1 { color: #fff; font-size: 18px; }
.topbar button { background: transparent; color: rgba(255,255,255,0.7); padding: 4px 8px; font-size: 12px; }

.content { padding: 16px; max-width: 480px; margin: 0 auto; }

.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--card);
  border-top: 1px solid var(--border);
  display: flex;
  padding: 8px 0;
  max-width: 480px;
  margin: 0 auto;
}
.nav-item {
  flex: 1;
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  color: var(--muted);
  padding: 4px;
  border-radius: 8px;
}
.nav-item.active { color: var(--primary); font-weight: 600; }
.nav-item:disabled { color: #C4C2B8; }

/* ---------- ELENCO ---------- */
.player-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.player-row:last-child { border-bottom: none; }
.player-name { font-size: 14px; font-weight: 500; }
.player-meta { font-size: 12px; color: var(--muted); }
.empty-state { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 13px; }

/* ---------- CADASTRO ---------- */
.field-label { font-size: 12px; color: var(--muted); margin: 14px 0 6px; display: block; }
.posicao-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.posicao-row select:first-child { flex: 1.4; }
.posicao-row select:last-child { flex: 1; }
.remove-btn {
  background: transparent;
  border: none;
  color: var(--coral);
  font-size: 18px;
  padding: 4px 8px;
  line-height: 1;
}

.fab-add {
  position: fixed;
  bottom: 88px;
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  max-width: 480px;
}

.toast {
  position: fixed;
  top: 16px; left: 50%;
  transform: translateX(-50%);
  background: var(--dark);
  color: #fff;
  padding: 10px 18px;
  border-radius: var(--radius);
  font-size: 13px;
  z-index: 999;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.toast.show { opacity: 1; }
