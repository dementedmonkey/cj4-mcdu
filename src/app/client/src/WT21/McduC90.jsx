import React from 'react';
import { McduScreen } from './McduScreen';
import { McduButtons } from './McduButtonsC90';
import { ButtonGrid, ButtonRow } from '../Button';
import './c90.css';


export const McduC90 = ({ content, sound, fullscreen, setFullscreen, changeCdu }) => {
    return (
        <>
            <McduScreen content={content} />
            <McduButtons sound={sound} screenId={content.power ? content.id : 0} />
            <ButtonGrid x={260} y={120} width={1200} height={80} >
                <ButtonRow>
                    <div className="button" title="Fullscreen" onClick={() => setFullscreen(!fullscreen)} />
                </ButtonRow>
            </ButtonGrid>
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