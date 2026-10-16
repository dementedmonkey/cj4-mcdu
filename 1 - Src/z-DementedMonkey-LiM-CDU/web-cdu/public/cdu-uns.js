(function () {
  const ROWS = 11;
  const COLS = 24;
  const PROTOCOL = 'wt737/uns1';
  // Working Title has not shipped a dual UNS-1. The side switch stays hidden
  // until a second CDU index, or a right-hand screen, shows up.

  const unitEl = document.querySelector('.unit');
  const faceToggle = document.getElementById('face-toggle');
  let faceOverride = null;

  function isFiveInchAircraft(name) {
    return /b707|boeing\s*b?707|707\s*uns/i.test(String(name || ''));
  }

  function setFace(face) {
    const next = face === '5in' ? '5in' : '4in';
    if (unitEl) {
      document.querySelectorAll('.unit').forEach(function (unit) {
        unit.setAttribute('data-face', next);
      });
    }
    if (faceToggle) {
      faceToggle.setAttribute(
        'aria-label',
        next === '5in' ? '5-inch bezel, switch to 4-inch' : '4-inch bezel, switch to 5-inch'
      );
    }
  }

  function faceFromPayload(payload) {
    if (payload && (payload.face === '5in' || payload.face === '4in')) {
      return payload.face;
    }
    if (payload && payload.aircraft) {
      return isFiveInchAircraft(payload.aircraft) ? '5in' : '4in';
    }
    return null;
  }

  if (faceToggle) {
    faceToggle.addEventListener('click', function () {
      const next = (unitEl && unitEl.getAttribute('data-face') === '5in') ? '4in' : '5in';
      faceOverride = next;
      setFace(next);
    });
  }
  const statusEl = document.getElementById('status');
  const screenEl = document.getElementById('screen');
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

  const captCtx = { screenEl: screenEl, rowEls: rowEls, letterEls: letterEls };

  const WS_PORT = Number(window.UNS1_WS_PORT) || 8088;
  const clickSound = new Audio('button-click.wav?v=20260921-2');
  clickSound.preload = 'auto';
  clickSound.volume = 0.55;

  function playClick() {
    try {
      const n = clickSound.cloneNode();
      n.volume = clickSound.volume;
      n.play().catch(function () { /* autoplay policy — first real click unlocks */ });
    } catch {
      // ignore
    }
  }

  function wsUrl() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = location.hostname || '127.0.0.1';
    return `${proto}//${host}:${WS_PORT}`;
  }

  let socket = null;
  let backoff = 500;

  function setStatus(connected, text) {
    statusEl.textContent = connected ? '' : (text || 'Waiting');
    statusEl.classList.toggle('connected', connected);
    statusEl.classList.toggle('disconnected', !connected);
  }

  function displayContent(col) {
    const t = col && col.content && col.content.length ? col.content[0] : ' ';
    if (/[-|+]/.test(t) && /\bline-/.test(col.styles || '')) {
      return ' ';
    }
    return t;
  }

  const app = document.querySelector('.app');
  const sideBar = document.getElementById('uns-side');
  const captBtn = document.getElementById('side-capt');
  const foBtn = document.getElementById('side-fo');
  const bothBtn = document.getElementById('side-both');
  const byId = {};
  let dual = false;
  let both = false;
  let side = 1;
  let activeSide = 1;
  let captIndex = 1;
  let foIndex = 2;
  let foUnit = null;
  let foCtx = null;

  function ctxFrom(screenNode) {
    const rows = Array.prototype.slice.call(screenNode.querySelectorAll('.fmc-row'));
    return {
      screenEl: screenNode,
      rowEls: rows,
      letterEls: rows.map(function (row) { return Array.prototype.slice.call(row.children); })
    };
  }

  function idsPresent() {
    return Object.keys(byId).map(Number).filter(function (id) { return byId[id]; }).sort(function (a, b) { return a - b; });
  }

  function assignSides() {
    const ids = idsPresent();
    const nonFo = ids.filter(function (id) { return id !== 2; });
    captIndex = ids.indexOf(1) >= 0 ? 1 : (nonFo[0] || ids[0] || 1);
    foIndex = ids.indexOf(2) >= 0 ? 2 : (ids.filter(function (id) { return id !== captIndex; })[0] || 2);
  }

  function shownId() {
    if (!dual || both || side !== 2) return captIndex;
    return foIndex;
  }

  function eventIndex(which) {
    if (!dual) {
      const ids = idsPresent();
      return ids.length === 1 ? ids[0] : 1;
    }
    return (which || activeSide) === 2 ? foIndex : captIndex;
  }

  function enableDual() {
    if (dual) return;
    dual = true;
    foUnit = unitEl.cloneNode(true);
    foUnit.removeAttribute('id');
    foUnit.querySelectorAll('[id]').forEach(function (el) { el.removeAttribute('id'); });
    const screw = foUnit.querySelector('.dzus-tl');
    if (screw) screw.style.pointerEvents = 'none';
    foUnit.setAttribute('data-panel', '2');
    foUnit.hidden = true;
    unitEl.setAttribute('data-panel', '1');
    app.appendChild(foUnit);
    foCtx = ctxFrom(foUnit.querySelector('.screen'));
    if (sideBar) sideBar.hidden = false;
    const query = /(?:\?|&)screen=(\w+)/.exec(window.location.search);
    if (query && (query[1] === '2' || query[1] === 'both')) setSide(query[1] === 'both' ? 'both' : 2);
    else setSide(1);
  }

  function setSide(next) {
    both = next === 'both';
    if (!both) side = next === 2 ? 2 : 1;
    activeSide = both ? (activeSide === 2 ? 2 : 1) : side;
    if (captBtn) captBtn.classList.toggle('on', !both && side === 1);
    if (foBtn) foBtn.classList.toggle('on', !both && side === 2);
    if (bothBtn) bothBtn.classList.toggle('on', both);
    app.classList.toggle('both', both);
    if (foUnit) foUnit.hidden = !both;
    repaint();
  }

  function paintCtx(ctx, screen) {
    if (!ctx) return;
    const lines = screen && screen.lines;
    if (!Array.isArray(lines)) return;
    for (let r = 0; r < ROWS; r++) {
      const line = lines[r] || { rowStyle: 'fmc-row d-text', cols: [] };
      const rowStyle = (line.rowStyle || 'fmc-row d-text').trim();
      if (ctx.rowEls[r] && ctx.rowEls[r].className !== rowStyle) ctx.rowEls[r].className = rowStyle;
      const cols = line.cols || [];
      for (let c = 0; c < COLS; c++) {
        const src = cols[c] || { content: ' ', styles: '' };
        const el = ctx.letterEls[r] && ctx.letterEls[r][c];
        if (!el) continue;
        const next = displayContent(src);
        if (el.textContent !== next) el.textContent = next;
        const cls = ('fmc-letter ' + (src.styles || '')).trim();
        if (el.className !== cls) el.className = cls;
        const invert = /\br-white\b/.test(cls) || /\bblackwhite\b/.test(cls);
        if (invert) {
          el.style.removeProperty('box-shadow');
          el.style.setProperty('background-color', 'transparent', 'important');
          el.style.setProperty('background-image', 'linear-gradient(#fff,#fff)', 'important');
          el.style.setProperty('background-size', 'calc(100% + 2px) 1.05em', 'important');
          el.style.setProperty('background-repeat', 'no-repeat', 'important');
          el.style.setProperty('background-position', 'center', 'important');
          el.style.setProperty('color', '#000', 'important');
          el.style.setProperty('-webkit-text-fill-color', '#000', 'important');
          el.style.setProperty('-webkit-text-stroke', '0.04em #fff', 'important');
          el.style.setProperty('paint-order', 'fill');
        } else if (el.style.backgroundColor || el.style.backgroundImage) {
          el.style.removeProperty('background-color');
          el.style.removeProperty('background-image');
          el.style.removeProperty('background-size');
          el.style.removeProperty('background-repeat');
          el.style.removeProperty('background-position');
          el.style.removeProperty('box-shadow');
          el.style.removeProperty('color');
          el.style.removeProperty('-webkit-text-fill-color');
          el.style.removeProperty('-webkit-text-stroke');
          el.style.removeProperty('paint-order');
        }
      }
    }
  }

  function repaint() {
    paintCtx(captCtx, byId[shownId()]);
    if (both) paintCtx(foCtx, byId[foIndex]);
  }

  function applyUpdate(payload) {
    if (!payload) return;
    if (!faceOverride) {
      const nextFace = faceFromPayload(payload);
      if (nextFace) setFace(nextFace);
    }
    const screen = payload.left || payload.right;
    if (payload.left && payload.right) {
      byId[1] = payload.left;
      byId[2] = payload.right;
    } else if (screen) {
      const id = Number(payload.cdu);
      const which = id >= 1 && id <= 3 ? id : (payload.right && !payload.left ? 2 : 1);
      byId[which] = screen;
    } else {
      return;
    }
    assignSides();
    if (idsPresent().length >= 2) enableDual();
    repaint();
    const shown = byId[shownId()];
    if (shown) setStatus(true);
  }

  function sendEvent(name, which) {
    playClick();
    if (!socket || socket.readyState !== WebSocket.OPEN || !name) {
      return;
    }
    socket.send('event:' + PROTOCOL + ':' + eventIndex(which) + ':' + name);
  }

  function connect() {
    try {
      socket = new WebSocket(wsUrl());
    } catch {
      schedule();
      return;
    }

    socket.onopen = function () {
      backoff = 500;
      socket.send('requestUpdate');
      setStatus(false, 'Waiting');
    };

    socket.onmessage = function (ev) {
      const raw = String(ev.data || '');
      if (typeof LIM_maybeRedirect === 'function' && LIM_maybeRedirect(raw, {})) {
        return;
      }
      const prefix = 'update:' + PROTOCOL + ':';
      if (raw.indexOf(prefix) !== 0) {
        return;
      }
      try {
        applyUpdate(JSON.parse(raw.slice(prefix.length)));
      } catch {
        // ignore
      }
    };

    socket.onclose = function () {
      setStatus(false, 'Waiting');
      schedule();
    };

    socket.onerror = function () {
      // close handler retries
    };
  }

  function schedule() {
    const delay = backoff;
    backoff = Math.min(4000, backoff * 1.5);
    setTimeout(connect, delay);
  }

  document.addEventListener('click', function (ev) {
    const sideBtn = ev.target.closest && ev.target.closest('[data-side]');
    if (sideBtn && sideBar && sideBar.contains(sideBtn)) {
      const value = sideBtn.getAttribute('data-side');
      setSide(value === 'both' ? 'both' : Number(value));
      return;
    }
    const btn = ev.target.closest && ev.target.closest('[data-key]');
    if (!btn) return;
    const unit = btn.closest('.unit');
    const which = dual && both && unit ? Number(unit.getAttribute('data-panel') || 1) : (dual ? side : 1);
    activeSide = which;
    sendEvent(btn.getAttribute('data-key'), which);
  });

  window.addEventListener('keydown', function (ev) {
    if (ev.repeat) {
      return;
    }
    if (ev.key === 'Enter') {
      sendEvent('ENTER');
      ev.preventDefault();
      return;
    }
    if (ev.key === 'Backspace') {
      sendEvent('BACK');
      ev.preventDefault();
      return;
    }
    if (ev.key === 'PageUp') {
      sendEvent('PREVPAGE');
      ev.preventDefault();
      return;
    }
    if (ev.key === 'PageDown') {
      sendEvent('NEXTPAGE');
      ev.preventDefault();
      return;
    }
    if (ev.key.length === 1) {
      const ch = ev.key.toUpperCase();
      if (/^[A-Z0-9./]$/.test(ch) || ch === '+' || ch === '-') {
        if (ch === '+' || ch === '-') {
          sendEvent('PLUSMINUS');
        } else if (ch === '.') {
          sendEvent('DOT');
        } else {
          sendEvent(ch);
        }
        ev.preventDefault();
      }
    }
  });

  connect();
})();
