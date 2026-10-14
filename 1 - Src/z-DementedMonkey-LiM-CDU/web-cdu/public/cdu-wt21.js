(function () {
  const ROWS = 15;
  const COLS = 24;
  const PROTOCOL = 'wt21';

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
      const storedSide = localStorage.getItem('limwt21-cdu-side') || '1';
      if (storedSide === 'both') both = true;
      else if (parseInt(storedSide, 10) === 2) side = 2;
    } catch (_) { /* ignore */ }
  }
  activeSide = side;

  const pageFace = document.body.getAttribute('data-face') || 'cj4';
  const singleCdu = pageFace === 'c90' || pageFace === 'p180';
  let homePlate = pageFace === 'c90' ? 'WT21 C90' : pageFace === 'p180' ? 'WT21 P180' : pageFace === 'hawker' ? 'WT21 800XP' : pageFace === 'c750' ? 'C750' : 'WT21 Default';
  if (singleCdu) {
    both = false;
    side = 1;
    activeSide = 1;
  }
  const legacy = { left: null, right: null };

  function buildScreen(screenEl) {
    const letterEls = [];
    const rowEls = [];
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'fmc-row';
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

  function cellParts(text) {
    const parts = [];
    const raw = String(text == null ? '' : text);
    let i = 0;
    while (i < raw.length) {
      let letters = '';
      while (i < raw.length && raw.charAt(i) !== '[') {
        letters += raw.charAt(i);
        i += 1;
      }
      const styles = [];
      while (raw.charAt(i) === '[') {
        const end = raw.indexOf(']', i + 1);
        if (end < 0) break;
        styles.push(raw.slice(i + 1, end).trim());
        i = end + 1;
      }
      if (letters) {
        parts.push({
          letters: letters.replace(/__LSB/g, '[').replace(/__RSB/g, ']'),
          styles: styles.join(' ')
        });
      } else if (!styles.length) {
        break;
      }
    }
    return parts;
  }

  function cellsFromLine(line) {
    const src = Array.isArray(line) ? line : ['', '', ''];
    const cols = new Array(COLS);
    function paint(text, start) {
      const parts = cellParts(text);
      let at = start;
      for (let p = 0; p < parts.length; p++) {
        const letters = parts[p].letters;
        for (let n = 0; n < letters.length && at >= 0 && at < COLS; n++) {
          cols[at] = { ch: letters.charAt(n), styles: parts[p].styles };
          at += 1;
        }
      }
      return at - start;
    }
    paint(src[0], 0);
    const midParts = cellParts(src[2]);
    let midCount = 0;
    for (let p = 0; p < midParts.length; p++) midCount += midParts[p].letters.length;
    if (midCount) paint(src[2], Math.max(0, Math.floor((COLS - midCount) / 2)));
    const rightCells = [];
    const rightParts = cellParts(src[1]);
    for (let p = 0; p < rightParts.length; p++) {
      const letters = rightParts[p].letters;
      for (let n = 0; n < letters.length; n++) {
        rightCells.push({ ch: letters.charAt(n), styles: rightParts[p].styles });
      }
    }
    for (let n = 0; n < rightCells.length; n++) {
      cols[COLS - rightCells.length + n] = rightCells[n];
    }
    return cols;
  }

  function allCells(line) {
    const src = Array.isArray(line) ? line : ['', '', ''];
    const cells = [];
    [src[0], src[2], src[1]].forEach(function (text) {
      const parts = cellParts(text);
      for (let p = 0; p < parts.length; p++) {
        const letters = parts[p].letters;
        for (let n = 0; n < letters.length; n++) {
          cells.push({ ch: letters.charAt(n), styles: parts[p].styles });
        }
      }
    });
    return cells;
  }

  function paintScreen(unit, ctx, screen) {
    const lines = screen && screen.lines;
    const powered = !screen || screen.power !== false;
    ctx.screenEl.classList.toggle('off', !powered);
    if (!Array.isArray(lines)) return;
    for (let r = 0; r < ROWS; r++) {
      let cols = cellsFromLine(lines[r]);
      let count = COLS;
      if (pageFace === 'c750') {
        const wide = allCells(lines[r]);
        if (wide.length > COLS && wide.some(function (cell) { return cell.styles.indexOf('scratch') >= 0; })) {
          cols = wide;
          count = wide.length;
        }
      }
      const rowLetters = ctx.letterEls[r];
      while (rowLetters.length < count) {
        const cell = document.createElement('div');
        cell.className = 'fmc-letter';
        ctx.rowEls[r].appendChild(cell);
        rowLetters.push(cell);
      }
      while (rowLetters.length > count) {
        rowLetters.pop().remove();
      }
      for (let c = 0; c < count; c++) {
        const src = cols[c] || { ch: ' ', styles: '' };
        const el = ctx.letterEls[r][c];
        const next = src.ch && src.ch.length ? src.ch : ' ';
        if (el.textContent !== next) el.textContent = next;
        const cls = ('fmc-letter ' + (src.styles || '')).trim();
        if (el.className !== cls) el.className = cls;
      }
      if (pageFace === 'c750') {
        for (let c = 0; c < count; c++) {
          const src = cols[c];
          if (src && src.styles && src.styles.indexOf('scratch') >= 0) ctx.c750Scratch = r;
        }
      }
    }
    if (pageFace === 'c750') {
      for (let r = 0; r < ROWS; r++) {
        const row = ctx.rowEls[r];
        const marked = Array.prototype.some.call(row.children, function (el) {
          return el.className.indexOf('scratch') >= 0;
        });
        row.classList.toggle('c750-scratch', marked);
        row.classList.remove('c750-pad');
      }
    }
  }

  function screenFor(which) {
    return which === 2 ? legacy.right : legacy.left;
  }

  function repaint() {
    if (both) {
      if (legacy.left) paintScreen(captUnit, captCtx, legacy.left);
      if (legacy.right) paintScreen(foUnit, foCtx, legacy.right);
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
    if (captPlate) captPlate.textContent = both ? 'CAPT' : homePlate;
    if (!singleCdu) {
      try { localStorage.setItem('limwt21-cdu-side', both ? 'both' : String(side)); } catch (_) { /* ignore */ }
    }
    repaint();
  }

  function knownOtherFace(aircraft) {
    const name = String(aircraft || '').toUpperCase();
    if (/H25B|H25|HAWKER|800XP/.test(name)) return 'hawker';
    if (/C750/.test(name)) return 'c750';
    if (/P180|PIAGGIO/.test(name)) return 'p180';
    if (/C90|KINGAIR|KING AIR/.test(name)) return 'c90';
    return '';
  }

  function applyHomePlate(aircraft) {
    if (singleCdu || pageFace === 'hawker' || pageFace === 'c750') return;
    homePlate = /CJ4|C25C|C25A|C25B/.test(String(aircraft || '').toUpperCase()) ? 'WT21 CJ4' : 'WT21 Default';
    if (captPlate) captPlate.textContent = both ? 'CAPT' : homePlate;
    document.title = homePlate + ' Web CDU';
  }

  function redirectFace(face) {
    const params = new URLSearchParams(window.location.search);
    params.set('face', face);
    params.set('screen', both ? 'both' : String(side));
    const page = face === 'c90' ? 'c90.html' : face === 'p180' ? 'p180.html' : face === 'hawker' ? 'hawker.html' : face === 'c750' ? 'c750.html' : (face === 'cj4' ? 'wt21.html' : 'index.html');
    window.location.replace(page + '?' + params.toString());
  }

  function applyUpdate(payload) {
    if (!payload || typeof payload !== 'object') return;
    const aircraft = String(payload.aircraft || '');
    if (aircraft) {
      const other = knownOtherFace(aircraft);
      if (pageFace === 'c90' || pageFace === 'p180' || pageFace === 'hawker' || pageFace === 'c750') {
        if (other && other !== pageFace) {
          redirectFace(other);
          return;
        }
        if (!other) {
          redirectFace('cj4');
          return;
        }
      } else if (other) {
        redirectFace(other);
        return;
      }
    }
    applyHomePlate(aircraft);
    if (payload.left) legacy.left = payload.left;
    if (payload.right) legacy.right = payload.right;
    repaint();
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
      try { applyUpdate(JSON.parse(raw.slice(prefix.length))); } catch (_) { /* ignore */ }
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

  function paintKnob(unit, brt) {
    const knob = unit.querySelector('.hw-knob');
    if (!knob) return;
    const t = Math.max(0, Math.min(1, (brt - 35) / 105));
    knob.style.setProperty('--knob-turn', (-90 + t * 180).toFixed(1) + 'deg');
  }

  function applyBrt(unit, delta) {
    const screenEl = unit.querySelector('.screen');
    const current = Number(screenEl.dataset.brt || '100');
    const next = Math.max(35, Math.min(140, current + delta));
    screenEl.dataset.brt = String(next);
    screenEl.style.filter = 'brightness(' + (next / 100) + ')';
    paintKnob(unit, next);
    try { localStorage.setItem('limwt21-cdu-brt', String(next)); } catch (_) { /* ignore */ }
  }

  let storedBrt = '100';
  try { storedBrt = localStorage.getItem('limwt21-cdu-brt') || '100'; } catch (_) { /* ignore */ }

  function bindUnit(unit) {
    const screenEl = unit.querySelector('.screen');
    screenEl.dataset.brt = storedBrt;
    screenEl.style.filter = 'brightness(' + (Number(storedBrt) / 100) + ')';
    paintKnob(unit, Number(storedBrt));
    unit.querySelectorAll('[data-key]').forEach(function (btn) {
      const key = btn.getAttribute('data-key');
      if (key === 'CLR' || key === 'BRT' || key === 'DIM') return;
      btn.addEventListener('click', function () {
        activeSide = panelSide(unit);
        sendEvent(key, activeSide);
      });
    });
    const clr = unit.querySelector('[data-key="CLR"]');
    let timer = null;
    let long = false;
    if (clr) {
      clr.addEventListener('pointerdown', function (ev) {
        if (ev.button != null && ev.button !== 0) return;
        long = false;
        activeSide = panelSide(unit);
        timer = setTimeout(function () {
          long = true;
          sendEvent('CLR_LONG', panelSide(unit));
        }, 650);
      });
      clr.addEventListener('pointerup', function () {
        clearTimeout(timer);
        if (!long) sendEvent('CLR', panelSide(unit));
      });
      clr.addEventListener('pointercancel', function () { clearTimeout(timer); });
    }
    const brt = unit.querySelector('[data-key="BRT"]');
    const dim = unit.querySelector('[data-key="DIM"]');
    if (brt) brt.addEventListener('click', function () { applyBrt(unit, 8); });
    if (dim) dim.addEventListener('click', function () { applyBrt(unit, -8); });
  }

  bindUnit(captUnit);
  bindUnit(foUnit);
  captBtn.addEventListener('click', function () { setSide(1); });
  foBtn.addEventListener('click', function () { setSide(2); });
  bothBtn.addEventListener('click', function () { setSide('both'); });
  setSide(both ? 'both' : side);

  window.addEventListener('keydown', function (ev) {
    if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
    if (ev.repeat && ev.key !== 'Backspace') return;
    const which = both ? activeSide : side;
    const map = {
      Enter: 'EXEC', Backspace: 'CLR', ' ': 'SP',
      '/': 'DIV', '.': 'DOT', '+': 'PLUSMINUS', '-': 'PLUSMINUS',
      PageUp: 'PREVPAGE', PageDown: 'NEXTPAGE'
    };
    const name = map[ev.key] || (/^[a-z0-9]$/i.test(ev.key) ? ev.key.toUpperCase() : '');
    if (!name) return;
    ev.preventDefault();
    sendEvent(name, which);
    flash(name);
  });

  connect();
})();
