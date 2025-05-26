(function () {
    function override(object, methodName, callback) {
        object[methodName] = callback(object[methodName])
    }

    function after(extraBehavior) {
        return function (original) {
            return function () {
                var returnValue = original.apply(this, arguments)
                extraBehavior.apply(this, arguments)
                return returnValue
            }
        }
    }

    class DM_FMC_Hook {
        constructor(cdu) {
            this._model = SimVar.GetSimVarValue("ATC MODEL", "string");
            this._cdu = cdu;
            const self = this;

            // We send the data after the render occurs
            override(cdu, 'onAfterRender', after(this.onAfterRender.bind(this)));

            // Hook into the main instrument to get power notifications
            const instrument = document.getElementsByTagName('wtb38m-cdu')[0].fsInstrument;
            this._instrument = instrument;
            override(instrument, 'onPowerOn', after(this.sendData.bind(this)));

            // Connect to the websocket server.
            // Keep retrying every 5 seconds if it fails.
            const port = 8088;
            setInterval(() => {
                if (!this._socket || this._socket.readyState !== 1) {
                    this.connectWebsocket(port);
                }
            }, 5000);
        }

        connectWebsocket(port) {
            if (this._socket) {
                this._socket.close();
                this._socket = undefined;
            }
            this._socket = new WebSocket(`ws://localhost:${port}`);
            this._socket.onopen = () => {
                console.log("dm21: Connected to websocket");
                this.sendToSocket("mcduConnected");
            };
            this._socket.addEventListener('message', (event) => {
                const msg = event.data;
                const prefix = `event:wt737:${this._cdu.cduSideIndex}:`;
                if (msg.startsWith(prefix)) {
                    this.onEvent(`${msg.substring(prefix.length)}`);
                } else if (msg == "requestUpdate") {
                    this.sendData();
                }
            });
        }

        isConnected() {
            return this._socket && this._socket.readyState;
        }

        onEvent(event) {
            // Button event is passed directly into the CDU code
            this._cdu.handleCduHEvent(event);
        }

        rowStyles() {
            // Row styles are defined in the HTML template, pull them out on first use
            if (this._rowStyles) {
                return this._rowStyles;
            }
            let rowElements = this._cdu.fmcScreen.renderer.rowElArr;
            this._rowStyles = rowElements.map(row => row.attributes["class"] ? row.attributes["class"].value : "");
            return this._rowStyles;
        }

        sendData() {
            if (!this.isConnected()) {
                return;
            }
            const fmcScreen = this._cdu.fmcScreen;
            if (!fmcScreen) { return; }
            const renderer = fmcScreen.renderer;
            if (!renderer) { return; }

            const rowStyles = this.rowStyles();
            let lines = [];
            for (let row = 0; row < renderer.columnData.length; row++) {
                const rowStyle = rowStyles.length > row ? rowStyles[row] : "";
                lines.push({ rowStyle: rowStyle, cols: renderer.columnData[row] });
            }
            let screen = {
                lines: lines,
                exec: fmcScreen.fms.planInMod.value,
                power: this._instrument.isPowered,
            };

            let json = { aircraft: this._model };
            json[this._cdu.cduSideIndex == 2 ? 'right' : 'left'] = screen;
            const msg = "update:wt737:" + JSON.stringify(json);
            this.sendToSocket(msg);
        }

        sendToSocket(message) {
            if (this.isConnected()) {
                this._socket.send(message);
            }
        }

        onAfterRender() {
            // The screen render isn't created until after the first render,
            // hook the call at that point
            const renderer = this._cdu.fmcScreen.renderer;
            override(renderer, 'renderToDom', after(this.sendData.bind(this)));
        }
    }

    /*
    The existing CDU code supports a plugin system (to a degree),
    but nothing is actually creating the plugin hook.
    
    Create our own fake version with enough to hook the CDU creation
    */
    class PluginSystem {
        onComponentCreating(type, props) {
            return undefined;
        }

        onComponentRendered(node) {
        }

        onComponentCreated(instance) {
            let typename = instance.constructor.name;
            if (typename == "B38MCdu") {
                new DM_FMC_Hook(instance);
                console.log("dm21: Attached hook to CDU instance");
            }
        }

        onAfterRender(node) {
        }
    }

    window._pluginSystem = new PluginSystem();
})();