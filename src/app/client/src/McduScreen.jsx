import React from 'react';
import './McduScreen.css';

function escapeHTML(unsafeText) {
    const div = document.createElement('div');
    div.innerText = unsafeText;
    return div.innerHTML;
}

function formatCell(str, raw) {
    if (raw) {
        return str;
    }
    var result = "";
    var remainder = escapeHTML(str);
    const regex = /([^\[]*)(\[([^\]]+)\])?(.*)/;
    while (remainder)
    {
        const m = remainder.match(regex);
        if (!m) {
            break;
        }
        const data = m[1];
        const className = m[3];
        if (!className) {
            break;
        }
        
        remainder = m[4];
        if (className=="blackwhite") {
            // extra padding causes problems for background, need to do stupid CSS tricks
            // so it displays correctly
            result = `<span class="blackwhite"><span class="bg"><span></span></span><span class="fg">${result}${data}</span></span>`
        }
        else {
            result = `<span class='${className.trim()}'>${result}${data}</span>`;    
        }

    }
    if (remainder) {
        result += remainder;
    }
    return result;
}

const Line = ({ label, cols, raw }) => (
    <div className="line">
        <span className={`fmc-block ${label ? 'label' : 'line'} line-left`} dangerouslySetInnerHTML={{ __html: formatCell(cols[0], raw) }} />
        <span className={`fmc-block ${label ? 'label' : 'line'} line-right`} dangerouslySetInnerHTML={{ __html: formatCell(cols[1], raw) }} />
        <span className={`fmc-block ${label ? 'label' : 'line'} line-center`} dangerouslySetInnerHTML={{ __html: formatCell(cols[2], raw) }} />
    </div>
);

function formatScratchpad(scratchpad) {
    let center = false;
    if (Array.isArray(scratchpad)) {
        center = scratchpad[1] === "center";
        scratchpad = scratchpad[0].trim();
    }
    scratchpad = escapeHTML(scratchpad)
    if (center) {
        scratchpad = ''.padEnd((23 - scratchpad.length)/2) + scratchpad;
    }
    scratchpad = scratchpad.padEnd(23).substring(0,23);
    return `<span class='blue'>[</span>${scratchpad}<span class='blue'>]</span>`;
}

export const McduScreen = ({ content }) => {
    if (!content.power) {
        return (
            <div className="screen" xmlns="http://www.w3.org/1999/xhtml">
            </div>
        );
    }
    const lines = [];
    let anyValue = false;
    for (let i=0; i<12; i++){
        let lineData = i < content.lines.length ? content.lines[i] : null;
        lineData = lineData || ['', '', ''];
        lineData.forEach(x=>anyValue |= x != '');
        lines.push(<Line label={i % 2 === 0} cols={lineData} />);
    }
    const scratchpad = anyValue ? formatScratchpad(content.scratchpad) : '';
    const exec = content.exec ? "EXEC[blackwhite]" : "";
    return (
        <div className="screen" xmlns="http://www.w3.org/1999/xhtml">
            <Line cols={['', '', '']} />
            <Line cols={[content.titleLeft, content.page, content.title]} />
            {lines}
            <Line raw='true' cols={[scratchpad, '', '']} />
            <Line cols={[content.message, exec, '']} />
        </div>
    );
};
