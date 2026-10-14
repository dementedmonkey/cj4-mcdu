/**
 * Citation X / C750 websocket hook.
 * Same load path as dementedmonkey/cj4-mcdu v0.10: this script is imported by
 * the VTX21 FMC page, then it attaches to the wt21-fmc instrument.
 * Modified from that project (GPL-3), 2026-10-11.
 * The current FS2020 Citation FMC has no SETTINGS page, so export stays on.
 * An FMC that registers a settings route keeps the WEBSOCKETS on/off choice.
 */
(function () {
    var LOG = '[LiM CDU]';
    var DEFAULT_IP = '127.0.0.1';
    var DEFAULT_PORT = '8088';

    function aircraftTitle() {
        var title = '';
        try { title = SimVar.GetSimVarValue('TITLE', 'string'); } catch (e) { /* ignore */ }
        if (!title) {
            try { title = SimVar.GetSimVarValue('ATC MODEL', 'string'); } catch (e2) { /* ignore */ }
        }
        return String(title || 'default').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64) || 'default';
    }

    function storeKey(name) {
        return 'lim-cdu/' + aircraftTitle() + '/' + name;
    }

    function readStore(name, fallback) {
        var key = storeKey(name);
        try {
            if (typeof GetStoredData === 'function') {
                var stored = GetStoredData(key);
                if (stored !== undefined && stored !== null && stored !== '') return String(stored);
            }
        } catch (e) { /* ignore */ }
        try {
            if (typeof DataStore !== 'undefined' && DataStore.get) {
                var again = DataStore.get(key);
                if (again !== undefined && again !== null && again !== '') return String(again);
            }
        } catch (e2) { /* ignore */ }
        return fallback;
    }

    function writeStore(name, value) {
        var key = storeKey(name);
        try {
            if (typeof SetStoredData === 'function') SetStoredData(key, value);
        } catch (e) { /* ignore */ }
        try {
            if (typeof DataStore !== 'undefined' && DataStore.set) DataStore.set(key, value);
        } catch (e2) { /* ignore */ }
    }

    var forceExportOn = true;

    function hasSettingsPage(fmc) {
        var routes = fmc && fmc.router && fmc.router.routes;
        if (!routes) return false;
        var keys = Object.keys(routes);
        var i;
        for (i = 0; i < keys.length; i++) {
            var key = String(keys[i]).toLowerCase();
            if (key.indexOf('setting') >= 0) return true;
            var ctor = routes[keys[i]];
            var name = ctor && ctor.name ? String(ctor.name) : '';
            if (name.toLowerCase().indexOf('setting') >= 0) return true;
        }
        return false;
    }

    function noteFmc(fmc) {
        if (!forceExportOn) return;
        if (hasSettingsPage(fmc)) forceExportOn = false;
    }

    function readConfig() {
        var port = parseInt(readStore('ws_port', DEFAULT_PORT), 10);
        return {
            enabled: forceExportOn ? true : readStore('ws_enabled', '1') === '1',
            ip: readStore('ws_ip', DEFAULT_IP) || DEFAULT_IP,
            port: port >= 1 && port <= 65535 ? port : 8088
        };
    }

    function rowText(row) {
        if (Array.isArray(row)) {
            return row.map(function (cell) {
                if (cell == null || typeof cell === 'object') return '';
                return String(cell);
            }).join(' ');
        }
        return row == null || typeof row === 'object' ? '' : String(row);
    }

    function cloneRow(row) {
        if (Array.isArray(row)) return row.slice();
        if (row == null || typeof row === 'object') return ['', ''];
        return [String(row), ''];
    }

    function buttonSuffix(args) {
        var name = args && args.length ? String(args[0]) : '';
        var match = /_BTN_([A-Z0-9]+)$/i.exec(name);
        if (match) return match[1].toUpperCase();
        match = /([LR][1-4])$/.exec(name);
        return match ? match[1].toUpperCase() : name.toUpperCase();
    }

    function plainLetters(cell) {
        if (cell == null || typeof cell === 'object') return '';
        return String(cell).replace(/\[[^\]]*\]/g, '');
    }

    function screenIndex(fmc) {
        var inst = fmc && fmc.instrument;
        var raw = inst && inst.instrumentIndex;
        if (raw === 2 || raw === '2') return 2;
        try {
            var href = String((window.location && window.location.href) || '');
            var match = /[?&]Index=(\d+)/i.exec(href);
            if (match && match[1] === '2') return 2;
        } catch (e) { /* ignore */ }
        return 1;
    }

    function findFmc() {
        var root = document.getElementById('panel') || document.body;
        if (!root || !root.getElementsByTagName) return null;
        var tags = ['wt21-fmc', 'vtx21-fmc', 'hp2000-fmc'];
        for (var i = 0; i < tags.length; i++) {
            var found = root.getElementsByTagName(tags[i]);
            if (found.length && found[0].fsInstrument && found[0].fsInstrument.fmcRenderer) return found[0].fsInstrument;
        }
        var all = root.getElementsByTagName('*');
        for (var n = 0; n < all.length; n++) {
            var inst = all[n].fsInstrument;
            if (inst && inst.fmcRenderer && typeof inst.fmcRenderer.editOutputTemplate === 'function') return inst;
        }
        return null;
    }

    function Sender(fmc) {
        this._fmc = fmc;
        this._model = '';
        try { this._model = SimVar.GetSimVarValue('ATC MODEL', 'string') || ''; } catch (e) { /* ignore */ }
        if (!this._model) {
            try { this._model = SimVar.GetSimVarValue('ATC TYPE', 'string') || ''; } catch (e2) { /* ignore */ }
        }
        this._template = [];
        this._simTemplate = [];
        for (var i = 0; i < 16; i++) {
            this._template.push(['']);
            this._simTemplate.push(['']);
        }
        this._settings = false;
        this._menu = false;
        this._scratch = '';
        this._power = false;
        this._socket = null;
        this._url = '';
        try { this._power = !!fmc.instrument.isElectricityAvailable(); } catch (e3) { /* ignore */ }

        var renderer = fmc.fmcRenderer;
        this._editOutputTemplate = renderer.editOutputTemplate.bind(renderer);
        renderer.editOutputTemplate = this.editOutputTemplate.bind(this);
        renderer.__limCduHooked = true;
        window.__limVtxHooked = true;
        noteFmc(fmc);

        var self = this;
        if (typeof fmc.onInteractionEvent === 'function') {
            var originalEvent = fmc.onInteractionEvent.bind(fmc);
            fmc.onInteractionEvent = function (args) {
                try {
                    var key = buttonSuffix(args);
                    if (self._menu) {
                        if (self.onMenuKey(key)) return;
                        self._menu = false;
                        self._scratch = '';
                        return originalEvent(args);
                    }
                    if (key === 'R1' && self._settings) {
                        self.openMenu();
                        return;
                    }
                    return originalEvent(args);
                } catch (err) {
                    console.warn(LOG, 'key failed', err);
                    self._menu = false;
                }
            };
        }

        var powerOn = fmc.instrument.onPowerOn.bind(fmc.instrument);
        var shutDown = fmc.instrument.onShutDown.bind(fmc.instrument);
        fmc.instrument.onPowerOn = function () { powerOn(); self.setPower(true); };
        fmc.instrument.onShutDown = function () { shutDown(); self.setPower(false); };
        setInterval(function () { self.maintainSocket(); }, 2000);
        console.log(LOG, 'Citation FMC hooked', this._model || '(no ATC MODEL)', 'index', screenIndex(fmc));
    }

    Sender.prototype.editOutputTemplate = function (output, rowIndex) {
        if (this._writing) return;
        this.absorb(output, rowIndex);
        if (this._menu) {
            if (!this.paintMenu()) this._menu = false;
            else return;
        }
        var patched = this.patchSettings(output, rowIndex);
        this._editOutputTemplate(patched, rowIndex);
        var end = Math.min(patched.length, this._template.length - rowIndex);
        for (var i = 0; i < end; i++) this._template[i + rowIndex] = patched[i];
        this.sendData();
    };

    Sender.prototype.absorb = function (output, rowIndex) {
        if (!output) return;
        var end = Math.min(output.length, this._simTemplate.length - rowIndex);
        for (var i = 0; i < end; i++) {
            var at = i + rowIndex;
            this._simTemplate[at] = output[i];
            if (at === 0) {
                var title = rowText(output[i]).toUpperCase();
                this._settings = title.indexOf('SETTINGS') >= 0 && title.indexOf('USER SETTINGS') < 0;
            }
        }
        var written = rowIndex + output.length;
        if (written > (this._seenRows || 0) && written < 30) this._seenRows = written;
    };

    Sender.prototype.patchSettings = function (output, rowIndex) {
        if (!this._settings || !output) return output;
        var local = 1 - rowIndex;
        if (local < 0 || local >= output.length) return output;
        var row = cloneRow(output[local]);
        var right = row.length > 1 && row[1] != null && typeof row[1] !== 'object' ? String(row[1]) : '';
        if (right.toUpperCase().indexOf('WEBSOCKETS') >= 0) return output;
        if (!plainLetters(row[0]).trim()) row[0] = '';
        if (row.length < 2) row.push('WEBSOCKETS>');
        else row[1] = 'WEBSOCKETS>';
        var copy = output.slice();
        copy[local] = row;
        return copy;
    };

    Sender.prototype.menuRows = function () {
        var cfg = readConfig();
        var rows = [];
        var i;
        for (i = 0; i < 16; i++) rows.push(['', '']);
        rows[0] = ['', '1/1', 'WEBSOCKETS'];
        rows[1] = [' EXPORT', ''];
        rows[2] = [cfg.enabled ? '<ON' : '<OFF', ''];
        rows[3] = [' IP ADDRESS', ''];
        rows[4] = [cfg.ip, ''];
        rows[5] = [' PORT', ''];
        rows[6] = [String(cfg.port), ''];
        rows[7] = ['<SETTINGS', ''];
        rows[8] = [this._scratch || '', ''];
        return rows;
    };

    Sender.prototype.rendererRows = function () {
        var renderer = this._fmc && this._fmc.fmcRenderer;
        var rows = renderer && renderer.rows;
        if (rows && typeof rows.length === 'number' && rows.length > 0 && rows.length < 30) return rows.length;
        return 0;
    };

    Sender.prototype.applyRows = function (rows) {
        var limit = this._screenRows || this.rendererRows() || this._seenRows || 14;
        if (limit > rows.length) limit = rows.length;
        this._writing = true;
        try {
            while (limit > 0) {
                try {
                    this._editOutputTemplate(rows.slice(0, limit), 0);
                    this._screenRows = limit;
                    return limit;
                } catch (err) {
                    var msg = String(err && err.message || err);
                    if (msg.indexOf('too many rows') < 0) {
                        console.warn(LOG, 'screen write failed', err);
                        return 0;
                    }
                    limit -= 1;
                }
            }
            return 0;
        } finally {
            this._writing = false;
        }
    };

    Sender.prototype.openMenu = function () {
        this._scratch = '';
        this._menu = true;
        if (!this.paintMenu()) this._menu = false;
    };

    Sender.prototype.paintMenu = function () {
        if (this._painting) return true;
        this._painting = true;
        try {
            var rows = this.menuRows();
            var count = this.applyRows(rows);
            if (!count) return false;
            this._template = rows.slice(0, count);
            while (this._template.length < 15) this._template.push(['']);
            this.sendData();
            return true;
        } catch (err) {
            console.warn(LOG, 'menu paint failed', err);
            return false;
        } finally {
            this._painting = false;
        }
    };

    Sender.prototype.restoreSim = function () {
        var count = this._screenRows || this.rendererRows() || this._seenRows || 14;
        var rows = this._simTemplate.slice(0, count);
        var patched = this.patchSettings(rows, 0);
        if (!patched || !patched.length) patched = rows;
        try {
            this.applyRows(patched);
        } catch (err) {
            console.warn(LOG, 'restore failed', err);
        }
        this._template = patched.slice();
        while (this._template.length < 15) this._template.push(['']);
        this.sendData();
    };

    Sender.prototype.scratchChar = function (key) {
        if (/^[A-Z0-9]$/.test(key)) return key;
        if (key === 'DOT' || key === 'PERIOD' || key === 'DECIMAL' || key === 'POINT') return '.';
        if (key === 'MINUS' || key === 'DASH') return '-';
        return '';
    };

    Sender.prototype.commitField = function (kind) {
        var text = String(this._scratch || '').trim();
        var cfg = readConfig();
        if (!text) {
            this._scratch = kind === 'port' ? String(cfg.port) : cfg.ip;
            this.paintMenu();
            return true;
        }
        if (this._scratch === 'INVALID') {
            this._scratch = '';
            this.paintMenu();
            return true;
        }
        if (kind === 'ip') {
            var parts = text.split('.');
            var ok = parts.length === 4;
            var n;
            for (n = 0; ok && n < 4; n++) {
                if (!/^\d{1,3}$/.test(parts[n]) || Number(parts[n]) > 255) ok = false;
            }
            if (!ok) {
                this._scratch = 'INVALID';
                this.paintMenu();
                return true;
            }
            writeStore('ws_ip', text);
        } else {
            var port = parseInt(text, 10);
            if (!/^\d+$/.test(text) || port < 1 || port > 65535) {
                this._scratch = 'INVALID';
                this.paintMenu();
                return true;
            }
            writeStore('ws_port', String(port));
        }
        this._scratch = '';
        this.paintMenu();
        this.maintainSocket();
        return true;
    };

    Sender.prototype.onMenuKey = function (key) {
        if (key === 'L1') {
            var cfg = readConfig();
            writeStore('ws_enabled', cfg.enabled ? '0' : '1');
            this._scratch = '';
            this.paintMenu();
            this.maintainSocket();
            return true;
        }
        if (key === 'L2') return this.commitField('ip');
        if (key === 'L3') return this.commitField('port');
        if (key === 'L4') {
            this._menu = false;
            this._scratch = '';
            this.restoreSim();
            return true;
        }
        if (/^[LR][1-4]$/.test(key)) return true;
        if (key === 'CLR') {
            this._scratch = '';
            this.paintMenu();
            return true;
        }
        if (key === 'DEL') {
            this._scratch = this._scratch === 'INVALID' ? '' : String(this._scratch || '').slice(0, -1);
            this.paintMenu();
            return true;
        }
        var ch = this.scratchChar(key);
        if (!ch) return false;
        if (this._scratch === 'INVALID') this._scratch = '';
        if (this._scratch.length < 24) this._scratch += ch;
        this.paintMenu();
        return true;
    };

    Sender.prototype.onEvent = function (event) {
        var key = String(event || '').toUpperCase();
        if (this._menu) {
            if (this.onMenuKey(key)) return;
            this._menu = false;
            this._scratch = '';
        }
        if (key === 'R1' && this._settings) {
            this.openMenu();
            return;
        }
        var button = 'CJ4_FMC_' + screenIndex(this._fmc) + '_BTN_' + event;
        this._fmc.onInteractionEvent([button]);
    };

    Sender.prototype.setPower = function (power) {
        this._power = !!power;
        this.sendData();
    };

    Sender.prototype.maintainSocket = function () {
        noteFmc(this._fmc);
        var cfg = readConfig();
        var url = 'ws://' + cfg.ip + ':' + cfg.port;
        if (!cfg.enabled) {
            this._nextConnect = 0;
            this.closeSocket();
            return;
        }
        if (this._url !== url) {
            this._url = url;
            this._nextConnect = 0;
            this.closeSocket();
        }
        var socket = this._socket;
        var now = Date.now();
        // A refused websocket blocks Coherent GT for about two seconds. Leave a
        // connecting socket alone, and wait before opening another.
        if (socket && socket.readyState === 0) {
            if (!this._connectStarted || now - this._connectStarted < 8000) return;
            this.closeSocket();
            this._nextConnect = now + 30000;
            return;
        }
        if (socket && socket.readyState !== 3) return;
        if (this._nextConnect && now < this._nextConnect) return;
        this.connect(url);
    };

    Sender.prototype.closeSocket = function () {
        if (this._socket) {
            try { this._socket.close(); } catch (e) { /* ignore */ }
            this._socket = null;
        }
    };

    Sender.prototype.connect = function (url) {
        var self = this;
        this._connectStarted = Date.now();
        this._nextConnect = this._connectStarted + 30000;
        var socket;
        try { socket = new WebSocket(url); } catch (e) { this._socket = null; return; }
        this._socket = socket;
        socket.onopen = function () {
            self._nextConnect = 0;
            console.log(LOG, 'Connected', url);
            self.sendRaw('mcduConnected');
            self.sendData();
        };
        socket.onclose = function () {
            if (self._socket === socket) self._socket = null;
            var wait = Date.now() + 30000;
            if (!self._nextConnect || self._nextConnect < wait) self._nextConnect = wait;
        };
        socket.addEventListener('message', function (event) {
            var msg = String(event.data || '');
            var prefix = 'event:wt21:' + screenIndex(self._fmc) + ':';
            if (msg.indexOf(prefix) === 0) self.onEvent(msg.substring(prefix.length));
            else if (msg === 'requestUpdate') self.sendData();
        });
    };

    Sender.prototype.sendData = function () {
        if (!this._socket || this._socket.readyState !== 1) return;
        var lines = this._template.slice(0, 15).map(function (line) {
            var cells = Array.isArray(line) ? line.slice() : [line];
            while (cells.length < 3) cells.push('');
            return cells.map(function (cell) {
                if (cell == null || typeof cell === 'object') return '';
                return String(cell);
            });
        });
        var screen = { lines: lines, power: this._power };
        var json = { aircraft: this._model };
        json[screenIndex(this._fmc) === 2 ? 'right' : 'left'] = screen;
        this.sendRaw('update:wt21:' + JSON.stringify(json));
    };

    Sender.prototype.sendRaw = function (message) {
        if (this._socket && this._socket.readyState === 1) this._socket.send(message);
    };

    function tryToHookFmc() {
        if (window.__limVtxHooked) return;
        var fmc = findFmc();
        if (fmc && fmc.fmcRenderer && !fmc.fmcRenderer.__limCduHooked) {
            fmc.limSender = new Sender(fmc);
            return;
        }
        if (!window.__limVtxHooked) window.setTimeout(tryToHookFmc, 500);
    }

    window.setTimeout(tryToHookFmc, 500);
})();
