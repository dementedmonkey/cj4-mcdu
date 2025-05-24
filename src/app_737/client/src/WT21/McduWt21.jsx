import './wt21.css';
import React from 'react';
import { McduScreen } from './McduScreen';
import { McduButtons } from './McduButtons';
import { ButtonGrid, ButtonRow } from './Buttons';

export const McduWt21 = ({ content, sound, fullscreen, setFullscreen, changeCdu }) => {
    if (fullscreen) {
        return (
            <div title="Exit fullscreen" onClick={() => setFullscreen(false)}>
                <McduScreen content={content} />
            </div>);
    }

    return (
        <>
            <McduScreen content={content} />
            <McduButtons sound={sound} screenId={content.power ? content.id : 0} />
            <div className="button-grid" style={{ left: `${200 / 14.00}%`, top: `${128 / 16.50}%`, width: `${980 / 14.00}%`, height: `${80 / 16.50}%` }}>
                <div className="button-row">
                    <div className="button" title="Fullscreen" onClick={() => setFullscreen(!fullscreen)} />
                </div>
            </div>
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
    )
}