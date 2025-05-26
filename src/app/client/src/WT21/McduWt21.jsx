import './wt21.css';
import React from 'react';
import { McduScreen } from './McduScreen';
import { McduCJ4 } from './McduCJ4.jsx';
import { McduC90 } from './McduC90.jsx';


export const McduWt21 = ({ content, aircraft, sound, fullscreen, setFullscreen, changeCdu }) => {
    if (fullscreen) {
        return (
            <div title="Exit fullscreen" onClick={() => setFullscreen(false)}>
                <McduScreen content={content} />
            </div>);
    }
    if (aircraft == 'cj4') {
        return (
            <McduCJ4 content={content} sound={sound} fullscreen={fullscreen} setFullscreen={setFullscreen} changeCdu={changeCdu} />
        );
    }
    return (
        <McduC90 content={content} sound={sound} fullscreen={fullscreen} setFullscreen={setFullscreen} changeCdu={changeCdu} />
    );
}