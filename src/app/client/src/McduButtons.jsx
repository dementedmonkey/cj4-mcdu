import React, { useContext } from 'react';

import './McduButtons.css';

import { WebsocketContext } from './WebsocketContext';

const ButtonGrid = ({ children, x, y, width, height }) => (
    <div className="button-grid" style={{ left: `${x / 14.00}%`, top: `${y / 16.50}%`, width: `${width / 14.00}%`, height: `${height / 16.50}%` }}>
        {children}
    </div>
);

const ButtonRow = ({ children }) => (
    <div className="button-row">
        {children}
    </div>
);

const Button = ({ name }) => {
    const socket = useContext(WebsocketContext);
    if (name.length) {
        return (
            <div className="button" onClick={() => socket.sendMessage(`event:${name}`)} />
        );
    }
    return <div className="dummy" />;
};

export const McduButtons = () => (
    <div className="buttons">
        <ButtonGrid x={0} y={251} width={1400} height={572}>
            <ButtonRow>
                <Button name="L1" />
                <Button name="R1" />
            </ButtonRow>
            <ButtonRow>
                <Button name="L2" />
                <Button name="R2" />
            </ButtonRow>
            <ButtonRow>
                <Button name="L3" />
                <Button name="R3" />
            </ButtonRow>
            <ButtonRow>
                <Button name="L4" />
                <Button name="R4" />
            </ButtonRow>
            <ButtonRow>
                <Button name="L5" />
                <Button name="R5" />
            </ButtonRow>
            <ButtonRow>
                <Button name="L6" />
                <Button name="R6" />
            </ButtonRow>
        </ButtonGrid>

        <ButtonGrid x={30} y={875} width={1345} height={220}>
            <ButtonRow>
                <Button name="MSG" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="EXEC" />
            </ButtonRow>
            <ButtonRow>
                <Button name="DIR" />
                <Button name="FPLN" />
                <Button name="LEGS" />
                <Button name="DEPARR" />
                <Button name="PERF" />
                <Button name="DSPL_MENU" />
                <Button name="MFD_ADV" />
                <Button name="MFD_DATA" />
                <Button name="PREVPAGE" />
                <Button name="NEXTPAGE" />
            </ButtonRow>
        </ButtonGrid>
        <ButtonGrid x={30} y={1110} width={100} height={240}>
            <ButtonRow>
                <Button name="IDX" />
            </ButtonRow>
            <ButtonRow>
                <Button name="TUN" />
            </ButtonRow>
        </ButtonGrid>
        <ButtonGrid x={1250} y={1110} width={125} height={120}>
            <ButtonRow>
                <Button name="CLR" />
            </ButtonRow>
        </ButtonGrid>
        <ButtonGrid x={1250} y={1230} width={125} height={170}>
            <ButtonRow>
                <Button name="BRT" />
            </ButtonRow>
            <ButtonRow>
                <Button name="DIM" />
            </ButtonRow>
        </ButtonGrid>
        <ButtonGrid x={150} y={1110} width={1100} height={520}>
            <ButtonRow>
                <Button name="A" />
                <Button name="B" />
                <Button name="C" />
                <Button name="D" />
                <Button name="E" />
                <Button name="F" />
                <Button name="G" />
                <Button name="1" />
                <Button name="2" />
                <Button name="3" />
            </ButtonRow>
            <ButtonRow>
                <Button name="H" />
                <Button name="I" />
                <Button name="J" />
                <Button name="K" />
                <Button name="L" />
                <Button name="M" />
                <Button name="N" />
                <Button name="4" />
                <Button name="5" />
                <Button name="6" />
            </ButtonRow>
            <ButtonRow>
                <Button name="O" />
                <Button name="P" />
                <Button name="Q" />
                <Button name="R" />
                <Button name="S" />
                <Button name="T" />
                <Button name="U" />
                <Button name="7" />
                <Button name="8" />
                <Button name="9" />
            </ButtonRow>
            <ButtonRow>
                <Button name="V" />
                <Button name="W" />
                <Button name="X" />
                <Button name="Y" />
                <Button name="Z" />
                <Button name="SP" />
                <Button name="DIV" />
                <Button name="DOT" />
                <Button name="0" />
                <Button name="PLUSMINUS" />
            </ButtonRow>
        </ButtonGrid>
    </div>
);
