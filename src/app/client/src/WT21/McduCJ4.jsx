import React from 'react';
import { McduScreen } from './McduScreen';
import { Button, ButtonGrid, ButtonRow } from '../Button';
import { McduButtons } from './McduButtonsCJ4';
import './cj4.css';



export const McduCJ4 = ({ content, sound, fullscreen, setFullscreen, changeCdu }) => {
    return (
        <>
            <McduScreen content={content} />
            <McduButtons sound={sound} screenId={content.power ? content.id : 0} />
            <ButtonGrid x={200} y={128} width={980} height={80} >
                <ButtonRow>
                    <div className="button" title="Fullscreen" onClick={() => setFullscreen(!fullscreen)} />
                </ButtonRow>
            </ButtonGrid>
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