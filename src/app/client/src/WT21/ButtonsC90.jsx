import React from 'react';

export const ButtonGrid = ({ children, x, y, width, height }) => (
    <div className="button-grid" style={{ left: `${x / 17.00}%`, top: `${y / 18.00}%`, width: `${width / 17.00}%`, height: `${height / 18.00}%` }}>
        {children}
    </div>
);

export const ButtonRow = ({ children }) => (
    <div className="button-row">
        {children}
    </div>
);
