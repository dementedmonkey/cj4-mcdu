import React, { useContext } from 'react';

import './McduButtons.css';

import { WebsocketContext } from './WebsocketContext';
import { ButtonGrid, ButtonRow } from './Buttons.jsx';
import playClick from './ClickPlayer';


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
        socket.sendMessage(`event:CJ4_${screenId}:${name}`);
    };

    return (
        <div className="buttons">
            <ButtonGrid x={0} y={251} width={1400} height={572}>
                <ButtonRow>
                    <Button onClick={handleClick}name="L1" />
                    <Button onClick={handleClick}name="R1" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="L2" />
                    <Button onClick={handleClick}name="R2" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="L3" />
                    <Button onClick={handleClick}name="R3" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="L4" />
                    <Button onClick={handleClick}name="R4" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="L5" />
                    <Button onClick={handleClick}name="R5" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="L6" />
                    <Button onClick={handleClick}name="R6" />
                </ButtonRow>
            </ButtonGrid>

            <ButtonGrid x={30} y={875} width={1345} height={220}>
                <ButtonRow>
                    <Button onClick={handleClick}name="MSG" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button onClick={handleClick}name="EXEC" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="DIR" />
                    <Button onClick={handleClick}name="FPLN" />
                    <Button onClick={handleClick}name="LEGS" />
                    <Button onClick={handleClick}name="DEPARR" />
                    <Button onClick={handleClick}name="PERF" />
                    <Button onClick={handleClick}name="DSPL_MENU" />
                    <Button onClick={handleClick}name="MFD_ADV" />
                    <Button onClick={handleClick}name="MFD_DATA" />
                    <Button onClick={handleClick}name="PREVPAGE" />
                    <Button onClick={handleClick}name="NEXTPAGE" />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={30} y={1110} width={100} height={240}>
                <ButtonRow>
                    <Button onClick={handleClick}name="IDX" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="TUN" />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={1250} y={1110} width={125} height={120}>
                <ButtonRow>
                    <Button onClick={handleClick}name="CLR" />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={1250} y={1230} width={125} height={170}>
                <ButtonRow>
                    <Button onClick={handleClick}name="BRT" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="DIM" />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={150} y={1110} width={1100} height={520}>
                <ButtonRow>
                    <Button onClick={handleClick}name="A" />
                    <Button onClick={handleClick}name="B" />
                    <Button onClick={handleClick}name="C" />
                    <Button onClick={handleClick}name="D" />
                    <Button onClick={handleClick}name="E" />
                    <Button onClick={handleClick}name="F" />
                    <Button onClick={handleClick}name="G" />
                    <Button onClick={handleClick}name="1" />
                    <Button onClick={handleClick}name="2" />
                    <Button onClick={handleClick}name="3" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="H" />
                    <Button onClick={handleClick}name="I" />
                    <Button onClick={handleClick}name="J" />
                    <Button onClick={handleClick}name="K" />
                    <Button onClick={handleClick}name="L" />
                    <Button onClick={handleClick}name="M" />
                    <Button onClick={handleClick}name="N" />
                    <Button onClick={handleClick}name="4" />
                    <Button onClick={handleClick}name="5" />
                    <Button onClick={handleClick}name="6" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="O" />
                    <Button onClick={handleClick}name="P" />
                    <Button onClick={handleClick}name="Q" />
                    <Button onClick={handleClick}name="R" />
                    <Button onClick={handleClick}name="S" />
                    <Button onClick={handleClick}name="T" />
                    <Button onClick={handleClick}name="U" />
                    <Button onClick={handleClick}name="7" />
                    <Button onClick={handleClick}name="8" />
                    <Button onClick={handleClick}name="9" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick}name="V" />
                    <Button onClick={handleClick}name="W" />
                    <Button onClick={handleClick}name="X" />
                    <Button onClick={handleClick}name="Y" />
                    <Button onClick={handleClick}name="Z" />
                    <Button onClick={handleClick}name="SP" />
                    <Button onClick={handleClick}name="DIV" />
                    <Button onClick={handleClick}name="DOT" />
                    <Button onClick={handleClick}name="0" />
                    <Button onClick={handleClick}name="PLUSMINUS" />
                </ButtonRow>
            </ButtonGrid>
        </div>
    );
};
