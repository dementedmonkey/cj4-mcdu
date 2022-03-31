import React, { useContext } from 'react';

import './McduButtons.css';

import { WebsocketContext } from './WebsocketContext';
import playClick from './ClickPlayer';

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

const Button = ({ sound, name }) => {
    const socket = useContext(WebsocketContext);

    function mcduButtonPress() {
        return async () => {
            if (sound) {
               await playClick();
            }
            socket.sendMessage(`event:${name}`);
        };
    }

    if (name.length) {
        return (
            <div className="button" onClick={mcduButtonPress()} />
        );
    }
    return <div className="dummy" />;
};

export const McduButtons = ({sound}) => (
    <div className="buttons">
        <ButtonGrid x={0} y={251} width={1400} height={572}>
            <ButtonRow>
                <Button sound={sound} name="L1" />
                <Button sound={sound} name="R1" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="L2" />
                <Button sound={sound} name="R2" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="L3" />
                <Button sound={sound} name="R3" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="L4" />
                <Button sound={sound} name="R4" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="L5" />
                <Button sound={sound} name="R5" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="L6" />
                <Button sound={sound} name="R6" />
            </ButtonRow>
        </ButtonGrid>

        <ButtonGrid x={30} y={875} width={1345} height={220}>
            <ButtonRow>
                <Button sound={sound} name="MSG" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button name="" />
                <Button sound={sound} name="EXEC" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="DIR" />
                <Button sound={sound} name="FPLN" />
                <Button sound={sound} name="LEGS" />
                <Button sound={sound} name="DEPARR" />
                <Button sound={sound} name="PERF" />
                <Button sound={sound} name="DSPL_MENU" />
                <Button sound={sound} name="MFD_ADV" />
                <Button sound={sound} name="MFD_DATA" />
                <Button sound={sound} name="PREVPAGE" />
                <Button sound={sound} name="NEXTPAGE" />
            </ButtonRow>
        </ButtonGrid>
        <ButtonGrid x={30} y={1110} width={100} height={240}>
            <ButtonRow>
                <Button sound={sound} name="IDX" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="TUN" />
            </ButtonRow>
        </ButtonGrid>
        <ButtonGrid x={1250} y={1110} width={125} height={120}>
            <ButtonRow>
                <Button sound={sound} name="CLR" />
            </ButtonRow>
        </ButtonGrid>
        <ButtonGrid x={1250} y={1230} width={125} height={170}>
            <ButtonRow>
                <Button sound={sound} name="BRT" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="DIM" />
            </ButtonRow>
        </ButtonGrid>
        <ButtonGrid x={150} y={1110} width={1100} height={520}>
            <ButtonRow>
                <Button sound={sound} name="A" />
                <Button sound={sound} name="B" />
                <Button sound={sound} name="C" />
                <Button sound={sound} name="D" />
                <Button sound={sound} name="E" />
                <Button sound={sound} name="F" />
                <Button sound={sound} name="G" />
                <Button sound={sound} name="1" />
                <Button sound={sound} name="2" />
                <Button sound={sound} name="3" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="H" />
                <Button sound={sound} name="I" />
                <Button sound={sound} name="J" />
                <Button sound={sound} name="K" />
                <Button sound={sound} name="L" />
                <Button sound={sound} name="M" />
                <Button sound={sound} name="N" />
                <Button sound={sound} name="4" />
                <Button sound={sound} name="5" />
                <Button sound={sound} name="6" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="O" />
                <Button sound={sound} name="P" />
                <Button sound={sound} name="Q" />
                <Button sound={sound} name="R" />
                <Button sound={sound} name="S" />
                <Button sound={sound} name="T" />
                <Button sound={sound} name="U" />
                <Button sound={sound} name="7" />
                <Button sound={sound} name="8" />
                <Button sound={sound} name="9" />
            </ButtonRow>
            <ButtonRow>
                <Button sound={sound} name="V" />
                <Button sound={sound} name="W" />
                <Button sound={sound} name="X" />
                <Button sound={sound} name="Y" />
                <Button sound={sound} name="Z" />
                <Button sound={sound} name="SP" />
                <Button sound={sound} name="DIV" />
                <Button sound={sound} name="DOT" />
                <Button sound={sound} name="0" />
                <Button sound={sound} name="PLUSMINUS" />
            </ButtonRow>
        </ButtonGrid>
    </div>
);
