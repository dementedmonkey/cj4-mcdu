class DM_FMC_Hook {
    constructor(instance) {
        this.instance = instance;
        const orig = instance.onAfterRender;
        const self = this;
        instance.onAfterRender = function (node) {
            orig.call(this, node);
            self.onAfterRender();
        };

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
            const prefix = `event:wt737:${this.instance.cduSideIndex}:`;
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
        //const button = `${this.instance.cduHEventPrefix}${event}`;
        console.log("dm21: button: " + event);
        this.instance.handleCduHEvent(event);
    }

    sendData() {
        if (!this.isConnected()) {
            return;
        }
        const fmcScreen = this.instance.fmcScreen;
        if (!fmcScreen) { return; }
        const renderer = fmcScreen.renderer;
        if (!renderer) { return; }

        let lines = renderer.columnData
        let screen = {
            lines: lines,
            power: true, //  TODO

        };

        let json = { aircraft: "wt737" };
        json[this.instance.cduSideIndex == 2 ? 'right' : 'left'] = screen;
        const msg = "update:wt737:" + JSON.stringify(json);
        this.sendToSocket(msg);
    }

    sendToSocket(message) {
        if (this.isConnected()) {
            this._socket.send(message);
        }
    }

    onAfterRender() {
        const renderer = this.instance.fmcScreen.renderer;
        const orig = renderer.renderToDom;
        const self = this;
        renderer.renderToDom = function () {
            orig.call(this);
            self.sendData();
        }
    }
}

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
