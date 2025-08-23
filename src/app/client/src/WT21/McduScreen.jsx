import React from 'react';
import './McduScreen.css';


export const Cell = ({ text, style }) => {
    return (<span className={"cell " + style}><span>{text}</span></span>);
}

class cellData {
    constructor(text, style = "") {
        this.text = text;
        this.style = style;
    }

    buildCell = function (key) {
        return (<Cell text={this.text} style={this.style} key={key} />)
    }
}

// There are some weird rules here; cloned from WT code.
function buildCells(text) {
    const resultInfo = [];
    // if it starts with a bracket its probably empty
    if (text.startsWith('[')) {
        return resultInfo;
    }

    // eslint-disable-next-line no-useless-escape
    const regex = /([^\[\]\n]+)(\[[^\[\]\n]+\])*/g;
    let match = regex.exec(text);
    if (match) {
        while (match != null) {
            const letters = match[1].replace('__LSB', '[').replace('__RSB', ']');
            let styles = "";
            if (match[2]) {
                // eslint-disable-next-line no-useless-escape
                const classes = match[2].match(/[^\s\[\]]+/g);
                if (classes) {
                    styles = classes.join(' ');
                }
            }
            for (let ch of letters) {
                resultInfo.push(new cellData(ch, styles));
            }
            match = regex.exec(text);
        }
    }
    return resultInfo;
}

const Line = ({ cols, lineData }) => {
    const leftCells = buildCells(lineData[0]);
    const rightCells = buildCells(lineData[1]);
    const midCells = buildCells(lineData[2]);

    const colData = new Array(cols);
    colData.splice(0, leftCells.length, ...leftCells);
    colData.splice(-rightCells.length, rightCells.length, ...rightCells);
    colData.splice((cols - midCells.length) / 2, midCells.length, ...midCells);

    const dummy = new cellData(" ");
    const colArray = [...colData].map((item, idx) => (item ?? dummy).buildCell(idx));
    return (<div className="line">{colArray}</div>);
}

export const McduScreen = ({ content, cols = 24, rows = 15 }) => {
    if (!content.power) {
        return (
            <div className="screen" xmlns="http://www.w3.org/1999/xhtml">
            </div>
        );
    }
    const lines = [];
    let anyValue = false;
    for (let i = 0; i < rows; i++) {
        let colArray = new Array(cols);
        let lineData = i < content.lines.length ? content.lines[i] : null;
        lineData = lineData || ['', '', ''];
        lines.push(<Line cols={cols} lineData={lineData} key={i} />);
    }
    return (
        <div className="screen" xmlns="http://www.w3.org/1999/xhtml">
            {lines}
        </div>
    );
};
