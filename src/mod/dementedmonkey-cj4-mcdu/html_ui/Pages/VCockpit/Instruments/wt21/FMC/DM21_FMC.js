(function (msfssdk) {
    class DM_FMC_Sender {
        constructor(fmc) {
            this._fmc = fmc;
            this._circuit = new URL(fmc.instrument.getAttribute("Url")).searchParams.get("Circuit") || 0;
            this._editOutputTemplate = fmc.fmcRenderer.editOutputTemplate.bind(fmc.fmcRenderer);
            fmc.fmcRenderer.editOutputTemplate = this.editOutputTemplate.bind(this);            

            const powerOn = this._fmc.instrument.onPowerOn.bind(this._fmc.instrument);
            const shutDown = this._fmc.instrument.onShutDown.bind(this._fmc.instrument);
            this._fmc.instrument.onPowerOn = ()=> { powerOn(); this.setPower(true);} 
            this._fmc.instrument.onShutDown = ()=> { shutDown(); this.setPower(false);} 

            const port = 8088;
            
            this._template = [];
            for (let i = 0; i < 16; i++) {
                this._template.push([""]);
            }
            this._power = fmc.instrument.isElectricityAvailable();

            setInterval(() => {
                if (!this._socket || this._socket.readyState !== 1) {
                    this.connectWebsocket(port);
                }
            }, 5000);

        }
        editOutputTemplate(output, rowIndex) {
            this._editOutputTemplate(output, rowIndex);
            const end = Math.min(output.length, this._template.length - rowIndex);
            for (let i=0; i< end; i++)
            {
                let targetRow = i + rowIndex;
                var data = output[i];
                this._template[targetRow] = data;
            }
            this.sendData();
        }


        setPower(power) {
            this._power = power;
            this.sendData();
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
                if (msg.startsWith("event:")) {
                    this.onEvent(`${msg.substring(6)}`);
                } else if (msg == "requestUpdate") {
                    this.sendData();
                }
            });
        }

        onEvent(event) {
            const index = this._fmc.instrument.instrumentIndex
            const prefix = `CJ4_${index}:`;
            if (event.startsWith(prefix)) {
                const button = `CJ4_FMC_${index}_BTN_${event.substring(prefix.length)}`;
                this._fmc.onInteractionEvent([button]);
            }
        }

        isConnected() {
            return this._socket && this._socket.readyState;
        }

        sendData() {
            if (!this.isConnected() || !this._template) {
                return;
            }
            var lines = this._template.slice(0, 15).map((l, i) => this.templateToLine(l, i));
            var screen = {
                lines: lines,
                power: this._power
            };

            if (this._circuit) {
                screen.power = screen.power && SimVar.GetSimVarValue(`CIRCUIT ON:${this._circuit}`,'bool');
            }
            let  json = {};
            json[this._fmc.instrument.instrumentIndex == 2 ? 'right' : 'left'] = screen;
            let msg = "update:" + JSON.stringify(json);
            this.sendToSocket(msg);
        }

        sendToSocket(message) {
            if (this.isConnected()) {
                this._socket.send(message);
            }
        }

        fixLine(text, small = false) {
            if (!text) {
                text = "";
            }
            return small ? `${text}[small]` : text;
        }

        templateToLine(templateLine, index) {
            if (!Array.isArray(templateLine)) {
                templateLine = [templateLine];
            }
            var result = templateLine.map(x => this.fixLine(x, false));
            while (result.length < 3) {
                result.push("");
            }
            return result;
        }
    }
    function tryToHookFmc() {
        let registered = false;
        const panel = window.document.getElementById("panel");
        if (panel) {
            const elements = panel.getElementsByTagName("wt21-fmc");
            if (elements.length > 0) {
                const fmc = elements[0].fsInstrument;
                if (fmc) {
                    fmc.dmSender = new DM_FMC_Sender(fmc);
                    console.log("dm21: FMC hooked");
                }
                registered = true;
            }
        }
        if (!registered) {
            console.log("dm21: FMC not yet ready");
            window.setTimeout(tryToHookFmc, 500);
        }
    }

    window.setTimeout(tryToHookFmc, 500);
})(msfssdk);
