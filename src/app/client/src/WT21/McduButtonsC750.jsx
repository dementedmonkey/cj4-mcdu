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
            <ButtonGrid x={0} y={300} width={1300} height={520}>
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
            </ButtonGrid>

            <ButtonGrid x={30} y={930} width={1115} height={100}>
                <ButtonRow>
                    <Button onClick={handleClick} name="PERF" />
                    <Button onClick={handleClick} name="IDX" />
                    <Button onClick={handleClick} name="PREVPAGE" />
                    <Button onClick={handleClick} name="NEXTPAGE" />
                    <Button onClick={handleClick} name="FPLN" />
                    <Button onClick={handleClick} name="MSG" />
                    <Button onClick={handleClick} name="DIR" />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={35} y={1090} width={790} height={600}>
                <ButtonRow>
                    <Button onClick={handleClick} name="A" />
                    <Button onClick={handleClick} name="B" />
                    <Button onClick={handleClick} name="C" />
                    <Button onClick={handleClick} name="D" />
                    <Button onClick={handleClick} name="E" />
                    <Button onClick={handleClick} name="F" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="G" />
                    <Button onClick={handleClick} name="H" />
                    <Button onClick={handleClick} name="I" />
                    <Button onClick={handleClick} name="J" />
                    <Button onClick={handleClick} name="K" />
                    <Button onClick={handleClick} name="L" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="M" />
                    <Button onClick={handleClick} name="N" />
                    <Button onClick={handleClick} name="O" />
                    <Button onClick={handleClick} name="P" />
                    <Button onClick={handleClick} name="Q" />
                    <Button onClick={handleClick} name="R" />
                </ButtonRow>
                <ButtonRow>
                    <Button name="" />
                    <Button onClick={handleClick} name="S" />
                    <Button onClick={handleClick} name="T" />
                    <Button onClick={handleClick} name="U" />
                    <Button onClick={handleClick} name="V" />
                    <Button onClick={handleClick} name="W" />
                </ButtonRow>
                <ButtonRow>
                    <Button name="" />
                    <Button onClick={handleClick} name="X" />
                    <Button onClick={handleClick} name="Y" />
                    <Button onClick={handleClick} name="Z" />
                    <Button onClick={handleClick} name="DEL" />
                    <Button onClick={handleClick} name="CLR" />
                </ButtonRow>
            </ButtonGrid>
            <ButtonGrid x={870} y={1090} width={380} height={600}>
                <ButtonRow>
                    <Button onClick={handleClick} name="1" />
                    <Button onClick={handleClick} name="2" />
                    <Button onClick={handleClick} name="3" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="4" />
                    <Button onClick={handleClick} name="5" />
                    <Button onClick={handleClick} name="6" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="7" />
                    <Button onClick={handleClick} name="8" />
                    <Button onClick={handleClick} name="9" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="DOT" />
                    <Button onClick={handleClick} name="0" />
                    <Button onClick={handleClick} name="" />
                </ButtonRow>
                <ButtonRow>
                    <Button onClick={handleClick} name="PLUSMINUS" />
                    <Button onClick={handleClick} name="DIV" />
                    <Button onClick={handleClick} name="" />
                </ButtonRow>
            </ButtonGrid>
        </div>
    );
};
