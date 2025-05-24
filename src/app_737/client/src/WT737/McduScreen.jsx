import React from 'react';
import '../McduScreen.css';
import './McduScreen-wt737.css';

function formatCell(cell) {
    const content = cell.content;
    if (!content) {
        return null;
    }
    return (<span className={cell.styles}>{content}</span>);
}


const Line = ({ rowStyle, cols }) => (
    <div className="line line-wt737">
        <span className={rowStyle || `fmc-block`}>{cols.map((col, i) => { return formatCell(col, i); })}</span>
    </div>
);

export const McduScreen = ({ content }) => {
    if (!content.power) {
        return (
            <div className="screen" xmlns="http://www.w3.org/1999/xhtml">
            </div>
        );
    }
    const lines = [];
    let anyValue = false;
    for (let i = 0; i < 15; i++) {
        let lineData = i < content.lines.length ? content.lines[i] : { rowStyle: '', cols: [] };
        lines.push(<Line cols={lineData.cols} rowStyle={lineData.rowStyle} key={i} />);
    }
    return (
        <div className="screen" xmlns="http://www.w3.org/1999/xhtml">
            {lines}
        </div>
    );
};
