import React from 'react';

export const ButtonGrid = ({ children, x, y, width, height }) => (
    <div className="button-grid" style={{ left: `${x / 8.35}%`, top: `${y / 12.80}%`, width: `${width / 8.35}%`, height: `${height / 12.80}%` }}>
        {children}
    </div>
);

export const ButtonRow = ({ children }) => (
    <div className="button-row">
        {children}
    </div>
);
