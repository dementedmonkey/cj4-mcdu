/**
 * LiM 747 CDU websocket exporter + WEBSOCKETS page (export, IP, port).
 * Hooks B748Cdu / B744Cdu / BLCFCdu via window._pluginSystem.
 * Wire header: wt737/wt747. The page is export, IP, and port.
 */
(function () {
    'use strict';

    var LOG = '[LiM747]';
    var PROTOCOL = 'wt737/wt747';
    var STORE_PREFIX = 'lim-cdu';
    var DEFAULT_IP = '127.0.0.1';
    var DEFAULT_PORT = '8088';
    var DEFAULT_ENABLED = '0';

    var CDU_TYPES = {
        B748Cdu: { tag: 'wtb748-cdu' },
        B744Cdu: { tag: 'wtb744-cdu' },
        BLCFCdu: { tag: 'wtblcf-cdu' }
    };

    function limGetStored(key) {
        try {
            if (typeof GetStoredData === 'function') return GetStoredData(key);
            if (typeof DataStore !== 'undefined' && DataStore.get) return DataStore.get(key);
        } catch (_) { /* ignore */ }
        return null;
    }

    function limSetStored(key, value) {
        try {
            if (typeof SetStoredData === 'function') {
                SetStoredData(key, value);
                return;
            }
            if (typeof DataStore !== 'undefined' && DataStore.set) DataStore.set(key, value);
        } catch (_) { /* ignore */ }
    }

    function limSanitize(s) {
        return String(s || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
    }

    function limPlaneKey() {
        var title = '';
        try { title = SimVar.GetSimVarValue('TITLE', 'string'); } catch (_) { /* ignore */ }
        if (!title) {
            try { title = SimVar.GetSimVarValue('ATC MODEL', 'string'); } catch (_) { /* ignore */ }
        }
        return limSanitize(title) || 'default';
    }

    function limStoreKey(name) {
        return STORE_PREFIX + '/' + limPlaneKey() + '/' + name;
    }

    function limReadSetting(name, def) {
        var v = limGetStored(limStoreKey(name));
        return (v === null || v === undefined || v === '') ? def : String(v);
    }

    function limWriteSetting(name, value) {
        limSetStored(limStoreKey(name), value === null || value === undefined ? '' : String(value));
        limNotifySettingsChanged();
    }

    function limGetConfig() {
        var port = parseInt(limReadSetting('ws_port', DEFAULT_PORT), 10);
        return {
            enabled: limReadSetting('ws_enabled', DEFAULT_ENABLED) === '1',
            ip: limReadSetting('ws_ip', DEFAULT_IP) || DEFAULT_IP,
            port: port >= 1 && port <= 65535 ? port : 8088
        };
    }

    var _settingsListeners = [];
    function limOnSettingsChanged(fn) { _settingsListeners.push(fn); }
    function limNotifySettingsChanged() {
        var cfg = limGetConfig();
        for (var i = 0; i < _settingsListeners.length; i++) {
            try { _settingsListeners[i](cfg); } catch (e) {
                console.warn(LOG, 'settings listener error', e);
            }
        }
    }

    function limCreateSwitchLabel(page, options) {
        var field = new SwitchLabel(page, Object.assign({
            optionStrings: ['OFF', 'ON'],
            activeStyle: 'green',
            caret: 'left',
            separator: 'arrows'
        }, options || {}));
        field.render = function () {
            var string = '';
            var opts = this.options;
            if (this.value !== null && this.value !== undefined) {
                for (var i = 0; i < opts.optionStrings.length; i++) {
                    string += opts.optionStrings[i];
                    if (i === this.value) string += '[' + (opts.activeStyle || 'green') + ' d-text]';
                    else string += '[white s-text]';
                    if (i !== opts.optionStrings.length - 1) {
                        string += (opts.separator === 'arrows') ? '←→[d-text]' : '/[d-text]';
                    }
                }
                if (opts.caret === 'left') string = '<[]' + string;
                else if (opts.caret === 'right') string = string + '>[]';
            }
            return string;
        };
        return field;
    }

    var LIM_ROW_COLOR_CLASSES = {
        green: 1, white: 1, blue: 1, cyan: 1, yellow: 1, amber: 1, red: 1, magenta: 1,
        disabled: 1, inop: 1
    };

    function limNormalizeRowStyle(rowStyle) {
        if (!rowStyle) return 'fmc-row d-text';
        var parts = String(rowStyle).split(/\s+/);
        var keep = [];
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            if (!p || LIM_ROW_COLOR_CLASSES[p]) continue;
            keep.push(p);
        }
        return keep.length ? keep.join(' ') : 'fmc-row';
    }

    function limSerializeCols(cols) {
        var out = [];
        if (!cols || !cols.length) return out;
        for (var c = 0; c < cols.length; c++) {
            var cell = cols[c] || {};
            var content = cell.content;
            if (content === null || content === undefined || content === '') content = ' ';
            var styles = cell.styles;
            styles = (styles === null || styles === undefined) ? '' : String(styles).trim();
            out.push({ content: String(content), styles: styles });
        }
        return out;
    }

    function limBuildLinesFromRenderer(renderer, rowStylesFn) {
        var styles = rowStylesFn();
        var lines = [];
        var height = renderer.columnData.length;
        for (var row = 0; row < height; row++) {
            lines.push({
                rowStyle: limNormalizeRowStyle(styles.length > row ? styles[row] : ''),
                cols: limSerializeCols(renderer.columnData[row])
            });
        }
        return lines;
    }

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

    var _screenCache = { left: null, right: null };
    var _hooksBySide = { 1: null, 2: null };
    var _sharedSocket = undefined;
    var _sharedConfig = limGetConfig();

    function limUrlIndex() {
        try {
            var href = String((window.location && (window.location.href || window.location.search)) || '');
            var match = href.match(/[?&]Index=(\d+)/i);
            if (match) {
                var n = parseInt(match[1], 10);
                if (!isNaN(n)) return n;
            }
        } catch (_) { /* ignore */ }
        return null;
    }

    function limInstrumentIndex(cdu) {
        var urlIdx = limUrlIndex();
        if (urlIdx != null) return urlIdx;
        var idx = cdu && cdu.cduIndex;
        if (idx == null && cdu && cdu.props) idx = cdu.props.index;
        if (idx == null && cdu) idx = cdu.cduSideIndex;
        idx = Number(idx);
        return isNaN(idx) ? 1 : idx;
    }

    function limSideFromIndex(idx) {
        return Number(idx) === 2 ? 2 : 1;
    }

    function limFindInstrument(tag, index) {
        try {
            var els = document.getElementsByTagName(tag);
            for (var i = 0; i < els.length; i++) {
                var fs = els[i].fsInstrument;
                if (fs && Number(fs.instrumentIndex) === Number(index)) return fs;
            }
            if (els.length === 1 && els[0].fsInstrument) return els[0].fsInstrument;
            if (els.length > 1 && index >= 2 && els[1].fsInstrument) return els[1].fsInstrument;
            if (els[0] && els[0].fsInstrument) return els[0].fsInstrument;
        } catch (_) { /* ignore */ }
        return null;
    }

    function limSharedConnected() {
        return _sharedSocket && _sharedSocket.readyState === 1;
    }

    function limSharedSend(message) {
        if (limSharedConnected()) _sharedSocket.send(message);
    }

    function limSharedEnsureSocket() {
        _sharedConfig = limGetConfig();
        if (!_sharedConfig.enabled) {
            if (_sharedSocket) {
                try { _sharedSocket.close(); } catch (_) { /* ignore */ }
                _sharedSocket = undefined;
            }
            return;
        }
        if (!limSharedConnected()) limSharedConnect(_sharedConfig.ip, _sharedConfig.port);
    }

    function limSharedConnect(ip, port) {
        if (_sharedSocket) {
            try { _sharedSocket.close(); } catch (_) { /* ignore */ }
            _sharedSocket = undefined;
        }
        var host = ip || DEFAULT_IP;
        var p = port || 8088;
        try {
            _sharedSocket = new WebSocket('ws://' + host + ':' + p);
        } catch (e) {
            console.warn(LOG, 'WebSocket connect failed', e);
            _sharedSocket = undefined;
            return;
        }
        _sharedSocket.onopen = function () {
            console.log(LOG, 'Connected to ws://' + host + ':' + p);
            limSharedSend('mcduConnected');
            if (_hooksBySide[1]) limBroadcastScreens(_hooksBySide[1]);
            if (_hooksBySide[2]) limBroadcastScreens(_hooksBySide[2]);
        };
        _sharedSocket.addEventListener('message', function (event) {
            var msg = event.data;
            if (msg === 'requestUpdate') {
                if (_hooksBySide[1]) limBroadcastScreens(_hooksBySide[1]);
                if (_hooksBySide[2]) limBroadcastScreens(_hooksBySide[2]);
                return;
            }
            var prefix1 = 'event:' + PROTOCOL + ':1:';
            var prefix2 = 'event:' + PROTOCOL + ':2:';
            var hook1 = _hooksBySide[1];
            var hook2 = _hooksBySide[2];
            if (msg.indexOf(prefix1) === 0 && hook1 && (hook1._index === 1 || hook1._index === 0)) {
                hook1.onEvent(msg.substring(prefix1.length));
            } else if (msg.indexOf(prefix2) === 0 && hook2 && hook2._index === 2) {
                hook2.onEvent(msg.substring(prefix2.length));
            }
        });
    }

    function limBroadcastScreens(hook) {
        if (!_sharedConfig.enabled || !limSharedConnected() || !hook) return;
        var screen = hook._side === 2 ? _screenCache.right : _screenCache.left;
        if (!screen) return;
        var json = { aircraft: '', cdu: hook._index, screen: screen };
        try { json.aircraft = SimVar.GetSimVarValue('ATC MODEL', 'string'); } catch (_) { /* ignore */ }
        if (hook._side === 2) json.right = screen;
        else json.left = screen;
        limSharedSend('update:' + PROTOCOL + ':' + JSON.stringify(json));
    }

    limOnSettingsChanged(function (cfg) {
        _sharedConfig = cfg;
        if (_sharedSocket) {
            try { _sharedSocket.close(); } catch (_) { /* ignore */ }
            _sharedSocket = undefined;
        }
        limSharedEnsureSocket();
        if (cfg.enabled) {
            if (_hooksBySide[1]) limBroadcastScreens(_hooksBySide[1]);
            if (_hooksBySide[2]) limBroadcastScreens(_hooksBySide[2]);
        }
    });

    setInterval(function () { limSharedEnsureSocket(); }, 5000);

    class LiM_CDU_Hook {
        constructor(cdu, instrumentTag) {
            this._cdu = cdu;
            this._instrumentTag = instrumentTag;
            this._rowStyles = undefined;
            this._index = limInstrumentIndex(cdu);
            this._side = limSideFromIndex(this._index);
            if (this._side === 1 && _hooksBySide[1] && _hooksBySide[1] !== this && this._index !== 1) {
                this._side = 2;
                if (this._index === 1 || this._index === 0 || this._index === 3) this._index = 2;
            }
            _hooksBySide[this._side] = this;
            override(cdu, 'onAfterRender', after(this.onAfterRender.bind(this)));
            this._instrument = limFindInstrument(instrumentTag, this._index);
            if (this._instrument) override(this._instrument, 'onPowerOn', after(this.sendData.bind(this)));
            limSharedEnsureSocket();
            console.log(LOG, 'Attached', cdu.constructor.name, 'index=', this._index, 'side=', this._side);
        }

        onEvent(event) {
            this._cdu.handleCduHEvent(event);
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
            if (!_sharedConfig.enabled) return;
            var fmcScreen = this._cdu.fmcScreen;
            if (!fmcScreen || !fmcScreen.renderer || !fmcScreen.renderer.columnData) return;
            var lines = limBuildLinesFromRenderer(fmcScreen.renderer, this.rowStyles.bind(this));
            var powered = true;
            if (this._instrument && typeof this._instrument.isPowered !== 'undefined') {
                powered = !!this._instrument.isPowered;
            }
            var exec = false;
            try {
                if (fmcScreen.fms && fmcScreen.fms.planInMod && typeof fmcScreen.fms.planInMod.get === 'function') {
                    exec = !!fmcScreen.fms.planInMod.get();
                } else if (fmcScreen.fms && fmcScreen.fms.planInMod && typeof fmcScreen.fms.planInMod.value !== 'undefined') {
                    exec = !!fmcScreen.fms.planInMod.value;
                }
            } catch (_) { /* ignore */ }
            var screen = { lines: lines, exec: exec, power: powered };
            if (this._side === 2) _screenCache.right = screen;
            else _screenCache.left = screen;
            limBroadcastScreens(this);
        }

        onAfterRender() {
            var self = this;
            var renderer = this._cdu.fmcScreen && this._cdu.fmcScreen.renderer;
            if (renderer && !renderer.__limWsHooked) {
                override(renderer, 'renderToDom', after(this.sendData.bind(this)));
                renderer.__limWsHooked = true;
            }
            if (this._cdu.fmcScreen && !this._cdu.fmcScreen.__limWsPagesReady) {
                try {
                    limRegisterPages(this._cdu.fmcScreen);
                    this._cdu.fmcScreen.__limWsPagesReady = true;
                } catch (e) {
                    console.warn(LOG, 'Failed to register WEBSOCKETS page', e);
                }
            }
            setTimeout(function () { self.sendData(); }, 250);
        }
    }

    function limResolveGlobal(name) {
        try {
            if (typeof globalThis !== 'undefined' && globalThis[name]) return globalThis[name];
            if (typeof window !== 'undefined' && window[name]) return window[name];
        } catch (_) { /* ignore */ }
        return null;
    }

    function limFindBoeingFmcPage(fromCtor) {
        var ctor = fromCtor;
        var guard = 0;
        while (ctor && guard < 12) {
            if (ctor.name === 'BoeingFmcPage') return ctor;
            var proto = Object.getPrototypeOf(ctor.prototype);
            if (!proto || !proto.constructor || proto.constructor === Object || proto.constructor === ctor) break;
            ctor = proto.constructor;
            guard++;
        }
        return fromCtor;
    }

    function limPatchPageRender(PageClass, patchFn, label) {
        if (!PageClass || !PageClass.prototype || PageClass.__limWsPatched) return false;
        if (typeof PageClass.prototype.renderPage1 === 'function') {
            var orig1 = PageClass.prototype.renderPage1;
            PageClass.prototype.renderPage1 = function () {
                return patchFn.call(this, orig1.call(this), true);
            };
        }
        if (typeof PageClass.prototype.render === 'function') {
            var orig = PageClass.prototype.render;
            PageClass.prototype.render = function () {
                return patchFn.call(this, orig.call(this), false);
            };
        }
        PageClass.__limWsPatched = true;
        console.log(LOG, 'Patched', label || PageClass.name || 'page');
        return true;
    }

    function limEnsureWsLink(page) {
        if (!page.__limWsLinkRight) {
            page.__limWsLinkRight = PageLinkField.createLink(page, 'WEBSOCKETS>', '/websockets');
        }
        return page.__limWsLinkRight;
    }

    function limPatchMenuTemplate(template) {
        var link = limEnsureWsLink(this);
        var pages = template;
        if (!pages || !pages.length) return template;
        var rows = pages[0];
        if (!rows || !rows.length) return template;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (!row) continue;
            var left = row[0];
            if (typeof left === 'string' && left.indexOf('ACMS') !== -1) {
                rows[i] = [left, link, row[2] || ''];
                return pages;
            }
        }
        for (var j = rows.length - 1; j >= 1; j--) {
            if (rows[j] && rows[j][1] === this.settingsPageLink && rows[j - 2]) {
                var above = rows[j - 2];
                rows[j - 2] = [above[0] || '', link, above[2] || ''];
                break;
            }
        }
        return pages;
    }

    function limRegisterPages(fmcScreen) {
        if (typeof PageLinkField === 'undefined' || typeof SwitchLabel === 'undefined' || typeof TextInputField === 'undefined' || typeof Subject === 'undefined') {
            console.warn(LOG, 'FMC field classes not available — settings UI skipped');
            return;
        }
        var menuCtor = fmcScreen.router && fmcScreen.router.getPageForRoute('/menu');
        var settingsCtor = fmcScreen.router && fmcScreen.router.getPageForRoute('/settings');
        var baseCtor = limFindBoeingFmcPage(settingsCtor || menuCtor || limResolveGlobal('BoeingFmcPage'));
        if (!baseCtor) {
            console.warn(LOG, 'Could not resolve BoeingFmcPage — settings UI skipped');
            return;
        }

        class LiMWebsocketsPage extends baseCtor {
            constructor(bus, screen, fms, renderCallback) {
                super(bus, screen, fms, renderCallback);
                var cfg = limGetConfig();
                this.enabledSubject = Subject.create(cfg.enabled ? 1 : 0);
                this.ipSubject = Subject.create(cfg.ip || DEFAULT_IP);
                this.portSubject = Subject.create(String(cfg.port || DEFAULT_PORT));

                var exportSwitch = limCreateSwitchLabel(this, {
                    optionStrings: ['OFF', 'ON'],
                    activeStyle: 'green',
                    caret: 'left',
                    separator: 'arrows'
                });
                this.exportSwitch = exportSwitch.bind(this.enabledSubject);
                this.ipField = new TextInputField(this, {
                    formatter: {
                        format: function (value) {
                            return (typeof inputBox === 'function' ? inputBox(value || '') : (value || ''));
                        },
                        parse: function (input) {
                            if (!input) return null;
                            var t = String(input).trim();
                            if (t.toLowerCase() === 'localhost') return '127.0.0.1';
                            if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(t)) return null;
                            var parts = t.split('.');
                            for (var i = 0; i < parts.length; i++) {
                                var n = parseInt(parts[i], 10);
                                if (n < 0 || n > 255) return null;
                            }
                            return t;
                        },
                        nullValueString: '---.---.---.---'
                    },
                    onModified: function (value) {
                        limWriteSetting('ws_ip', value);
                        return true;
                    }
                }).bind(this.ipSubject);
                this.portField = new TextInputField(this, {
                    formatter: {
                        format: function (value) {
                            return (typeof inputBox === 'function' ? inputBox(value || '') : (value || ''));
                        },
                        parse: function (input) {
                            if (!input) return null;
                            var n = parseInt(String(input).trim(), 10);
                            if (!isFinite(n) || n < 1 || n > 65535) return null;
                            return String(n);
                        },
                        nullValueString: '----'
                    },
                    onModified: function (value) {
                        limWriteSetting('ws_port', value);
                        return true;
                    }
                }).bind(this.portSubject);
                this.enabledSubject.sub(function (v) {
                    limWriteSetting('ws_enabled', v === 1 ? '1' : '0');
                });
                this.ipSubject.sub(function (v) { if (v) limWriteSetting('ws_ip', v); });
                this.portSubject.sub(function (v) { if (v) limWriteSetting('ws_port', v); });
                this.menuLink = PageLinkField.createLink(this, '<MENU', '/menu');
            }

            onResume() {
                if (super.onResume) super.onResume();
                var cfg = limGetConfig();
                this.enabledSubject.set(cfg.enabled ? 1 : 0);
                this.ipSubject.set(cfg.ip || DEFAULT_IP);
                this.portSubject.set(String(cfg.port || DEFAULT_PORT));
            }

            render() {
                return [
                    [
                        ['', '', 'WEBSOCKETS'],
                        [' EXPORT'],
                        [this.exportSwitch],
                        [' IP ADDRESS'],
                        [this.ipField],
                        [' PORT'],
                        [this.portField],
                        [''],
                        [''],
                        [''],
                        [''],
                        ['--------------------------------------'],
                        [this.menuLink, '']
                    ]
                ];
            }
        }

        fmcScreen.addPageRoute('/websockets', LiMWebsocketsPage);
        if (menuCtor) limPatchPageRender(menuCtor, limPatchMenuTemplate, 'MENU');
        else console.warn(LOG, 'MENU route not found — cannot add WEBSOCKETS> on MENU');
        if (fmcScreen.pageInstanceCache && menuCtor) fmcScreen.pageInstanceCache.delete(menuCtor);
        console.log(LOG, 'Registered /websockets — MENU RSK5 WEBSOCKETS>');
    }

    class PluginSystem {
        onComponentCreating() { return undefined; }
        onComponentRendered() { }
        onComponentCreated(instance) {
            var meta = CDU_TYPES[instance.constructor.name];
            if (meta) new LiM_CDU_Hook(instance, meta.tag);
        }
        onAfterRender() { }
    }

    if (!window._pluginSystem) {
        window._pluginSystem = new PluginSystem();
    } else {
        var prev = window._pluginSystem;
        var chained = new PluginSystem();
        var origCreated = prev.onComponentCreated ? prev.onComponentCreated.bind(prev) : null;
        prev.onComponentCreated = function (instance) {
            if (origCreated) origCreated(instance);
            chained.onComponentCreated(instance);
        };
        console.log(LOG, 'Chained onto existing _pluginSystem');
    }

    console.log(LOG, 'Loaded (protocol=' + PROTOCOL + ')');
})();
