(function () {
  const ROWS = 14;
  const COLS = 24;
  const PROTOCOL = 'wt737';

  const app = document.querySelector('.app');
  const captUnit = document.getElementById('unit');
  const captBtn = document.getElementById('side-capt');
  const foBtn = document.getElementById('side-fo');
  const bothBtn = document.getElementById('side-both');
  const captPlate = captUnit.querySelector('.plate');

  const foUnit = captUnit.cloneNode(true);
  foUnit.id = 'unit-fo';
  foUnit.hidden = true;
  foUnit.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
  const foSide = foUnit.querySelector('.side');
  if (foSide) foSide.remove();
  foUnit.querySelector('.plate').textContent = 'F/O';
  app.appendChild(foUnit);

  captUnit.setAttribute('data-panel', '1');
  foUnit.setAttribute('data-panel', '2');

  let both = false;
  let side = 1;
  let activeSide = 1;
  const screenQuery = /(?:\?|&)screen=(\w+)/.exec(window.location.search);
  if (screenQuery) {
    if (screenQuery[1] === '2') side = 2;
    else if (screenQuery[1] === 'both') both = true;
  } else {
    try {
      const storedSide = localStorage.getItem('lim737-cdu-side') || '1';
      if (storedSide === 'both') both = true;
      else if (parseInt(storedSide, 10) === 2) side = 2;
    } catch (_) { /* ignore */ }
  }
  activeSide = side;

  const byCdu = Object.create(null);
  const seenCdu = Object.create(null);
  const legacy = { left: null, right: null };

  function buildScreen(screenEl) {
    const letterEls = [];
    const rowEls = [];
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'fmc-row d-text';
      const rowLetters = [];
      for (let c = 0; c < COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'fmc-letter';
        cell.textContent = ' ';
        row.appendChild(cell);
        rowLetters.push(cell);
      }
      screenEl.appendChild(row);
      rowEls.push(row);
      letterEls.push(rowLetters);
    }
    return { screenEl: screenEl, letterEls: letterEls, rowEls: rowEls };
  }

  const captCtx = buildScreen(captUnit.querySelector('.screen'));
  const foCtx = buildScreen(foUnit.querySelector('.screen'));

  const WS_PORT = Number(window.LIM_WS_PORT) || 8088;
  const clickSound = new Audio('button-click.wav?v=20260921-2');
  clickSound.preload = 'auto';
  clickSound.volume = 0.45;

  function playClick() {
    try {
      const n = clickSound.cloneNode();
      n.volume = clickSound.volume;
      n.play().catch(function () { /* first gesture unlocks audio */ });
    } catch (_) { /* ignore */ }
  }

  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = location.hostname || '127.0.0.1';
    return proto + '//' + host + ':' + WS_PORT;
  }

  let socket = null;
  let backoff = 500;

  function setStatus(connected) {
    document.querySelectorAll('.status').forEach(function (el) {
      el.textContent = connected ? '' : 'NO LINK';
      el.classList.toggle('connected', connected);
      el.classList.toggle('disconnected', !connected);
    });
  }

  function cduIdFor(which) {
    if (which === 2) {
      if (seenCdu[2]) return 2;
      if (seenCdu[0] && seenCdu[1]) return 1;
      return 2;
    }
    if (seenCdu[2] || (seenCdu[1] && !seenCdu[0])) return 1;
    if (seenCdu[0]) return 0;
    return 1;
  }

  function screenFor(which) {
    const tagged = byCdu[cduIdFor(which)];
    if (tagged) return tagged;
    return which === 2 ? legacy.right : legacy.left;
  }

  function displayContent(col) {
    const raw = col && col.content != null ? col.content : ' ';
    const text = Array.isArray(raw) ? String(raw[0] == null ? ' ' : raw[0]) : String(raw);
    const chars = Array.from(text);
    return chars.length ? chars[0] : ' ';
  }

  function execLit() {
    const screens = [];
    Object.keys(byCdu).forEach(function (id) { screens.push(byCdu[id]); });
    if (legacy.left) screens.push(legacy.left);
    if (legacy.right) screens.push(legacy.right);
    return screens.some(function (screen) { return !!(screen && screen.exec); });
  }

  function paintScreen(unit, ctx, screen) {
    const lines = screen && screen.lines;
    const powered = !screen || screen.power !== false;
    ctx.screenEl.classList.toggle('off', !powered);
    const execKey = unit.querySelector('[data-key="EXEC"]');
    if (execKey) execKey.classList.toggle('lit', execLit());
    ['dspy', 'fail', 'msg', 'ofst'].forEach(function (name) {
      const el = unit.querySelector('[data-ann="' + name + '"]');
      if (el) el.classList.toggle('lit', !!(screen && screen[name]));
    });
    if (!Array.isArray(lines)) return;
    for (let r = 0; r < ROWS; r++) {
      const line = lines[r] || { rowStyle: 'fmc-row d-text', cols: [] };
      const rowStyle = String(line.rowStyle || 'fmc-row d-text').trim() || 'fmc-row d-text';
      if (ctx.rowEls[r].className !== rowStyle) ctx.rowEls[r].className = rowStyle;
      const cols = line.cols || [];
      for (let c = 0; c < COLS; c++) {
        const src = cols[c] || { content: ' ', styles: '' };
        const el = ctx.letterEls[r][c];
        const next = displayContent(src);
        if (el.textContent !== next) el.textContent = next;
        const cls = ('fmc-letter ' + (src.styles || '')).trim();
        if (el.className !== cls) el.className = cls;
      }
    }
  }

  function repaint() {
    if (both) {
      const left = screenFor(1);
      const right = screenFor(2);
      if (left) paintScreen(captUnit, captCtx, left);
      if (right) paintScreen(foUnit, foCtx, right);
      return;
    }
    const screen = screenFor(side);
    if (screen) paintScreen(captUnit, captCtx, screen);
  }

  function setSide(next) {
    both = next === 'both';
    if (!both) side = next === 2 ? 2 : 1;
    activeSide = both ? activeSide : side;
    if (both && activeSide !== 1 && activeSide !== 2) activeSide = 1;
    captBtn.classList.toggle('on', !both && side === 1);
    foBtn.classList.toggle('on', !both && side === 2);
    bothBtn.classList.toggle('on', both);
    app.classList.toggle('both', both);
    foUnit.hidden = !both;
    if (captPlate) captPlate.textContent = both ? 'CAPT' : '737 CDU';
    try { localStorage.setItem('lim737-cdu-side', both ? 'both' : String(side)); } catch (_) { /* ignore */ }
    repaint();
  }

  function applyUpdate(payload) {
    if (!payload || typeof payload !== 'object') return;
    const id = payload.cdu != null && payload.cdu !== '' ? Number(payload.cdu) : NaN;
    if (!isNaN(id) && payload.screen) {
      byCdu[id] = payload.screen;
      seenCdu[id] = true;
      setStatus(true);
      if (both) {
        if (id === cduIdFor(1)) paintScreen(captUnit, captCtx, payload.screen);
        if (id === cduIdFor(2)) paintScreen(foUnit, foCtx, payload.screen);
      } else if (id === cduIdFor(side)) {
        paintScreen(captUnit, captCtx, payload.screen);
      }
      return;
    }
    if (payload.left) legacy.left = payload.left;
    if (payload.right) legacy.right = payload.right;
    if (both) {
      if (payload.left) paintScreen(captUnit, captCtx, payload.left);
      if (payload.right) paintScreen(foUnit, foCtx, payload.right);
    } else {
      const screen = side === 2 ? payload.right : payload.left;
      if (screen) paintScreen(captUnit, captCtx, screen);
    }
    setStatus(true);
  }

  function panelSide(unit) {
    if (!both) return side;
    return unit && unit.getAttribute('data-panel') === '2' ? 2 : 1;
  }

  function sendEvent(name, which) {
    playClick();
    const target = which || activeSide;
    if (!socket || socket.readyState !== WebSocket.OPEN || !name) return;
    socket.send('event:' + PROTOCOL + ':' + target + ':' + name);
  }

  function flash(key, unit) {
    const root = unit || (both && activeSide === 2 ? foUnit : captUnit);
    const btn = root.querySelector('[data-key="' + key + '"]');
    if (!btn) return;
    btn.classList.add('down');
    setTimeout(function () { btn.classList.remove('down'); }, 90);
  }

  function connect() {
    try {
      socket = new WebSocket(wsUrl());
    } catch (_) {
      schedule();
      return;
    }

    socket.onopen = function () {
      backoff = 500;
      socket.send('requestUpdate');
      setStatus(false);
    };

    socket.onmessage = function (ev) {
      const raw = String(ev.data || '');
      const prefix = 'update:' + PROTOCOL + ':';
      if (raw.indexOf(prefix) !== 0) return;
      try {
        applyUpdate(JSON.parse(raw.slice(prefix.length)));
      } catch (_) { /* ignore */ }
    };

    socket.onclose = function () {
      setStatus(false);
      schedule();
    };
  }

  function schedule() {
    const delay = backoff;
    backoff = Math.min(4000, backoff * 1.5);
    setTimeout(connect, delay);
  }

  function applyBrt(screenEl, input, value) {
    const n = Math.max(35, Math.min(140, Number(value) || 100));
    if (screenEl) screenEl.style.filter = 'brightness(' + (n / 100) + ')';
    if (input && String(input.value) !== String(n)) input.value = String(n);
    try { localStorage.setItem('lim737-cdu-brt', String(n)); } catch (_) { /* ignore */ }
  }

  let storedBrt = null;
  try { storedBrt = localStorage.getItem('lim737-cdu-brt'); } catch (_) { /* ignore */ }

  function bindUnit(unit, ctx) {
    const brtInput = unit.querySelector('input[type="range"]');
    if (storedBrt) applyBrt(ctx.screenEl, brtInput, storedBrt);
    if (brtInput) {
      brtInput.addEventListener('input', function () {
        applyBrt(ctx.screenEl, brtInput, brtInput.value);
      });
    }

    unit.querySelectorAll('[data-key]').forEach(function (btn) {
      const key = btn.getAttribute('data-key');
      if (key === 'CLR') return;
      btn.addEventListener('click', function () {
        activeSide = panelSide(unit);
        sendEvent(key, activeSide);
      });
    });

    const clrBtn = unit.querySelector('[data-key="CLR"]');
    let clrTimer = null;
    let clrLong = false;
    if (clrBtn) {
      clrBtn.addEventListener('pointerdown', function (ev) {
        if (ev.button != null && ev.button !== 0) return;
        activeSide = panelSide(unit);
        clrLong = false;
        clrTimer = setTimeout(function () {
          clrTimer = null;
          clrLong = true;
          sendEvent('CLR_Long', panelSide(unit));
        }, 550);
      });
      clrBtn.addEventListener('pointerup', function () {
        if (clrTimer) {
          clearTimeout(clrTimer);
          clrTimer = null;
          if (!clrLong) sendEvent('CLR', panelSide(unit));
        }
        clrLong = false;
      });
      clrBtn.addEventListener('pointercancel', function () {
        if (clrTimer) clearTimeout(clrTimer);
        clrTimer = null;
        clrLong = false;
      });
    }
  }

  bindUnit(captUnit, captCtx);
  bindUnit(foUnit, foCtx);

  captBtn.addEventListener('click', function () { setSide(1); });
  foBtn.addEventListener('click', function () { setSide(2); });
  bothBtn.addEventListener('click', function () { setSide('both'); });
  setSide(both ? 'both' : side);

  let backspaceTimer = null;
  let backspaceLong = false;

  window.addEventListener('keydown', function (ev) {
    if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
    if (ev.repeat && ev.key !== 'Backspace') return;
    const which = both ? activeSide : side;

    if (ev.key === 'Enter') {
      sendEvent('ENTER', which);
      flash('ENTER');
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Backspace') {
      if (!ev.repeat && !backspaceTimer) {
        backspaceLong = false;
        backspaceTimer = setTimeout(function () {
          backspaceTimer = null;
          backspaceLong = true;
          sendEvent('CLR_Long', both ? activeSide : side);
          flash('CLR');
        }, 550);
      }
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Delete') {
      sendEvent('DEL', which);
      flash('DEL');
      ev.preventDefault();
      return;
    }
    if (ev.key === 'PageUp') {
      sendEvent('PREVPAGE', which);
      flash('PREVPAGE');
      ev.preventDefault();
      return;
    }
    if (ev.key === 'PageDown') {
      sendEvent('NEXTPAGE', which);
      flash('NEXTPAGE');
      ev.preventDefault();
      return;
    }
    if (ev.key === ' ') {
      sendEvent('SP', which);
      flash('SP');
      ev.preventDefault();
      return;
    }
    if (ev.key.length === 1) {
      const ch = ev.key.toUpperCase();
      let name = null;
      if (/^[A-Z0-9]$/.test(ch)) name = ch;
      else if (ch === '/') name = 'DIV';
      else if (ch === '.') name = 'DOT';
      else if (ch === '+' || ch === '-') name = 'PLUSMINUS';
      if (name) {
        sendEvent(name, which);
        flash(name);
        ev.preventDefault();
      }
    }
  });

  window.addEventListener('keyup', function (ev) {
    if (ev.key !== 'Backspace') return;
    if (backspaceTimer) {
      clearTimeout(backspaceTimer);
      backspaceTimer = null;
      if (!backspaceLong) {
        sendEvent('CLR', both ? activeSide : side);
        flash('CLR');
      }
    }
    backspaceLong = false;
  });

  connect();
})();
