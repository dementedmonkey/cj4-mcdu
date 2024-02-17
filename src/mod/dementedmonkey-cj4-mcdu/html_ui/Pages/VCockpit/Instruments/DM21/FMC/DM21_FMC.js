var dmPlugin = (function (exports, msfsSdk, msfsWt21Shared, msfsWt21Fmc) {
    console.log("invoked plugin");

    function override(object, methodName, callback) {
        object[methodName] = callback(object[methodName])
      }
      
      function after(extraBehavior) {
        return function(original) {
          return function() {
            var returnValue = original.apply(this, arguments)
            extraBehavior.apply(this, arguments)
            return returnValue
          }
        }
      }
      
    class AnotherPlugin extends msfsWt21Fmc.WT21FmcAvionicsPlugin {
        onInstalled()  {
            // Required method, nothing to do.
        }            

        registerFmcExtensions(context) {
            this._fmcContext = context;
            const instrument = this._fmcContext.pageFactory.baseInstrument.instrument;
            
            const powerOn = instrument.onPowerOn.bind(instrument);
            const shutDown = instrument.onShutDown.bind(instrument);
            instrument.onPowerOn = ()=> { powerOn(); this.setPower(true);} 
            instrument.onShutDown = ()=> { shutDown(); this.setPower(false);} 
  
            override(context.renderer, 'renderToDom', after(this.renderToDom.bind(this)));
            this.setPower(instrument.isElectricityAvailable());
            
            this._template = [];
            for (let i = 0; i < 16; i++) {
                this._template.push([""]);
            }

            const port = 8088;
            setInterval(() => {
                if (!this._socket || this._socket.readyState !== 1) {
                    this.connectWebsocket(port);
                }
            }, 5000);
        }

        renderToDom() {
            const rows = this._fmcContext.renderer.currentOutput;
            this.editOutputTemplate(rows, 0);
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
                const prefix = `event:cj4:${this._fmcContext.fmcIndex}:`;
                if (msg.startsWith(prefix)) {
                    this.onEvent(`${msg.substring(prefix.length)}`);
                } else if (msg == "requestUpdate") {
                    this.sendData();
                }
            });
        }
        

        onEvent(event) {
            const button = `CJ4_FMC_${this._fmcContext.fmcIndex}_BTN_${event}`;
            console.log(`BUTTON: ${button}`);
            const instrument = this._fmcContext.pageFactory.baseInstrument.instrument;
            instrument.onInteractionEvent([button]);
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

            let  json = { aircraft: "cj4" };
            json[this._fmcContext.fmcIndex == 2 ? 'right' : 'left'] = screen;
            let msg = "update:cj4:" + JSON.stringify(json);
            //console.log("MSG==>" + msg);
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
            if (Array.isArray(templateLine)) {
                templateLine = [...templateLine];
            }
            else  {
                templateLine = [templateLine];
            }
            var result = templateLine.map(x => this.fixLine(x, false));
            while (result.length < 3) {
                result.push("");
            }
            return result;
        }

        setPower(newState) {
            this._power = newState;
            this.sendData();
        }

        editOutputTemplate(output, rowIndex) {
            const end = Math.min(output.length, this._template.length - rowIndex);
            for (let i=0; i< end; i++)
            {
                let targetRow = i + rowIndex;
                var data = output[i];
                this._template[targetRow] = data;
            }
        }
    }
    msfssdk.registerPlugin(AnotherPlugin);
})({}, msfssdk, wt21_shared, wt21_fmc);