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
            enabled: readStore('ws_enabled', '0') === '1',
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
            var instrument = document.getElementsByTagName('wtb38m-cdu')[0].fsInstrument;
            this._instrument = instrument;
            override(instrument, 'onPowerOn', after(this.sendData.bind(this)));
            var self = this;
            setInterval(function () { self.maintainSocket(); }, 2000);
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
                console.log(LOG, '737 connected', url);
                self.sendRaw('mcduConnected');
                self.sendData();
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
            var screen = {
                lines: lines,
                exec: !!(fmcScreen.fms && fmcScreen.fms.planInMod && fmcScreen.fms.planInMod.value),
                power: this._instrument.isPowered
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

    function patchMenu(template) {
        var pages = template;
        if (!pages || !pages.length || !pages[0]) return template;
        var rows = pages[0];
        var link = this.__limWsLink || (this.__limWsLink = PageLinkField.createLink(this, 'WEBSOCKETS>', '/websockets'));
        for (var i = 0; i < rows.length; i++) {
            var left = rows[i] && rows[i][0];
            if (typeof left === 'string' && left.indexOf('ACMS') !== -1) {
                rows[i] = [left, link, rows[i][2] || ''];
                return pages;
            }
        }
        if (rows.length > 10) {
            var row = rows[10] || ['', ''];
            rows[10] = [row[0] || '', link, row[2] || ''];
        }
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
                this.menuLink = PageLinkField.createLink(this, '<MENU', '/menu');
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
                    [' MATCH cdu-server.cfg simPort', ''],
                    ['', ''],
                    [this.menuLink, '']
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
            if (instance.constructor && instance.constructor.name === 'B38MCdu') {
                new Lim737Hook(instance);
                console.log(LOG, 'Attached 737 CDU hook');
            }
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
