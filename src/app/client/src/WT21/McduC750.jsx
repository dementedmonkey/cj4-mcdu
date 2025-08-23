import React from 'react';
import { McduScreen } from './McduScreen';
import { McduButtons } from './McduButtonsC750';
import { ButtonGrid, ButtonRow } from '../Button';
import './c750.css';


export const McduC750 = ({ content, sound, fullscreen, setFullscreen, changeCdu }) => {
    return (
        <>
            <McduScreen content={content} rows={9} cols={25} />
            <McduButtons sound={sound} screenId={content.power ? content.id : 0} />
            <ButtonGrid x={200} y={40} width={925} height={60} >
                <ButtonRow>
                    <div className="button" title="Fullscreen" onClick={() => setFullscreen(!fullscreen)} />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={0} y={90} width={100} height={100} >
                <ButtonRow>
                    <div className="button" title="Left MCDU" onClick={() => changeCdu(1)} />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={1200} y={90} width={100} height={100} >
                <ButtonRow>
                    <div className="button" title="Right  MCDU" onClick={() => changeCdu(2)} />
                </ButtonRow>
            </ButtonGrid>
        </>
    )
}