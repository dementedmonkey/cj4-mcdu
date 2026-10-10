/**
 * FS2020 FFX P180 hook. Modified from dementedmonkey/cj4-mcdu (GPL-3), 2026-10-10.
 * The 2020 instrument is not the WT21 plugin host, so this file reads the same
 * cloud-store WEBSOCKETS settings the WT21 page writes. Export stays OFF
 * until those keys are ON. Key events use CJ4_FMC_{index}_BTN_*.
 */
(function (msfssdk) {
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

    function readStore(name, fallback) {
        try {
            if (typeof GetStoredData === 'function') {
                var stored = GetStoredData('lim-cdu/' + aircraftTitle() + '/' + name);
                if (stored !== undefined && stored !== null && stored !== '') return String(stored);
            }
        } catch (e) { /* ignore */ }
        return fallback;
    }

    function readConfig() {
        var port = parseInt(readStore('ws_port', DEFAULT_PORT), 10);
        return {
            enabled: readStore('ws_enabled', '0') === '1',
            ip: readStore('ws_ip', DEFAULT_IP) || DEFAULT_IP,
            port: port >= 1 && port <= 65535 ? port : 8088
        };
    }

    class LimP180Sender {
        constructor(fmc) {
            this._fmc = fmc;
            this._model = SimVar.GetSimVarValue('ATC MODEL', 'string') || SimVar.GetSimVarValue('ATC TYPE', 'string');
            this._editOutputTemplate = fmc.fmcRenderer.editOutputTemplate.bind(fmc.fmcRenderer);
            fmc.fmcRenderer.editOutputTemplate = this.editOutputTemplate.bind(this);
            var powerOn = fmc.instrument.onPowerOn.bind(fmc.instrument);
            var shutDown = fmc.instrument.onShutDown.bind(fmc.instrument);
            var self = this;
            fmc.instrument.onPowerOn = function () { powerOn(); self.setPower(true); };
            fmc.instrument.onShutDown = function () { shutDown(); self.setPower(false); };
            this._template = [];
            for (var i = 0; i < 16; i++) this._template.push(['']);
            this._power = fmc.instrument.isElectricityAvailable();
            setInterval(function () { self.maintainSocket(); }, 2000);
        }

        editOutputTemplate(output, rowIndex) {
            this._editOutputTemplate(output, rowIndex);
            var end = Math.min(output.length, this._template.length - rowIndex);
            for (var i = 0; i < end; i++) this._template[i + rowIndex] = output[i];
            this.sendData();
        }

        setPower(power) {
            this._power = power;
            this.sendData();
        }

        maintainSocket() {
            var cfg = readConfig();
            var url = 'ws://' + cfg.ip + ':' + cfg.port;
            if (!cfg.enabled) {
                if (this._socket) { try { this._socket.close(); } catch (e) { /* ignore */ } this._socket = null; }
                return;
            }
            if (this._url !== url && this._socket) {
                try { this._socket.close(); } catch (e2) { /* ignore */ }
                this._socket = null;
            }
            this._url = url;
            if (!this._socket || this._socket.readyState !== 1) this.connect(url);
        }

        connect(url) {
            if (this._socket) { try { this._socket.close(); } catch (e) { /* ignore */ } }
            var self = this;
            this._socket = new WebSocket(url);
            this._socket.onopen = function () { self.sendRaw('mcduConnected'); self.sendData(); };
            this._socket.addEventListener('message', function (event) {
                var msg = String(event.data || '');
                var index = self._fmc.instrument.instrumentIndex;
                var prefix = 'event:wt21:' + index + ':';
                if (msg.indexOf(prefix) === 0) {
                    self._fmc.onInteractionEvent(['CJ4_FMC_' + index + '_BTN_' + msg.substring(prefix.length)]);
                } else if (msg === 'requestUpdate') self.sendData();
            });
        }

        sendData() {
            if (!this._socket || this._socket.readyState !== 1) return;
            var lines = this._template.slice(0, 15).map(function (line) {
                var cells = Array.isArray(line) ? line.slice() : [line];
                while (cells.length < 3) cells.push('');
                return cells.map(function (cell) { return cell == null ? '' : String(cell); });
            });
            var screen = { lines: lines, power: this._power };
            var json = { aircraft: this._model || 'P180' };
            json[this._fmc.instrument.instrumentIndex == 2 ? 'right' : 'left'] = screen;
            this.sendRaw('update:wt21:' + JSON.stringify(json));
        }

        sendRaw(message) {
            if (this._socket && this._socket.readyState === 1) this._socket.send(message);
        }
    }

    function tryToHookFmc() {
        var registered = false;
        var panel = window.document.getElementById('panel');
        if (panel) {
            var elements = panel.getElementsByTagName('wt21-fmc');
            if (elements.length > 0) {
                var fmc = elements[0].fsInstrument;
                if (fmc && !fmc.__limCdu) {
                    fmc.__limCdu = new LimP180Sender(fmc);
                    console.log('[LiM CDU] FS2020 P180 hooked');
                }
                registered = true;
            }
        }
        if (!registered) window.setTimeout(tryToHookFmc, 500);
    }

    window.setTimeout(tryToHookFmc, 500);
})(typeof msfssdk !== 'undefined' ? msfssdk : {});
