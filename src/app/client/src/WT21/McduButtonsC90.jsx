import React, { useContext } from 'react';

import { WebsocketContext } from '../WebsocketContext.jsx';
import { Button,  ButtonGrid, ButtonRow } from '../Button.jsx';
import playClick from '../ClickPlayer.jsx';


export const McduButtons = ({ sound, screenId }) => {
    const socket = useContext(WebsocketContext);

    const handleClick = async (name) => {
        if (sound) {
            await playClick();
        }
        if (screenId) {
            socket.sendMessage(`event:wt21:${screenId}:${name}`);
        }
    };

    return (
        <div className="buttons">
            <ButtonGrid x={0} y={270} width={1700} height={620}>
                <ButtonRow>
                    <Button onClick={handleClick} name="L1" />
                    <Button onClick={handleClick} name="R1" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="L2" />
                    <Button onClick={handleClick} name="R2" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="L3" />
                    <Button onClick={handleClick} name="R3" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="L4" />
                    <Button onClick={handleClick} name="R4" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="L5" />
                    <Button onClick={handleClick} name="R5" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="L6" />
                    <Button onClick={handleClick} name="R6" />
                </ButtonRow>
            </ButtonGrid>

            <ButtonGrid x={0} y={940} width={1700} height={260}>
                <ButtonRow>
                    <Button onClick={handleClick} name="MSG" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button name="" />
                    <Button onClick={handleClick} name="EXEC" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="DIR" />
                    <Button onClick={handleClick} name="FPLN" />
                    <Button onClick={handleClick} name="LEGS" />
                    <Button onClick={handleClick} name="DEPARR" />
                    <Button onClick={handleClick} name="PERF" />
                    <Button onClick={handleClick} name="DSPL_MENU" />
                    <Button onClick={handleClick} name="MFD_ADV" />
                    <Button onClick={handleClick} name="MFD_DATA" />
                    <Button onClick={handleClick} name="PREVPAGE" />
                    <Button onClick={handleClick} name="NEXTPAGE" />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={0} y={1220} width={145} height={255}>
                <ButtonRow>
                    <Button onClick={handleClick} name="IDX" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="TUN" />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={1560} y={1220} width={145} height={130}>
                <ButtonRow>
                    <Button onClick={handleClick} name="CLR" />
                </ButtonRow>
            </ButtonGrid>
            {
                <ButtonGrid x={1570} y={1360} width={110} height={170}>
                    <ButtonRow>
                        <Button onClick={handleClick} name="BRT" />
                    </ButtonRow>
                    <ButtonRow>
                        <Button onClick={handleClick} name="DIM" />
                    </ButtonRow>
                </ButtonGrid>
            }
            <ButtonGrid x={150} y={1220} width={1400} height={535}>
                <ButtonRow>
                    <Button onClick={handleClick} name="1" />
                    <Button onClick={handleClick} name="2" />
                    <Button onClick={handleClick} name="3" />
                    <Button onClick={handleClick} name="A" />
                    <Button onClick={handleClick} name="B" />
                    <Button onClick={handleClick} name="C" />
                    <Button onClick={handleClick} name="D" />
                    <Button onClick={handleClick} name="E" />
                    <Button onClick={handleClick} name="F" />
                    <Button onClick={handleClick} name="G" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="4" />
                    <Button onClick={handleClick} name="5" />
                    <Button onClick={handleClick} name="6" />
                    <Button onClick={handleClick} name="H" />
                    <Button onClick={handleClick} name="I" />
                    <Button onClick={handleClick} name="J" />
                    <Button onClick={handleClick} name="K" />
                    <Button onClick={handleClick} name="L" />
                    <Button onClick={handleClick} name="M" />
                    <Button onClick={handleClick} name="N" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="7" />
                    <Button onClick={handleClick} name="8" />
                    <Button onClick={handleClick} name="9" />
                    <Button onClick={handleClick} name="O" />
                    <Button onClick={handleClick} name="P" />
                    <Button onClick={handleClick} name="Q" />
                    <Button onClick={handleClick} name="R" />
                    <Button onClick={handleClick} name="S" />
                    <Button onClick={handleClick} name="T" />
                    <Button onClick={handleClick} name="U" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="DOT" />
                    <Button onClick={handleClick} name="0" />
                    <Button onClick={handleClick} name="PLUSMINUS" />
                    <Button onClick={handleClick} name="V" />
                    <Button onClick={handleClick} name="W" />
                    <Button onClick={handleClick} name="X" />
                    <Button onClick={handleClick} name="Y" />
                    <Button onClick={handleClick} name="Z" />
                    <Button onClick={handleClick} name="SP" />
                    <Button onClick={handleClick} name="DIV" />
                </ButtonRow>
            </ButtonGrid>
        </div>
    );
};
