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
            enabled: readStore('ws_enabled', '1') === '1',
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

    var FmcBase = (msfsWt21Fmc && msfsWt21Fmc.WT21FmcAvionicsPlugin) ? msfsWt21Fmc.WT21FmcAvionicsPlugin : class {};

    class LimCduPlugin extends FmcBase {
        onInstalled() { }

        registerFmcExtensions(context) {
            if (typeof window !== 'undefined' && window.__limVtxHooked) {
                console.log(LOG, 'Citation page hook already running');
                return;
            }
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
            var plugin = this;
            var Page = msfsWt21Fmc && msfsWt21Fmc.WT21FmcPage;
            var Index = msfsWt21Fmc && msfsWt21Fmc.IndexPage;
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
                    var backName = String(plugin._model || '');
                    try { backName += ' ' + SimVar.GetSimVarValue('TITLE', 'string'); } catch (eBack) { /* ignore */ }
                    var backToSettings = /C750|CE-?750|CITATION\s*X\b/i.test(backName);
                    this.menuLink = msfsSdk.PageLinkField.createLink(this, backToSettings ? '<SETTINGS' : '<INDEX', backToSettings ? '/user-set' : '/index');
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
                        ['', ''],
                        ['', ''],
                        ['', ''],
                        ['', ''],
                        [this.menuLink, '']
                    ]];
                }
            }

            class LimIndexExtension extends msfsSdk.AbstractFmcPageExtension {
                constructor() {
                    super(...arguments);
                    this.link = msfsSdk.PageLinkField.createLink(this.page, 'WEBSOCKETS>', '/lim/websockets');
                }

                onPageRendered(templates) {
                    var page = templates && templates[1];
                    if (!page) return;
                    while (page.length < 11) page.push(['', '']);
                    var row = page[10] || ['', ''];
                    page[10] = [row[0] || '', this.link];
                }
            }

            class LimSettingsExtension extends msfsSdk.AbstractFmcPageExtension {
                constructor() {
                    super(...arguments);
                    this.link = msfsSdk.PageLinkField.createLink(this.page, 'WEBSOCKETS>', '/lim/websockets');
                }

                onPageRendered(templates) {
                    var page = templates && templates[0];
                    if (!page) return;
                    while (page.length < 7) page.push(['', '']);
                    var row = page[6];
                    if (!Array.isArray(row)) row = ['', ''];
                    page[6] = [row[0] || '', this.link];
                }
            }

            function citationX() {
                var name = String(plugin._model || '');
                try { name += ' ' + SimVar.GetSimVarValue('TITLE', 'string'); } catch (eTitle) { /* ignore */ }
                try { name += ' ' + SimVar.GetSimVarValue('ATC MODEL', 'string'); } catch (eModel) { /* ignore */ }
                try { name += ' ' + SimVar.GetSimVarValue('ATC TYPE', 'string'); } catch (eType) { /* ignore */ }
                return /C750|CE-?750|CITATION\s*X\b/i.test(name);
            }

            function plainCell(cell) {
                if (cell == null || typeof cell === 'object') return '';
                return String(cell).replace(/\[[^\]]*\]/g, '');
            }

            function rowPlain(row) {
                if (!Array.isArray(row)) return plainCell(row);
                return row.map(plainCell).join(' ').replace(/\s+/g, ' ').trim();
            }

            function pageList(rendered) {
                if (!Array.isArray(rendered) || !rendered.length || !Array.isArray(rendered[0])) return [];
                if (Array.isArray(rendered[0][0])) return rendered;
                return [rendered];
            }

            function injectSettingsLink(page, rendered) {
                if (!citationX() || !page || !msfsSdk.PageLinkField) return rendered;
                var pages = pageList(rendered);
                for (var i = 0; i < pages.length; i++) {
                    var rows = pages[i];
                    if (!rows || !rows.length) continue;
                    var title = rowPlain(rows[0]).toUpperCase();
                    if (title.indexOf('SETTINGS') < 0 || title.indexOf('USER SETTINGS') >= 0) continue;
                    while (rows.length < 2) rows.push(['', '']);
                    var row = rows[1];
                    if (!Array.isArray(row)) row = ['', ''];
                    if (rowPlain(row).toUpperCase().indexOf('WEBSOCKETS') >= 0) continue;
                    if (!page.__limWsLink) {
                        try {
                            page.__limWsLink = msfsSdk.PageLinkField.createLink(page, 'WEBSOCKETS>', '/lim/websockets');
                        } catch (eLink) {
                            return rendered;
                        }
                    }
                    rows[1] = [row[0] || '', page.__limWsLink];
                }
                return rendered;
            }

            function hookPageRender(Ctor) {
                if (!Ctor || !Ctor.prototype || Ctor.prototype.__limSettingsHook || typeof Ctor.prototype.render !== 'function') return;
                var original = Ctor.prototype.render;
                Ctor.prototype.__limSettingsHook = true;
                Ctor.prototype.render = function () {
                    var rendered = original.apply(this, arguments);
                    try { return injectSettingsLink(this, rendered); } catch (eHook) { return rendered; }
                };
            }

            function hookExportedPages(root, seen) {
                if (!root || (typeof root !== 'object' && typeof root !== 'function') || seen.indexOf(root) >= 0) return;
                seen.push(root);
                var names = [];
                try { names = Object.getOwnPropertyNames(root); } catch (eNames) { return; }
                for (var i = 0; i < names.length; i++) {
                    var value;
                    try { value = root[names[i]]; } catch (eValue) { continue; }
                    if (typeof value === 'function') hookPageRender(value);
                }
            }

            function hookLiveScreen(root, seen, depth) {
                if (!root || typeof root !== 'object' || seen.indexOf(root) >= 0 || depth > 4) return;
                seen.push(root);
                var page = root.currentPage || root.currentlyDisplayedPage;
                if (page && typeof root.render === 'function' && !root.__limScreenHook) {
                    root.__limScreenHook = true;
                    var original = root.render.bind(root);
                    root.render = function () {
                        var active = root.currentPage || root.currentlyDisplayedPage;
                        if (active && !active.__limSettingsHook && typeof active.render === 'function') {
                            active.__limSettingsHook = true;
                            var pageRender = active.render.bind(active);
                            active.render = function () {
                                var rendered = pageRender.apply(active, arguments);
                                try { return injectSettingsLink(active, rendered); } catch (ePage) { return rendered; }
                            };
                        }
                        return original();
                    };
                    return;
                }
                var keys = [];
                try { keys = Object.keys(root); } catch (eKeys) { return; }
                for (var i = 0; i < keys.length && i < 30; i++) {
                    hookLiveScreen(root[keys[i]], seen, depth + 1);
                }
            }

            var Settings = msfsWt21Fmc && msfsWt21Fmc.UserSettingsPage;

            var citation = citationX();

            try {
                context.addPluginPageRoute('/lim/websockets', LimWebsocketsPage, undefined, null);
                if (citation && typeof context.attachPageExtension === 'function') {
                    hookExportedPages(msfsWt21Fmc, []);
                    hookLiveScreen(context, [], 0);
                    if (plugin._instrument) hookLiveScreen(plugin._instrument, [], 0);
                    if (Settings) context.attachPageExtension(Settings, LimSettingsExtension);
                    console.log(LOG, 'Registered C750 SETTINGS RSK1 WEBSOCKETS');
                } else if (Index && typeof context.attachPageExtension === 'function') {
                    context.attachPageExtension(Index, LimIndexExtension);
                    console.log(LOG, 'Registered IDX 2/2 RSK5 WEBSOCKETS');
                } else if (citation) {
                    console.warn(LOG, 'C750 settings page missing — WEBSOCKETS link skipped');
                }
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
        }

        closeSocket() {
            if (this._socket) {
                try { this._socket.close(); } catch (e) { /* ignore */ }
                this._socket = null;
            }
        }

        connect(url) {
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

    if (msfsWt21Fmc && msfsWt21Fmc.WT21FmcAvionicsPlugin && msfsSdk && typeof msfsSdk.registerPlugin === 'function') {
        try {
            msfsSdk.registerPlugin(LimCduPlugin);
        } catch (eReg) {
            console.warn(LOG, 'WT21 plugin register failed', eReg);
        }
    } else {
        console.warn(LOG, 'WT21 FMC plugin API missing');
    }
    return exports;
})(
    {},
    typeof msfssdk !== 'undefined' ? msfssdk : {},
    typeof wt21_shared !== 'undefined' ? wt21_shared : (typeof msfswt21shared !== 'undefined' ? msfswt21shared : {}),
    typeof wt21_fmc !== 'undefined' ? wt21_fmc : null
);
