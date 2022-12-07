(function (msfssdk) {
    class DM_FMC_Sender {
        constructor(fmc) {
            this._fmc = fmc;
            this._editOutputTemplate = fmc.fmcRenderer.editOutputTemplate.bind(fmc.fmcRenderer);
            fmc.fmcRenderer.editOutputTemplate = this.editOutputTemplate.bind(this);

            let port = 8088;

            this._template = [];
            for (let i = 0; i < 14; i++) {
                this._template.push([""]);
            }
            this._scratchpad = "";
            this._message = "";
            this._showExec = false;
            this._power = false;

            this._power = true;

            setInterval(() => {
                if (!this._socket || this._socket.readyState !== 1) {
                    this.connectWebsocket(port);
                }
            }, 5000);

        }
        editOutputTemplate(output, rowIndex) {
            this._editOutputTemplate(output, rowIndex);
            const start = rowIndex;
            const end = Math.min(rowIndex + output.length, this._template.length);
            for (let i=0; i< output.length; i++)
            {
                let targetRow = i + rowIndex;
                var data = output[i];
                if (targetRow < 13) {
                    this._template[targetRow] = data;
                }
                if (targetRow == 13)  {
                    const rx= /\](.+)\[/.exec(data[0]);
                    if (rx) {
                        this._scratchpad = rx[1];
                    }
                    else {
                        this._scratchpad = "";
                    }
                }
                if (targetRow == 14) {
                    this._message = data[0];
                    this._showExec = data.length >1 && data[1].indexOf("EXEC") >=0;
                }

            }
            this.sendData();
        }


        setPower(power) {
            this._power = power;
        }

        connectWebsocket(port) {
            if (this._socket) {
                this._socket.close();
                this._socket = undefined;
            }
            this._socket = new WebSocket(`ws://localhost:${port}`);
            this._socket.onopen = () => {
                console.log("Connected to server");
                this.sendToSocket("mcduConnected");
            };
            this._socket.addEventListener('message', (event) => {
                const msg = event.data;
                if (msg.startsWith("event:")) {
                    this.onEvent(`CJ4_FMC_1_BTN_${msg.substring(6)}`);
                } else if (msg == "requestUpdate") {
                    this.sendData();
                }
            });
        }

        onEvent(event) {
            this._fmc.onInteractionEvent([event]);
        }

        isConnected() {
            return this._socket && this._socket.readyState;
        }
        sendData() {
            if (!this.isConnected() || !this._template) {
                return;
            }

            const template = this._template;
            const message = this._message ? this._message : "";
            const scratchpad = this._scratchpad ? this._scratchpad : "";
            var lines = template.slice(1, 13).map((l, i) => this.templateToLine(l, i));

            var screen = {
                lines: lines,
                scratchpad: this.fixLine(scratchpad),
                message: this.fixLine(message),
                title: this.fixLine(template[0][2]),
                titleLeft: this.fixLine(template[0][0]),
                page: this.fixLine(template[0][1]),
                exec: this._showExec,
                power: this._power
            };
            var json = { right: screen, left: screen }
            var msg = "update:" + JSON.stringify(json);
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
            var result = templateLine.map(x => this.fixLine(x, index % 2 == 0));
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
                fmc.dmSender = new DM_FMC_Sender(fmc);
                console.log("Hooked the FMC");
                registered = true;
            }
        }
        if (!registered) {
            console.log("Didn't find the FMC, retrying");
            window.setTimeout(tryToHookFmc, 500);
        }
    }

    window.setTimeout(tryToHookFmc, 500);
})(msfssdk);
