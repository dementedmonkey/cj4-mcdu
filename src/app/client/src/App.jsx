import './App.css';
import React, { useState, useEffect } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { McduScreen } from './McduScreen';
import { McduButtons } from './McduButtons';
import { WebsocketContext } from './WebsocketContext';
import { ButtonGrid, ButtonRow } from './Buttons';

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
    const [content, setContent] = useState(
        {
            id: 1,
            lines: [
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
                ['', '', ''],
            ],
            power: false,
        },
    );

    const {
        sendMessage,
        lastMessage,
        readyState,
    } = useWebSocket(socketUrl, {
        shouldReconnect: () => true,
        reconnectAttempts: Infinity,
        reconnectInterval: 500,
    });

    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            sendMessage('requestUpdate');
        }
    }, [readyState]);

    useEffect(() => {
        if (lastMessage != null) {
            const prefix = "update:cj4:";
            if (lastMessage.data.startsWith(prefix)) {
                const jsonIn = JSON.parse(lastMessage.data.substring(prefix.length));
                const screenName = screenId == 2 ? 'right' : 'left';
                const newContent = jsonIn[screenName];
                if (newContent) {
                    newContent.id = screenId;
                    setContent(newContent);
                }
            }
        }
    }, [lastMessage]);

    function changeCdu(screen) {
        if (screen == screenId) {
            return;
        }
        setScreenId(screen);
        if (readyState === ReadyState.OPEN) {
            sendMessage('requestUpdate');
        }        
    }
    return (
        <div className={fullscreen ? 'fullscreen' : 'normal'}>
            <div className="App">
                <WebsocketContext.Provider value={{ sendMessage, lastMessage, readyState }}>
                    {!fullscreen && (
                        <>
                            <McduScreen content={content} />
                            <McduButtons sound={sound} screenId={content.power ? content.id : 0} />
                            <div className="button-grid" style={{ left: `${200 / 14.00}%`, top: `${128 / 16.50}%`, width: `${980 / 14.00}%`, height: `${80 / 16.50}%` }}>
                                <div className="button-row">
                                    <div className="button" title="Fullscreen" onClick={() => setFullscreen(!fullscreen)} />
                                </div>
                            </div>
                            {allowScreenSwitch && (
                                <>
                                    <ButtonGrid x={15} y={120} width={100} height={100} >
                                        <ButtonRow>
                                            <div className="button" title="Left MCDU" onClick={() => changeCdu(1)} />
                                        </ButtonRow>
                                    </ButtonGrid>
                                    <ButtonGrid x={1290} y={120} width={100} height={100} >
                                        <ButtonRow>
                                            <div className="button" title="Right  MCDU" onClick={() => changeCdu(2)} />
                                        </ButtonRow>
                                    </ButtonGrid>
                                </>
                            )}

                        </>
                    )}
                    {fullscreen && (
                        <div title="Exit fullscreen" onClick={() => setFullscreen(false)}>
                            <McduScreen content={content} />
                        </div>
                    )}
                </WebsocketContext.Provider>
            </div>
        </div>
    );
}

export default App;
