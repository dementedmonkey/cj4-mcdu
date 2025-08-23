import './wt737.css';
import React from 'react';
import { McduScreen } from './McduScreen';
import { McduButtons } from './McduButtons';
import { ButtonGrid, ButtonRow } from '../Button';

function ExecLight({ on }) {
    return on ? <div id="execLight"></div> : null;
}

export const McduWt737 = ({ content, sound, fullscreen, setFullscreen, changeCdu }) => {
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
            <ExecLight on={content.exec} />
            <ButtonGrid x={130} y={85} width={570} height={50} >
                <ButtonRow>
                    <div className="button" title="Fullscreen" onClick={() => setFullscreen(true)} />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={5} y={30} width={60} height={50} >
                <ButtonRow>
                    <div className="button" title="Left MCDU" onClick={() => changeCdu(1)} />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={770} y={30} width={60} height={50} >
                <ButtonRow>
                    <div className="button" title="Right  MCDU" onClick={() => changeCdu(2)} />
                </ButtonRow>
            </ButtonGrid>
        </ >
    )
}