'use strict';

const copy = require('rollup-plugin-copy');
const babel = require('@rollup/plugin-babel').default;
const nodeResolve = require('@rollup/plugin-node-resolve').default;
const commonjs = require('@rollup/plugin-commonjs');
const postcss = require('rollup-plugin-postcss');
const replace = require('@rollup/plugin-replace');
const path = require('path');

function subpath(subPath) {
    // rollup doesn't like backslashes.  Undo them.
    var rval = `${path.join(__dirname, subPath)}`;
    rval = rval.replaceAll('\\','/');
    return rval;
}

export default {
    input: path.join(__dirname, 'src/index.jsx'),
    output: {
        file: path.join(__dirname, './build/bundle.js'),
        format: 'iife',
        sourcemap: true,
    },
    plugins: [
        replace({ 'process.env.NODE_ENV': JSON.stringify('production'), preventAssignment: true }),
        postcss(),
        copy({
            targets: [
                {
                    src:subpath('./public/*'),
                    dest: subpath('./build/'),
                },
            ],
        }),
        nodeResolve({ extensions: ['.js', '.jsx', '.ts', '.tsx'] }),
        babel({ presets: ['@babel/preset-react'], babelHelpers: 'bundled' }),
        commonjs(),
    ],
};
