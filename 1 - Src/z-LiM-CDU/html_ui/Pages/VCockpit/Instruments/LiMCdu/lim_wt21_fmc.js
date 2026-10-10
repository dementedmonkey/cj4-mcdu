/**
 * LiM WT21 CDU websocket export + WEBSOCKETS page.
 * Modified from dementedmonkey/cj4-mcdu (GPL-3), 2026-10-10.
 *
 * Covers every aircraft whose FMC is WT21_FMC: CJ4, C90, C750, P180 (2024),
 * and the FlightFX Hawker 800XP. Those aircraft publish
 * H:CJ4_FMC_{1|2}_BTN_* from the shared WT21 instrument, including the Hawker.
 */
var limCduPlugin = (function (exports, msfsSdk, msfsWt21Shared, msfsWt21Fmc) {
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

    function readConfig() {
        var port = parseInt(readStore('ws_port', DEFAULT_PORT), 10);
        return {
            enabled: readStore('ws_enabled', '0') === '1',
            ip: readStore('ws_ip', DEFAULT_IP) || DEFAULT_IP,
            port: port >= 1 && port <= 65535 ? port : 8088
        };
    }

    /**
     * WT21 FMC hard keys, including FlightFX Hawker 800XP (H25B / TITLE 800XP).
     * The shared instrument emits CJ4_FMC_{index}_BTN_{name}.
     */
    function keyEventName(index, name) {
        return 'CJ4_FMC_' + index + '_BTN_' + name;
    }

    class LimCduPlugin extends msfsWt21Fmc.WT21FmcAvionicsPlugin {
        onInstalled() { }

        registerFmcExtensions(context) {
            var model = '';
            try { model = SimVar.GetSimVarValue('ATC MODEL', 'string'); } catch (e) { /* ignore */ }
            if (!model) {
                try { model = SimVar.GetSimVarValue('ATC TYPE', 'string'); } catch (e2) { /* ignore */ }
            }
            this._model = model || '';
            this._fmcContext = context;
            this._template = [];
            for (var i = 0; i < 16; i++) this._template.push(['']);
            this._power = false;

            var instrument = null;
            try {
                instrument = context.pageFactory.baseInstrument.instrument;
            } catch (e3) { /* ignore */ }
            this._instrument = instrument;
            if (instrument) {
                var powerOn = instrument.onPowerOn.bind(instrument);
                var shutDown = instrument.onShutDown.bind(instrument);
                var self = this;
                instrument.onPowerOn = function () { powerOn(); self.setPower(true); };
                instrument.onShutDown = function () { shutDown(); self.setPower(false); };
                this._power = !!instrument.isElectricityAvailable();
            }

            var renderer = context.renderer;
            if (renderer && !renderer.__limCduHooked) {
                var original = renderer.renderToDom.bind(renderer);
                var plugin = this;
                renderer.renderToDom = function () {
                    var value = original.apply(renderer, arguments);
                    plugin.onRendered();
                    return value;
                };
                renderer.__limCduHooked = true;
            }

            this.registerPages(context);
            var selfPoll = this;
            setInterval(function () { selfPoll.maintainSocket(); }, 2000);
            console.log(LOG, 'WT21 hook', this._model || '(no ATC MODEL)', 'key', keyEventName(this.fmcIndex(), 'L1'));
        }

        fmcIndex() {
            var index = this._fmcContext && this._fmcContext.fmcIndex;
            return index === 2 ? 2 : 1;
        }

        registerPages(context) {
            var Page = msfsWt21Fmc && msfsWt21Fmc.WT21FmcPage;
            var Menu = msfsWt21Fmc && msfsWt21Fmc.MCDUMenuPage;
            if (!Page || !msfsSdk || !msfsSdk.PageLinkField || typeof context.addPluginPageRoute !== 'function') {
                console.warn(LOG, 'WT21 page API missing — WEBSOCKETS page skipped');
                return;
            }

            class LimWebsocketsPage extends Page {
                constructor() {
                    super(...arguments);
                    var cfg = readConfig();
                    this.enabledSubject = msfsSdk.Subject.create(cfg.enabled ? 1 : 0);
                    this.ipSubject = msfsSdk.Subject.create(cfg.ip);
                    this.portSubject = msfsSdk.Subject.create(String(cfg.port));
                    this.exportSwitch = new msfsSdk.SwitchLabel(this, {
                        optionStrings: ['OFF', 'ON'],
                        activeStyle: 'green'
                    }).bind(this.enabledSubject);
                    this.ipField = new msfsSdk.TextInputField(this, {
                        formatter: {
                            nullValueString: DEFAULT_IP,
                            format: function (value) { return String(value || DEFAULT_IP); },
                            parse: function (value) {
                                var text = String(value || '').trim();
                                if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) return null;
                                return text;
                            }
                        }
                    }).bind(this.ipSubject);
                    this.portField = new msfsSdk.TextInputField(this, {
                        formatter: {
                            nullValueString: DEFAULT_PORT,
                            format: function (value) { return String(value || DEFAULT_PORT); },
                            parse: function (value) {
                                var port = parseInt(String(value || '').trim(), 10);
                                if (!port || port < 1 || port > 65535) return null;
                                return String(port);
                            }
                        }
                    }).bind(this.portSubject);
                    this.menuLink = msfsSdk.PageLinkField.createLink(this, '<MCDU MENU', '/mcdu-menu');
                    this.enabledSubject.sub(function (value) { writeStore('ws_enabled', value === 1 ? '1' : '0'); });
                    this.ipSubject.sub(function (value) { if (value) writeStore('ws_ip', value); });
                    this.portSubject.sub(function (value) { if (value) writeStore('ws_port', value); });
                }

                render() {
                    return [[
                        ['', '', 'WEBSOCKETS[blue]'],
                        [' EXPORT[blue]', ''],
                        [this.exportSwitch, ''],
                        [' IP ADDRESS[blue]', ''],
                        [this.ipField, ''],
                        [' PORT[blue]', ''],
                        [this.portField, ''],
                        ['', ''],
                        [' MATCH cdu-server.cfg simPort', ''],
                        ['', ''],
                        ['', ''],
                        ['', ''],
                        [this.menuLink, '']
                    ]];
                }
            }

            class LimMenuExtension extends msfsSdk.AbstractFmcPageExtension {
                constructor() {
                    super(...arguments);
                    this.link = msfsSdk.PageLinkField.createLink(this.page, 'WEBSOCKETS>', '/lim/websockets');
                }

                onPageRendered(templates) {
                    var page = templates && templates[0];
                    if (!page) return;
                    while (page.length < 11) page.push(['', '']);
                    var row = page[10] || ['', ''];
                    page[10] = [row[0] || '', this.link];
                }
            }

            try {
                context.addPluginPageRoute('/lim/websockets', LimWebsocketsPage, undefined, null);
                if (Menu && typeof context.attachPageExtension === 'function') {
                    context.attachPageExtension(Menu, LimMenuExtension);
                }
                console.log(LOG, 'Registered MCDU MENU RSK5 WEBSOCKETS>');
            } catch (e) {
                console.warn(LOG, 'WEBSOCKETS page failed', e);
            }
        }

        onRendered() {
            var rows = this._fmcContext && this._fmcContext.renderer && this._fmcContext.renderer.currentOutput;
            if (!rows) return;
            var end = Math.min(rows.length, this._template.length);
            for (var i = 0; i < end; i++) this._template[i] = rows[i];
            this.sendData();
        }

        setPower(state) {
            this._power = !!state;
            this.sendData();
        }

        maintainSocket() {
            var cfg = readConfig();
            var url = 'ws://' + cfg.ip + ':' + cfg.port;
            if (!cfg.enabled) {
                this.closeSocket();
                return;
            }
            if (this._url !== url) this.closeSocket();
            this._url = url;
            if (!this._socket || this._socket.readyState !== 1) this.connect(url);
        }

        closeSocket() {
            if (this._socket) {
                try { this._socket.close(); } catch (e) { /* ignore */ }
                this._socket = null;
            }
        }

        connect(url) {
            this.closeSocket();
            var self = this;
            var socket = new WebSocket(url);
            this._socket = socket;
            socket.onopen = function () {
                console.log(LOG, 'Connected', url);
                self.sendRaw('mcduConnected');
                self.sendData();
            };
            socket.addEventListener('message', function (event) {
                var msg = String(event.data || '');
                var prefix = 'event:wt21:' + self.fmcIndex() + ':';
                if (msg.indexOf(prefix) === 0) self.onEvent(msg.substring(prefix.length));
                else if (msg === 'requestUpdate') self.sendData();
            });
        }

        onEvent(name) {
            var button = keyEventName(this.fmcIndex(), name);
            var instrument = this._instrument;
            if (instrument && typeof instrument.onInteractionEvent === 'function') {
                instrument.onInteractionEvent([button]);
            }
        }

        sendData() {
            if (!this._socket || this._socket.readyState !== 1) return;
            var lines = this._template.slice(0, 15).map(function (line) {
                var cells = Array.isArray(line) ? line.slice() : [line];
                while (cells.length < 3) cells.push('');
                return cells.map(function (cell) { return cell == null ? '' : String(cell); });
            });
            var screen = { lines: lines, power: this._power };
            var json = { aircraft: this._model };
            json[this.fmcIndex() === 2 ? 'right' : 'left'] = screen;
            this.sendRaw('update:wt21:' + JSON.stringify(json));
        }

        sendRaw(message) {
            if (this._socket && this._socket.readyState === 1) this._socket.send(message);
        }
    }

    msfsSdk.registerPlugin(LimCduPlugin);
    return exports;
})({}, msfssdk, typeof wt21_shared == 'undefined' ? msfswt21shared : wt21_shared, wt21_fmc);
