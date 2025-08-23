import React, { useContext } from 'react';

import './Button.css';


export const ButtonGrid = ({ children, x, y, width, height }) => (
    <div className="button-grid" style={{ left: `calc(${x} * var(--app-x))`, top: `calc(${y} * var(--app-y))`, width: `calc(${width} * var(--app-x))`, height: `calc(${height} * var(--app-y))` }}>
        {children}
    </div>
);

export const ButtonRow = ({ children }) => (
    <div className="button-row">
        {children}
    </div>
);

export const Button = ({ onClick, name }) => {
    if (name.length) {
        return (
            <div className="button" onClick={() => onClick(name)} />
        );
    }
    return <div className="dummy" />;
};
