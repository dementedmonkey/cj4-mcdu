/**
 * FS2020 FlightFX P180 hook. Same load path as dementedmonkey/cj4-mcdu 0.10.0:
 * the FFX21 FMC page imports the sim FMC.js, then this script.
 * The 2020 instrument is not the WT21 plugin host.
 * This FMC has no WEBSOCKETS page, so export stays on.
 * Modified from that project (GPL-3), 2026-10-14.
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

    function readConfig() {
        var port = parseInt(readStore('ws_port', DEFAULT_PORT), 10);
        return {
            enabled: true,
            ip: readStore('ws_ip', DEFAULT_IP) || DEFAULT_IP,
            port: port >= 1 && port <= 65535 ? port : 8088
        };
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

    function LimP180Sender(fmc) {
        this._fmc = fmc;
        this._model = '';
        try { this._model = SimVar.GetSimVarValue('ATC MODEL', 'string') || ''; } catch (e) { /* ignore */ }
        if (!this._model) {
            try { this._model = SimVar.GetSimVarValue('ATC TYPE', 'string') || ''; } catch (e2) { /* ignore */ }
        }
        this._template = [];
        for (var i = 0; i < 16; i++) this._template.push(['']);
        this._power = false;
        this._socket = null;
        this._url = '';
        this._nextConnect = 0;
        this._connectStarted = 0;
        try { this._power = !!fmc.instrument.isElectricityAvailable(); } catch (e3) { /* ignore */ }

        var renderer = fmc.fmcRenderer;
        this._editOutputTemplate = renderer.editOutputTemplate.bind(renderer);
        renderer.editOutputTemplate = this.editOutputTemplate.bind(this);

        var self = this;
        var powerOn = fmc.instrument.onPowerOn.bind(fmc.instrument);
        var shutDown = fmc.instrument.onShutDown.bind(fmc.instrument);
        fmc.instrument.onPowerOn = function () { powerOn(); self.setPower(true); };
        fmc.instrument.onShutDown = function () { shutDown(); self.setPower(false); };
        setInterval(function () { self.maintainSocket(); }, 2000);
        console.log(LOG, 'FS2020 P180 hooked', this._model || '(no ATC MODEL)', 'index', screenIndex(fmc));
    }

    LimP180Sender.prototype.editOutputTemplate = function (output, rowIndex) {
        this._editOutputTemplate(output, rowIndex);
        if (!output) return;
        var end = Math.min(output.length, this._template.length - rowIndex);
        for (var i = 0; i < end; i++) this._template[i + rowIndex] = output[i];
        this.sendData();
    };

    LimP180Sender.prototype.setPower = function (power) {
        this._power = !!power;
        this.sendData();
    };

    LimP180Sender.prototype.maintainSocket = function () {
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

    LimP180Sender.prototype.closeSocket = function () {
        if (this._socket) {
            try { this._socket.close(); } catch (e) { /* ignore */ }
            this._socket = null;
        }
    };

    LimP180Sender.prototype.connect = function (url) {
        var self = this;
        this._connectStarted = Date.now();
        this._nextConnect = this._connectStarted + 30000;
        var socket;
        try { socket = new WebSocket(url); } catch (e) { this._socket = null; return; }
        this._socket = socket;
        socket.onopen = function () {
            self._nextConnect = 0;
            console.log(LOG, 'P180 connected', url);
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
            var index = screenIndex(self._fmc);
            var prefix = 'event:wt21:' + index + ':';
            if (msg.indexOf(prefix) === 0 && self._fmc && typeof self._fmc.onInteractionEvent === 'function') {
                self._fmc.onInteractionEvent(['CJ4_FMC_' + index + '_BTN_' + msg.substring(prefix.length)]);
            } else if (msg === 'requestUpdate') self.sendData();
        });
    };

    LimP180Sender.prototype.sendData = function () {
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
        var json = { aircraft: this._model || 'P180' };
        json[screenIndex(this._fmc) === 2 ? 'right' : 'left'] = screen;
        this.sendRaw('update:wt21:' + JSON.stringify(json));
    };

    LimP180Sender.prototype.sendRaw = function (message) {
        if (this._socket && this._socket.readyState === 1) this._socket.send(message);
    };

    function tryToHookFmc() {
        var panel = window.document && window.document.getElementById('panel');
        var elements = panel && panel.getElementsByTagName ? panel.getElementsByTagName('wt21-fmc') : [];
        if (elements.length > 0) {
            var fmc = elements[0].fsInstrument;
            if (fmc && fmc.fmcRenderer && !fmc.__limCdu) {
                fmc.__limCdu = new LimP180Sender(fmc);
                return;
            }
        }
        window.setTimeout(tryToHookFmc, 500);
    }

    window.setTimeout(tryToHookFmc, 500);
})();
