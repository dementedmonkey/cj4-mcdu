import React from 'react';
import './McduScreen.css';

function escapeHTML(unsafe) {
    return unsafe.replace(
      /[\u0000-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u00FF]/g,
      c => '&#' + ('000' + c.charCodeAt(0)).slice(-4) + ';'
    )
  }

function parseContent(content) {
    const resultInfo = [];
    // if it starts with a bracket its probably empty
    if (content.startsWith('[')) {
        return resultInfo;
    }
    // eslint-disable-next-line no-useless-escape
    const regex = /([^\[\]\n]+)(\[[^\[\]\n]+\])*/g;
    let match = regex.exec(content);
    if (match) {
        while (match != null) {
            const el = {
                content: match[1].replace('__LSB', '[').replace('__RSB', ']'),
                styles: ''
            };
            if (match[2]) {
                // eslint-disable-next-line no-useless-escape
                const classes = match[2].match(/[^\s\[\]]+/g);
                if (classes) {
                    el.styles = classes.join(' ');
                }
            }
            resultInfo.push(el);
            match = regex.exec(content);
        }
    }
    return resultInfo;
}

function segmentToSpan(v) {
    if (v.styles=="blackwhite") {
        // CSS witchcraft because Safari sucks
        return  `<span class="blackwhite"><span class="bg"><span></span></span><span class="fg">${v.content}</span></span>`;
    }
    return `<span class="${v.styles}">${escapeHTML(v.content)}</span>`;
}

function formatCell(str) {
    const content = parseContent(str);
    return content.map(segmentToSpan).join("");
}

const Line = ({ label, cols }) => (
    <div className="line">
        <span className={`fmc-block ${label ? 'label' : 'line'} line-left`} dangerouslySetInnerHTML={{ __html: formatCell(cols[0]) }} />
        <span className={`fmc-block ${label ? 'label' : 'line'} line-right`} dangerouslySetInnerHTML={{ __html: formatCell(cols[1]) }} />
        <span className={`fmc-block ${label ? 'label' : 'line'} line-center`} dangerouslySetInnerHTML={{ __html: formatCell(cols[2]) }} />
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
    for (let i=0; i<15; i++){
        let lineData = i < content.lines.length ? content.lines[i] : null;
        lineData = lineData || ['', '', ''];
        lineData.forEach(x=>anyValue |= x != '');
        lines.push(<Line label={i%2 != 0 && i < 12} cols={lineData} key={i} />);
    }
    return (
        <div className="screen" xmlns="http://www.w3.org/1999/xhtml">
            <Line cols={['', '', '']} />
            {lines}
        </div>
    );
};
