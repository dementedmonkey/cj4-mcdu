import './App.css';
import React, { useState, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { WebsocketContext } from './WebsocketContext';



import { McduWt737 } from './WT737/McduWt737.jsx';
import { McduWt21 } from './WT21/McduWt21.jsx';


function App() {
    let requestedId = 1;
    let allowScreenSwitch = true;
    const screenMatch = /screen=(\d+)/.exec(window.location.search);
    if (screenMatch) {
        switch (screenMatch[1]) {
            case '1':
                requestedId = 1;
                allowScreenSwitch = false;
                break;
            case '2':
                requestedId = 2;
                allowScreenSwitch = false;
                break;
        }
    }
    const [fullscreen, setFullscreen] = useState(window.location.href.endsWith('fullscreen'));
    const [sound] = useState(window.location.href.endsWith('/sound'));
    const socketUrl = `ws://${window.location.hostname}:__WEBSOCKET_PORT__`;
    const [screenId, setScreenId] = useState(requestedId);
    const [cduType, setCduType] = useState("wt737");
    const [content, setContent] = useState(
        {
            id: 1,
            lines: [],
            power: false,
            exec: false,
        },
    );
    const [variant, setVariant] = useState("wt21");
    const [mcduConnected, setMcduConnected] = useState(false);


    function changeVariant(messageType) {
        if (variant != messageType) {
            setVariant(messageType);
        }
        let newType = messageType;
        switch (messageType) {
            case "cj4":
                newType = "wt21";
                break;
            default:
                newType = messageType;
                break;
        }
        if (newType != cduType) {
            setCduType(newType);
        }
    }

    const {
        sendMessage,
        lastMessage,
        readyState,
    } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
        reconnectAttempts: Infinity,
        reconnectInterval: 500,
        onClose: disconnect,
        onError: disconnect,
    });

    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            sendMessage('requestUpdate');
        }
    }, [readyState]);


    useEffect(() => {
        if (lastMessage != null) {
            const prefix = "update:";

            if (lastMessage.data == "mcduConnected") {
                // New connection from server
                // It might not push, request explicitly
                sendMessage('requestUpdate');
                return;
            }

            if (lastMessage.data.startsWith(prefix)) {
                const colon2 = lastMessage.data.indexOf(':', prefix.length);
                if (colon2 < 0) {
                    return;
                }
                const msgAircraft = lastMessage.data.substring(prefix.length, colon2);
                const jsonIn = JSON.parse(lastMessage.data.substring(colon2 + 1));
                const screenName = screenId == 2 ? 'right' : 'left';
                const newContent = jsonIn[screenName];
                if (!newContent) {
                    return;
                }
                if (msgAircraft == "*") {
                    // Sim disconnect sends a power off message, but doesn't
                    // know the plane type.
                    // The only guaranteed value is the power state.
                    // You will get this from each screen that disconnects,
                    // and we don't know which one it is.   Having 1 of 2 screens
                    // disconnect should never happen unless a crash or debugging.                    
                    let tempContent = { ...content, power: newContent.power };
                    setContent(tempContent);
                } else {
                    changeVariant(msgAircraft);
                    newContent.id = screenId;
                    setContent(newContent);
                }
            }
        }
    }, [lastMessage]);

    function disconnect() {
        let tempContent = { ...content, power: false };
        setContent(tempContent);
    }


    function changeCdu(screen) {
        if (screen == screenId) {
            return;
        }
        setScreenId(screen);
        if (readyState === ReadyState.OPEN) {
            sendMessage('requestUpdate');
        }
    }

    function getAircraftMcdu() {
        switch (cduType) {
            case "wt737":
                return (<McduWt737
                    content={content}
                    sound={sound}
                    fullscreen={fullscreen}
                    setFullscreen={setFullscreen}
                    changeCdu={allowScreenSwitch ? changeCdu : () => { }} />);
            case "cj4":
            default:
                return (<McduWt21
                    content={content}
                    sound={sound}
                    fullscreen={fullscreen}
                    setFullscreen={setFullscreen}
                    changeCdu={allowScreenSwitch ? changeCdu : () => { }} />);

        }
    }


    return (
        <div className={fullscreen ? `fullscreen fullscreen-${cduType}` : `normal normal-${cduType}`}>
            <div className={`App App-${variant} App-${cduType}`}>
                <WebsocketContext.Provider value={{ sendMessage, lastMessage, readyState }}>
                    {getAircraftMcdu()}
                </WebsocketContext.Provider>
            </div>
        </div>
    );
}

export default App;
