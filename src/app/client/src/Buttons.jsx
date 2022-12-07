import React from 'react';

export const ButtonGrid = ({ children, x, y, width, height }) => (
    <div className="button-grid" style={{ left: `${x / 14.00}%`, top: `${y / 16.50}%`, width: `${width / 14.00}%`, height: `${height / 16.50}%` }}>
        {children}
    </div>
);

export const ButtonRow = ({ children }) => (
    <div className="button-row">
        {children}
    </div>
);
