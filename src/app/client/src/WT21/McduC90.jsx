import React from 'react';
import { McduScreen } from './McduScreen';
import { McduButtons } from './McduButtonsC90';
import { ButtonGrid, ButtonRow } from './ButtonsC90';


export const McduC90 = ({ content, sound, fullscreen, setFullscreen, changeCdu }) => {
    return (
        <>
            <McduScreen content={content} />
            <McduButtons sound={sound} screenId={content.power ? content.id : 0} />
            <div className="button-grid" style={{ left: `${260 / 17.00}%`, top: `${120 / 18.00}%`, width: `${1200 / 17.00}%`, height: `${80 / 18.00}%` }}>
                <div className="button-row">
                    <div className="button" title="Fullscreen" onClick={() => setFullscreen(!fullscreen)} />
                </div>
            </div>
            <ButtonGrid x={0} y={80} width={115} height={115} >
                <ButtonRow>
                    <div className="button" title="Left MCDU" onClick={() => changeCdu(1)} />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={1585} y={80} width={115} height={115} >
                <ButtonRow>
                    <div className="button" title="Right  MCDU" onClick={() => changeCdu(2)} />
                </ButtonRow>
            </ButtonGrid>
        </>
    );
}