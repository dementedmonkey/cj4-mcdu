import React, { useContext } from 'react';

import '../McduButtons.css';

import { WebsocketContext } from '../WebsocketContext';
import { ButtonGrid, ButtonRow } from './Buttons.jsx';
import playClick from '../ClickPlayer';


const Button = ({ onClick, name }) => {
    if (name.length) {
        return (
            <div className="button" onClick={() => onClick(name)} />
        );
    }
    return <div className="dummy" />;
};

export const McduButtons = ({ sound, screenId }) => {
    const socket = useContext(WebsocketContext);

    const handleClick = async (name) => {
        if (sound) {
            await playClick();
        }
        if (screenId) {
            socket.sendMessage(`event:wt737:${screenId}:${name}`);
        }
    };

    return (
        <div className="buttons">
            <ButtonGrid x={0} y={130} width={835} height={370}>
                <ButtonRow>
                    <Button name="L1" onClick={handleClick} />
                    <Button name="R1" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="L2" onClick={handleClick} />
                    <Button name="R2" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="L3" onClick={handleClick} />
                    <Button name="R3" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="L4" onClick={handleClick} />
                    <Button name="R4" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="L5" onClick={handleClick} />
                    <Button name="R5" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="L6" onClick={handleClick} />
                    <Button name="R6" onClick={handleClick} />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={640} y={605} width={115} height={75}>
                <ButtonRow>
                    <Button name="" onClick={handleClick} />
                    <Button name="" onClick={handleClick} />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={650} y={710} width={100} height={60}>
                <ButtonRow>
                    <Button name="EXEC" onClick={handleClick} />
                </ButtonRow>
            </ButtonGrid>

            <ButtonGrid x={78} y={606} width={535} height={330}>
                <ButtonRow>
                    <Button name="INIT" onClick={handleClick} />
                    <Button name="RTE" onClick={handleClick} />
                    <Button name="DEPARR" onClick={handleClick} />
                    <Button name="ATC" onClick={handleClick} />
                    <Button name="VNAV" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="FIX" onClick={handleClick} />
                    <Button name="LEGS" onClick={handleClick} />
                    <Button name="HOLD" onClick={handleClick} />
                    <Button name="FMCCOM" onClick={handleClick} />
                    <Button name="PROG" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="MENU" onClick={handleClick} />
                    <Button name="N1LIMIT" onClick={handleClick} />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                </ButtonRow>
                <ButtonRow>
                    <Button name="PREVPAGE" onClick={handleClick} />
                    <Button name="NEXTPAGE" onClick={handleClick} />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                </ButtonRow>
            </ButtonGrid>


            <ButtonGrid x={75} y={940} width={240} height={330}>
                <ButtonRow>
                    <Button name="1" onClick={handleClick} />
                    <Button name="2" onClick={handleClick} />
                    <Button name="3" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="4" onClick={handleClick} />
                    <Button name="5" onClick={handleClick} />
                    <Button name="6" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="7" onClick={handleClick} />
                    <Button name="8" onClick={handleClick} />
                    <Button name="9" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="DOT" onClick={handleClick} />
                    <Button name="0" onClick={handleClick} />
                    <Button name="PLUSMINUS" onClick={handleClick} />
                </ButtonRow>
            </ButtonGrid>

            <ButtonGrid x={342} y={777} width={410} height={500}>
                <ButtonRow>
                    <Button name="A" onClick={handleClick} />
                    <Button name="B" onClick={handleClick} />
                    <Button name="C" onClick={handleClick} />
                    <Button name="D" onClick={handleClick} />
                    <Button name="E" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="F" onClick={handleClick} />
                    <Button name="G" onClick={handleClick} />
                    <Button name="H" onClick={handleClick} />
                    <Button name="I" onClick={handleClick} />
                    <Button name="J" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="K" onClick={handleClick} />
                    <Button name="L" onClick={handleClick} />
                    <Button name="M" onClick={handleClick} />
                    <Button name="N" onClick={handleClick} />
                    <Button name="O" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="P" onClick={handleClick} />
                    <Button name="Q" onClick={handleClick} />
                    <Button name="R" onClick={handleClick} />
                    <Button name="S" onClick={handleClick} />
                    <Button name="T" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="U" onClick={handleClick} />
                    <Button name="V" onClick={handleClick} />
                    <Button name="W" onClick={handleClick} />
                    <Button name="X" onClick={handleClick} />
                    <Button name="Y" onClick={handleClick} />
                </ButtonRow>
                <ButtonRow>
                    <Button name="Z" onClick={handleClick} />
                    <Button name="SP" onClick={handleClick} />
                    <Button name="DEL" onClick={handleClick} />
                    <Button name="DIV" onClick={handleClick} />
                    <Button name="CLR" onClick={handleClick} />
                </ButtonRow>
            </ButtonGrid>
        </div>
    );
};
