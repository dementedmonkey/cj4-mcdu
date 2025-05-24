class DM_FMC_Hook {
    constructor(cdu) {
        this.cdu = cdu;
        const self = this;

        // We send the data after the render occurs
        const origAfterRender = cdu.onAfterRender;
        cdu.onAfterRender = function (node) {
            origAfterRender.call(this, node);
            self.onAfterRender();
        };

        // Hook into the main instrument to get power notifications
        const instrument = document.getElementsByTagName('wtb38m-cdu')[0].fsInstrument;
        this.instrument = instrument;

        const origPowerChanged = instrument.onPowerChanged;
        instrument.onPowerChanged = function (current, previous) {
            origPowerChanged.call(this, current, previous);
            self.sendData();
        };

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
            const prefix = `event:wt737:${this.cdu.cduSideIndex}:`;
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
        //const button = `${this.cdu.cduHEventPrefix}${event}`;
        console.log("dm21: button: " + event);
        this.cdu.handleCduHEvent(event);
    }

    rowStyles() {
        if (this._rowStyles) {
            return this._rowStyles;
        }
        let rowElements = this.cdu.fmcScreen.renderer.rowElArr;
        this._rowStyles = rowElements.map(row => row.attributes["class"] ? row.attributes["class"].value : "");
        return this._rowStyles;
    }

    sendData() {
        if (!this.isConnected()) {
            return;
        }
        const fmcScreen = this.cdu.fmcScreen;
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
            power: this.instrument.isPowered,
        };

        let json = { aircraft: "wt737" };
        json[this.cdu.cduSideIndex == 2 ? 'right' : 'left'] = screen;
        const msg = "update:wt737:" + JSON.stringify(json);
        this.sendToSocket(msg);
    }

    sendToSocket(message) {
        if (this.isConnected()) {
            this._socket.send(message);
        }
    }

    onAfterRender() {
        const renderer = this.cdu.fmcScreen.renderer;
        const orig = renderer.renderToDom;
        const self = this;
        renderer.renderToDom = function () {
            orig.call(this);
            self.sendData();
        }
    }
}

/*
The code has a plugin system, but nothing ever sets it up.
Create our own fake one to be able to hook the CDU creation.
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
            console.log("dm21: WTB737MCDU created");
        }
    }

    onAfterRender(node) {
    }
}

window._pluginSystem = new PluginSystem();
