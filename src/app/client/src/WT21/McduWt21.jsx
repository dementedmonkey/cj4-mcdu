import React from 'react';
import { McduScreen } from './McduScreen';
import { McduCJ4 } from './McduCJ4.jsx';
import { McduC750 } from './McduC750.jsx';
import { McduC90 } from './McduC90.jsx';


export const McduWt21 = ({ content, aircraft, sound, fullscreen, setFullscreen, changeCdu }) => {
    if (fullscreen) {
        return (
            <div title="Exit fullscreen" onClick={() => setFullscreen(false)}>
                <McduScreen content={content} />
            </div>);
    }
    switch (aircraft) {
        case 'c750':
            return (
                <McduC750 content={content} sound={sound} fullscreen={fullscreen} setFullscreen={setFullscreen} changeCdu={changeCdu} />
            );
        case 'cj4':
            return (
                <McduCJ4 content={content} sound={sound} fullscreen={fullscreen} setFullscreen={setFullscreen} changeCdu={changeCdu} />
            );
        default:
            return (
                <McduC90 content={content} sound={sound} fullscreen={fullscreen} setFullscreen={setFullscreen} changeCdu={changeCdu} />
            );
    }
}