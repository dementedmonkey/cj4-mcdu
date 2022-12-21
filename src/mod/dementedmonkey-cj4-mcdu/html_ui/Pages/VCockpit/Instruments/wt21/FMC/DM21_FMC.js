(function (msfssdk) {
    class DM_FMC_Sender {        
        constructor(fmc) {
            this._fmc = fmc;
            this._circuit = this.getCircuitId(this._fmc.instrument.xmlConfig, this._fmc.instrument.instrumentIndex);
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

        getCircuitId(xmlConfig, index) {
            // Get the electical circuit
            // The CJ4 turns on the power if either bus is active, and just blanks the
            // screen if that particular bus is not.  There doesn't seem to be a way to
            // know whether or not we're blanked.
            //
            // Here we'll make an assumption that we're configured as the "CJ4_FMC" instrument,
            // and the left and right circuit buses are "OR"ed together from left to right.
            //
            // If that's true, we grab the circuit bus from that condition.  If anything else,
            // just return a 0 and we'll use the default electrical config, which will power on
            // the FO MFD on Dispatch/Emergency power when it shouldn't.
            const electricalConfig = xmlConfig.evaluate("/PlaneHTMLConfig/Instrument[Name='CJ4_FMC']/Electric/Or/Simvar/@name", xmlConfig, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (electricalConfig.snapshotLength >= index) {
                const parts = electricalConfig.snapshotItem(index-1).textContent.split(':');
                if (parts.length == 2 && parts[0] == "CIRCUIT ON") {
                    return parseInt(parts[1]) || 0;
                }
            }
            return 0;
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
                const prefix = `event:cj4:${this._fmc.instrument.instrumentIndex}:`;
                if (msg.startsWith(prefix)) {
                    this.onEvent(`${msg.substring(prefix.length)}`);
                } else if (msg == "requestUpdate") {
                    this.sendData();
                }
            });
        }

        onEvent(event) {
            const button = `CJ4_FMC_${this._fmc.instrument.instrumentIndex}_BTN_${event}`;
            this._fmc.onInteractionEvent([button]);
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
            let  json = { aircraft: "CJ4" };
            json[this._fmc.instrument.instrumentIndex == 2 ? 'right' : 'left'] = screen;
            let msg = "update:cj4:" + JSON.stringify(json);
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
