(function () {
  const WS_PORT = Number(window.LIM_WS_PORT) || 8088;
  const JET_KEYS = [
    ['MSG', 'DIR', 'FPLN', 'LEGS', 'DEPARR', 'PERF', 'DSPL_MENU', 'MFD_ADV', 'MFD_DATA', 'PREVPAGE', 'NEXTPAGE', 'EXEC'],
    ['IDX', 'TUN', 'A', 'B', 'C', 'D', 'E', 'F', 'G', '1', '2', '3'],
    ['H', 'I', 'J', 'K', 'L', 'M', 'N', '4', '5', '6', 'CLR'],
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U', '7', '8', '9'],
    ['V', 'W', 'X', 'Y', 'Z', 'SP', 'DIV', 'DOT', '0', 'PLUSMINUS', 'BRT', 'DIM']
  ];
  const BOEING_KEYS = [
    ['INIT', 'RTE', 'DEPARR', 'ATC', 'VNAV', 'FIX', 'LEGS', 'HOLD', 'FMCCOM', 'PROG', 'EXEC'],
    ['MENU', 'N1LIMIT', 'PREVPAGE', 'NEXTPAGE'],
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DOT', '0', 'PLUSMINUS'],
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'],
    ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'SP', 'DEL', 'DIV', 'CLR']
  ];
  const B747_KEYS = [
    ['INIT', 'RTE', 'DEPARR', 'ATC', 'VNAV', 'FIX', 'LEGS', 'HOLD', 'FMCCOMM', 'PROG', 'EXEC'],
    ['MENU', 'NAVRAD', 'PREVPAGE', 'NEXTPAGE'],
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DOT', '0', 'PLUSMINUS'],
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'],
    ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'SP', 'DEL', 'DIV', 'CLR']
  ];
  const UNS_4_KEYS = [
    ['MSG', 'DATA', 'FUEL', 'TUNE', 'PREVPAGE', 'NEXTPAGE', 'PWR_DIM'],
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', '1', '2', '3'],
    ['H', 'I', 'J', 'K', 'L', 'M', 'N', '4', '5', '6'],
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U', '7', '8', '9'],
    ['V', 'W', 'X', 'Y', 'Z', 'ENTER', 'BACK', '0', 'PLUSMINUS']
  ];
  const UNS_5_KEYS = [
    ['DATA', 'NAV', 'VNAV', 'DTO', 'LIST', 'FUEL', 'FPL', 'PERF', 'TUNE', 'MENU'],
    ['PREVPAGE', 'NEXTPAGE', 'MSG', 'PWR_DIM', 'ENTER', 'BACK'],
    ['A', 'B', 'C', 'D', 'E', 'F', 'G', '1', '2', '3'],
    ['H', 'I', 'J', 'K', 'L', 'M', 'N', '4', '5', '6'],
    ['O', 'P', 'Q', 'R', 'S', 'T', 'U', '7', '8', '9'],
    ['V', 'W', 'X', 'Y', 'Z', '0', 'PLUSMINUS']
  ];
  const FACES = {
    cj4: { plate: 'CJ4', protocol: 'wt21', screen: 'wt21', keys: JET_KEYS },
    hawker: { plate: 'HAWKER', protocol: 'wt21', screen: 'wt21', keys: JET_KEYS },
    c750: { plate: 'CITATION X', protocol: 'wt21', screen: 'wt21', keys: JET_KEYS },
    c90: { plate: 'KING AIR', protocol: 'wt21', screen: 'wt21', keys: JET_KEYS },
    p180: { plate: 'P180', protocol: 'wt21', screen: 'wt21', keys: JET_KEYS },
    wt737: { plate: '737', protocol: 'wt737', screen: 'wt737', keys: BOEING_KEYS },
    wt747: { plate: '747', protocol: 'wt737/wt747', screen: 'grid', rows: 14, cols: 24, keys: B747_KEYS },
    uns4: { plate: 'UNS 4 IN', protocol: 'wt737/uns1', screen: 'grid', rows: 11, cols: 24, lsks: 5, keys: UNS_4_KEYS },
    uns5: { plate: 'UNS 5 IN', protocol: 'wt737/uns1', screen: 'grid', rows: 11, cols: 24, lsks: 5, keys: UNS_5_KEYS }
  };

  const app = document.getElementById('app');
  const stage = document.getElementById('stage');
  const plate = document.getElementById('plate');
  const statusEl = document.getElementById('status');
  const sideButtons = {
    1: document.getElementById('side-1'),
    2: document.getElementById('side-2'),
    both: document.getElementById('side-both')
  };

  let both = false;
  let side = 1;
  let activeSide = 1;
  const faceQuery = /(?:\?|&)face=(\w+)/.exec(window.location.search);
  let faceId = faceQuery && FACES[faceQuery[1]] ? faceQuery[1] : 'cj4';
  let protocol = 'wt21';
  let unsFace = '4in';
  let unsFaceLock = false;
  const faceToggle = document.getElementById('face-toggle');
  let socket = null;
  let backoff = 500;
  const screens = { left: null, right: null };

  const query = /(?:\?|&)screen=(\w+)/.exec(window.location.search);
  if (query) {
    if (query[1] === '2') side = 2;
    if (query[1] === 'both') both = true;
  }

  function faceFor(fmcType, aircraft, payload) {
    const name = String(aircraft || '').toUpperCase();
    if (fmcType === 'wt737/wt747') return 'wt747';
    if (fmcType === 'wt737/uns1') {
      if (!unsFaceLock) {
        const hinted = payload && (payload.face === '5in' || payload.face === '4in') ? payload.face : null;
        if (hinted) unsFace = hinted;
        else if (/B707|BOEING\s*B?707|707/.test(name)) unsFace = '5in';
        else unsFace = '4in';
      }
      return unsFace === '5in' ? 'uns5' : 'uns4';
    }
    if (fmcType === 'wt737') return 'wt737';
    if (fmcType === 'wt21') {
      // These four keep their own faces. Their screens are edited separately.
      if (/H25B|H25|HAWKER|800XP/.test(name)) return 'hawker';
      if (/C750/.test(name)) return 'c750';
      if (/P180|PIAGGIO/.test(name)) return 'p180';
      if (/C90|KINGAIR|KING AIR/.test(name)) return 'c90';
    }
    // CJ4, and any connection that is not a known aircraft, uses the CJ4 CDU.
    return 'cj4';
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function buildUnit(panel) {
    const face = FACES[faceId] || FACES.cj4;
    const unit = el('section', 'unit');
    unit.setAttribute('data-panel', String(panel));
    const faceRow = el('div', 'face');
    const left = el('div', 'lsks');
    const right = el('div', 'lsks');
    const lskCount = face.lsks || 6;
    for (let i = 1; i <= lskCount; i++) {
      left.appendChild(keyButton('L' + i, 'lsk', ''));
      right.appendChild(keyButton('R' + i, 'lsk', ''));
    }
    const bezel = el('div', 'screen-bezel');
    const screen = el('div', 'screen');
    screen.setAttribute('data-screen', '');
    bezel.appendChild(screen);
    faceRow.appendChild(left);
    faceRow.appendChild(bezel);
    faceRow.appendChild(right);
    const deck = el('div', 'deck');
    face.keys.forEach(function (row) {
      const wrap = el('div', 'fn');
      row.forEach(function (name) { wrap.appendChild(keyButton(name, '', labelFor(name))); });
      deck.appendChild(wrap);
    });
    unit.appendChild(faceRow);
    unit.appendChild(deck);
    return unit;
  }

  function labelFor(name) {
    if (name === 'PLUSMINUS') return '+/-';
    if (name === 'DIV') return '/';
    if (name === 'DOT') return '.';
    if (name === 'DSPL_MENU') return 'DSPL';
    if (name === 'MFD_ADV') return 'ADV';
    if (name === 'MFD_DATA') return 'DATA';
    if (name === 'PREVPAGE') return 'PREV';
    if (name === 'NEXTPAGE') return 'NEXT';
    if (name === 'DEPARR') return 'DEP/ARR';
    if (name === 'N1LIMIT') return 'N1';
    if (name === 'FMCCOM') return 'COMM';
    return name;
  }

  function keyButton(name, className, text) {
    const button = el('button', className, text || name);
    button.type = 'button';
    button.setAttribute('data-key', name);
    return button;
  }

  function renderStage() {
    stage.textContent = '';
    stage.appendChild(buildUnit(1));
    if (both) stage.appendChild(buildUnit(2));
    paint();
  }

  function setSide(next) {
    both = next === 'both';
    if (!both) side = next === 2 ? 2 : 1;
    activeSide = both ? activeSide : side;
    app.classList.toggle('both', both);
    sideButtons[1].classList.toggle('on', !both && side === 1);
    sideButtons[2].classList.toggle('on', !both && side === 2);
    sideButtons.both.classList.toggle('on', both);
    renderStage();
  }

  function styledPieces(text) {
    const pieces = [];
    const raw = String(text || '');
    const re = /([^[\]]+)(\[[^[\]]+\])*/g;
    let match = re.exec(raw);
    while (match) {
      const classes = match[2] ? (match[2].match(/[^\s[\]]+/g) || []).join(' ') : '';
      pieces.push({ text: match[1], className: classes });
      match = re.exec(raw);
    }
    if (!pieces.length && raw) pieces.push({ text: raw, className: '' });
    return pieces;
  }

  function fillWt21(screenEl, screen) {
    screenEl.textContent = '';
    screenEl.classList.remove('grid');
    if (!screen || screen.power === false) return;
    const lines = screen.lines || [];
    for (let i = 0; i < 14; i++) {
      const line = lines[i] || ['', '', ''];
      const row = el('div', 'row');
      ['l', 'c', 'r'].forEach(function (slot) {
        const cell = el('span', slot);
        const source = slot === 'l' ? line[0] : slot === 'c' ? line[2] : line[1];
        styledPieces(source).forEach(function (piece) {
          cell.appendChild(el('span', piece.className, piece.text));
        });
        row.appendChild(cell);
      });
      screenEl.appendChild(row);
    }
  }

  function cellChar(col) {
    const text = col && col.content != null ? String(col.content) : ' ';
    const ch = text.length ? text[0] : ' ';
    if (/[-|+]/.test(ch) && /\bline-/.test(col.styles || '')) return ' ';
    return ch;
  }

  function fillGrid(screenEl, screen, rows, cols) {
    screenEl.textContent = '';
    screenEl.classList.add('grid');
    if (!screen || screen.power === false) return;
    const lines = screen.lines || [];
    for (let r = 0; r < rows; r++) {
      const line = lines[r] || { cols: [] };
      const row = el('div', 'grow ' + (line.rowStyle || ''));
      const cells = line.cols || [];
      for (let c = 0; c < cols; c++) {
        const src = cells[c] || { content: ' ', styles: '' };
        row.appendChild(el('span', 'gl ' + (src.styles || ''), cellChar(src)));
      }
      screenEl.appendChild(row);
    }
  }

  function fillWt737(screenEl, screen) {
    screenEl.textContent = '';
    screenEl.classList.remove('grid');
    if (!screen || screen.power === false) return;
    const lines = screen.lines || [];
    for (let i = 0; i < 14; i++) {
      const line = lines[i] || { cols: [] };
      const row = el('div', 'row737 ' + (line.rowStyle || ''));
      (line.cols || []).forEach(function (col) {
        if (!col || !col.content) return;
        row.appendChild(el('span', col.styles || '', col.content));
      });
      screenEl.appendChild(row);
    }
  }

  function paint() {
    const face = FACES[faceId] || FACES.cj4;
    plate.textContent = both ? face.plate + '  BOTH' : face.plate;
    const uns = face.protocol === 'wt737/uns1';
    faceToggle.hidden = !uns;
    faceToggle.textContent = unsFace === '5in' ? '5 IN' : '4 IN';
    stage.querySelectorAll('.unit').forEach(function (unit) {
      const panel = unit.getAttribute('data-panel') === '2' ? 'right' : 'left';
      const screen = screens[panel];
      const screenEl = unit.querySelector('[data-screen]');
      if (face.screen === 'grid') fillGrid(screenEl, screen, face.rows || 14, face.cols || 24);
      else if (face.screen === 'wt737') fillWt737(screenEl, screen);
      else fillWt21(screenEl, screen);
      const exec = unit.querySelector('[data-key="EXEC"]');
      if (exec) exec.classList.toggle('exec-on', !!(screen && screen.exec));
    });
  }

  function sendEvent(name, which) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !name) return;
    socket.send('event:' + protocol + ':' + which + ':' + name);
  }

  stage.addEventListener('click', function (event) {
    const button = event.target.closest('[data-key]');
    if (!button) return;
    const unit = button.closest('.unit');
    const which = both ? Number(unit.getAttribute('data-panel')) : side;
    activeSide = which;
    button.classList.add('down');
    setTimeout(function () { button.classList.remove('down'); }, 90);
    sendEvent(button.getAttribute('data-key'), which);
  });

  function setStatus(on) {
    statusEl.textContent = on ? 'LINK' : 'NO LINK';
    statusEl.className = 'status ' + (on ? 'on' : 'off');
  }

  function applyPayload(fmcType, json) {
    if (fmcType === 'wt737/wt747') {
      const screen = both ? 'both' : String(side);
      const params = new URLSearchParams(window.location.search);
      params.set('screen', screen);
      window.location.replace('747.html?' + params.toString());
      return;
    }
    if (fmcType === 'wt737') {
      const screen = both ? 'both' : String(side);
      const params = new URLSearchParams(window.location.search);
      params.set('screen', screen);
      window.location.replace('737.html?' + params.toString());
      return;
    }
    if (fmcType && fmcType !== '*' && faceFor(fmcType, json.aircraft, json) === 'cj4') {
      const screen = both ? 'both' : String(side);
      const params = new URLSearchParams(window.location.search);
      params.set('screen', screen);
      window.location.replace('wt21.html?' + params.toString());
      return;
    }
    if (fmcType && fmcType !== '*' && faceFor(fmcType, json.aircraft, json) === 'c90') {
      const screen = both ? 'both' : String(side);
      const params = new URLSearchParams(window.location.search);
      params.set('screen', screen);
      window.location.replace('c90.html?' + params.toString());
      return;
    }
    if (fmcType && fmcType !== '*' && faceFor(fmcType, json.aircraft, json) === 'p180') {
      const screen = both ? 'both' : String(side);
      const params = new URLSearchParams(window.location.search);
      params.set('screen', screen);
      window.location.replace('p180.html?' + params.toString());
      return;
    }
    if (fmcType && fmcType !== '*' && faceFor(fmcType, json.aircraft, json) === 'hawker') {
      const screen = both ? 'both' : String(side);
      const params = new URLSearchParams(window.location.search);
      params.set('screen', screen);
      window.location.replace('hawker.html?' + params.toString());
      return;
    }
    if (fmcType && fmcType !== '*' && faceFor(fmcType, json.aircraft, json) === 'c750') {
      const screen = both ? 'both' : String(side);
      const params = new URLSearchParams(window.location.search);
      params.set('screen', screen);
      window.location.replace('c750.html?' + params.toString());
      return;
    }
    if (fmcType === 'wt737/uns1') {
      window.location.replace('uns.html');
      return;
    }
    if (fmcType && fmcType !== '*') {
      protocol = fmcType;
      faceId = faceFor(fmcType, json.aircraft, json);
    }
    if (json.left) screens.left = json.left;
    if (json.right) screens.right = json.right;
    if (fmcType === '*') {
      if (json.left) screens.left = Object.assign({}, screens.left, { power: json.left.power });
      if (json.right) screens.right = Object.assign({}, screens.right, { power: json.right.power });
    }
    renderStage();
  }

  function connect() {
    let ws;
    try { ws = new WebSocket('ws://' + window.location.hostname + ':' + WS_PORT); }
    catch (e) { setTimeout(connect, backoff); return; }
    socket = ws;
    ws.onopen = function () {
      backoff = 500;
      setStatus(true);
      ws.send('requestUpdate');
    };
    ws.onmessage = function (event) {
      const raw = String(event.data || '');
      if (raw === 'mcduConnected') {
        ws.send('requestUpdate');
        return;
      }
      if (raw.indexOf('update:') !== 0) return;
      const colon = raw.indexOf(':', 7);
      if (colon < 0) return;
      try {
        applyPayload(raw.slice(7, colon), JSON.parse(raw.slice(colon + 1)));
      } catch (e) { /* ignore */ }
    };
    ws.onclose = function () {
      setStatus(false);
      const delay = backoff;
      backoff = Math.min(4000, backoff * 1.5);
      setTimeout(connect, delay);
    };
  }

  document.addEventListener('keydown', function (event) {
    if (event.repeat && event.key !== 'Backspace') return;
    const map = {
      Enter: 'EXEC', Backspace: 'CLR', Delete: 'DEL', ' ': 'SP',
      '/': 'DIV', '.': 'DOT', '+': 'PLUSMINUS', '-': 'PLUSMINUS',
      PageUp: 'PREVPAGE', PageDown: 'NEXTPAGE'
    };
    let name = map[event.key];
    if (!name && /^[a-z0-9]$/i.test(event.key)) name = event.key.toUpperCase();
    if (!name) return;
    event.preventDefault();
    sendEvent(name, both ? activeSide : side);
  });

  sideButtons[1].addEventListener('click', function () { setSide(1); });
  sideButtons[2].addEventListener('click', function () { setSide(2); });
  sideButtons.both.addEventListener('click', function () { setSide('both'); });
  faceToggle.addEventListener('click', function () {
    unsFaceLock = true;
    unsFace = unsFace === '5in' ? '4in' : '5in';
    if (protocol === 'wt737/uns1') faceId = unsFace === '5in' ? 'uns5' : 'uns4';
    renderStage();
  });
  setSide(both ? 'both' : side);
  connect();
})();
