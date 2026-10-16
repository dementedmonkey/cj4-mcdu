/**
 * LiM 737 MAX CDU websocket export + MENU WEBSOCKETS page.
 * Modified from dementedmonkey/cj4-mcdu dm_cdu.js (GPL-3), 2026-10-10.
 * Export is OFF until MENU → WEBSOCKETS> is turned ON.
 */
(function () {
    var LOG = '[LiM CDU]';
    var DEFAULT_IP = '127.0.0.1';
    var DEFAULT_PORT = '8088';

    function override(object, methodName, callback) {
        object[methodName] = callback(object[methodName]);
    }

    function after(extraBehavior) {
        return function (original) {
            return function () {
                var returnValue = original.apply(this, arguments);
                extraBehavior.apply(this, arguments);
                return returnValue;
            };
        };
    }

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
        try {
            if (typeof GetStoredData === 'function') {
                var stored = GetStoredData(storeKey(name));
                if (stored !== undefined && stored !== null && stored !== '') return String(stored);
            }
        } catch (e) { /* ignore */ }
        return fallback;
    }

    function writeStore(name, value) {
        try {
            if (typeof SetStoredData === 'function') SetStoredData(storeKey(name), value);
        } catch (e) { /* ignore */ }
    }

    function readConfig() {
        var port = parseInt(readStore('ws_port', DEFAULT_PORT), 10);
        return {
            enabled: readStore('ws_enabled', '1') === '1',
            ip: readStore('ws_ip', DEFAULT_IP) || DEFAULT_IP,
            port: port >= 1 && port <= 65535 ? port : 8088
        };
    }

    class Lim737Hook {
        constructor(cdu) {
            this._model = '';
            try { this._model = SimVar.GetSimVarValue('ATC MODEL', 'string'); } catch (e) { /* ignore */ }
            this._cdu = cdu;
            override(cdu, 'onAfterRender', after(this.onAfterRender.bind(this)));
            var element = document.getElementsByTagName('wtb38m-cdu')[0];
            this._instrument = element && element.fsInstrument;
            if (this._instrument && typeof this._instrument.onPowerOn === 'function') {
                override(this._instrument, 'onPowerOn', after(this.sendData.bind(this)));
            }
            var self = this;
            setInterval(function () { self.maintainSocket(); }, 2000);
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
                console.log(LOG, '737 connected', url);
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
                var prefix = 'event:wt737:' + self._cdu.cduSideIndex + ':';
                if (msg.indexOf(prefix) === 0) self._cdu.handleCduHEvent(msg.substring(prefix.length));
                else if (msg === 'requestUpdate') self.sendData();
            });
        }

        rowStyles() {
            if (this._rowStyles) return this._rowStyles;
            var rowElements = this._cdu.fmcScreen.renderer.rowElArr;
            this._rowStyles = rowElements.map(function (row) {
                return row.attributes['class'] ? row.attributes['class'].value : '';
            });
            return this._rowStyles;
        }

        sendData() {
            if (!this._socket || this._socket.readyState !== 1) return;
            var fmcScreen = this._cdu.fmcScreen;
            if (!fmcScreen || !fmcScreen.renderer) return;
            var renderer = fmcScreen.renderer;
            var rowStyles = this.rowStyles();
            var lines = [];
            for (var row = 0; row < renderer.columnData.length; row++) {
                lines.push({
                    rowStyle: rowStyles.length > row ? rowStyles[row] : '',
                    cols: renderer.columnData[row]
                });
            }
            var execActive = false;
            try { execActive = SimVar.GetSimVarValue('L:FMC_EXEC_ACTIVE', 'number') === 1; } catch (e) { /* ignore */ }
            var screen = {
                lines: lines,
                exec: execActive,
                power: !!(this._instrument && this._instrument.isPowered)
            };
            var json = { aircraft: this._model };
            json[this._cdu.cduSideIndex == 2 ? 'right' : 'left'] = screen;
            this.sendRaw('update:wt737:' + JSON.stringify(json));
        }

        sendRaw(message) {
            if (this._socket && this._socket.readyState === 1) this._socket.send(message);
        }

        onAfterRender() {
            var renderer = this._cdu.fmcScreen && this._cdu.fmcScreen.renderer;
            if (renderer && !renderer.__limCduHooked) {
                override(renderer, 'renderToDom', after(this.sendData.bind(this)));
                renderer.__limCduHooked = true;
            }
            if (this._cdu.fmcScreen && !this._cdu.fmcScreen.__limWsPagesReady) {
                try { registerPages(this._cdu.fmcScreen); } catch (e) { console.warn(LOG, e); }
                this._cdu.fmcScreen.__limWsPagesReady = true;
            }
        }
    }

    function cellText(cell) {
        if (typeof cell === 'string') return cell;
        if (!cell || typeof cell !== 'object') return '';
        if (typeof cell.value === 'string') return cell.value;
        if (typeof cell.text === 'string') return cell.text;
        if (typeof cell.label === 'string') return cell.label;
        return '';
    }

    function patchMenu(template) {
        var pages = template;
        if (!pages || !pages.length || !pages[0]) return template;
        var rows = Array.isArray(pages[0][0]) ? pages[0] : pages;
        var link = this.__limWsLink || (this.__limWsLink = PageLinkField.createLink(this, 'WEBSOCKETS>', '/websockets'));
        var settingsRow = -1;
        var i;
        var row;
        var text;
        for (i = 0; i < rows.length; i++) {
            row = rows[i] || [];
            text = cellText(row[0]) + ' ' + cellText(row[1]) + ' ' + cellText(row[2]);
            if (text.indexOf('WEBSOCKETS') !== -1) return pages;
            if (text.indexOf('SETTINGS') !== -1) settingsRow = i;
        }
        // SETTINGS is RSK 6. RSK 5 is the right cell two rows above it.
        var target = settingsRow >= 2 ? settingsRow - 2 : 10;
        row = rows[target] || ['', ''];
        if (!row[1]) rows[target] = [row[0] || '', link, row[2] || ''];
        return pages;
    }

    function registerPages(fmcScreen) {
        if (typeof PageLinkField === 'undefined' || typeof SwitchLabel === 'undefined' || typeof TextInputField === 'undefined' || typeof Subject === 'undefined') {
            console.warn(LOG, '737 FMC field classes missing — WEBSOCKETS page skipped');
            return;
        }
        var menuCtor = fmcScreen.router && fmcScreen.router.getPageForRoute && fmcScreen.router.getPageForRoute('/menu');
        var Base = menuCtor;
        if (!Base) {
            console.warn(LOG, '737 MENU page missing — WEBSOCKETS page skipped');
            return;
        }
        if (!Base.__limWsPatched && Base.prototype && typeof Base.prototype.render === 'function') {
            var orig = Base.prototype.render;
            Base.prototype.render = function () {
                return patchMenu.call(this, orig.call(this));
            };
            Base.__limWsPatched = true;
        }

        class LimWebsocketsPage extends Base {
            constructor(bus, screen, fms, renderCallback) {
                super(bus, screen, fms, renderCallback);
                var cfg = readConfig();
                this.enabledSubject = Subject.create(cfg.enabled ? 1 : 0);
                this.ipSubject = Subject.create(cfg.ip);
                this.portSubject = Subject.create(String(cfg.port));
                this.exportSwitch = new SwitchLabel(this, {
                    optionStrings: ['OFF', 'ON'],
                    activeStyle: 'green'
                }).bind(this.enabledSubject);
                this.ipField = new TextInputField(this, {
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
                this.portField = new TextInputField(this, {
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
                this.menuLink = PageLinkField.createLink(this, 'MENU>', '/menu');
                this.enabledSubject.sub(function (value) { writeStore('ws_enabled', value === 1 ? '1' : '0'); });
                this.ipSubject.sub(function (value) { if (value) writeStore('ws_ip', value); });
                this.portSubject.sub(function (value) { if (value) writeStore('ws_port', value); });
            }

            render() {
                return [[
                    ['', '', 'WEBSOCKETS'],
                    [' EXPORT'],
                    [this.exportSwitch],
                    [' IP ADDRESS'],
                    [this.ipField],
                    [' PORT'],
                    [this.portField],
                    ['', ''],
                    ['', ''],
                    ['', ''],
                    ['', ''],
                    ['', ''],
                    ['', ''],
                    ['', this.menuLink, '']
                ]];
            }
        }

        if (typeof fmcScreen.addPageRoute === 'function') {
            fmcScreen.addPageRoute('/websockets', LimWebsocketsPage);
            console.log(LOG, '737 MENU WEBSOCKETS> registered');
        }
    }

    class PluginSystem {
        onComponentCreating() { return undefined; }
        onComponentRendered() { }
        onComponentCreated(instance) {
            if (!instance || instance.__lim737) return;
            var name = instance.constructor && instance.constructor.name;
            var isCdu = name === 'B38MCdu' || (instance.fmcScreen && instance.cduSideIndex != null && typeof instance.handleCduHEvent === 'function' && typeof instance.onAfterRender === 'function');
            if (!isCdu) return;
            instance.__lim737 = true;
            new Lim737Hook(instance);
            console.log(LOG, 'Attached 737 CDU hook', name || 'cdu');
        }
        onAfterRender() { }
    }

    if (!window._pluginSystem) {
        window._pluginSystem = new PluginSystem();
    } else {
        var prev = window._pluginSystem;
        var chained = new PluginSystem();
        var orig = prev.onComponentCreated ? prev.onComponentCreated.bind(prev) : null;
        prev.onComponentCreated = function (instance) {
            if (orig) orig(instance);
            chained.onComponentCreated(instance);
        };
    }
})();
