import React, { useContext } from 'react';

export const Button = ({ onClick, name }) => {
    if (name.length) {
        return (
            <div className="button" onClick={() => onClick(name)} />
        );
    }
    return <div className="dummy" />;
};