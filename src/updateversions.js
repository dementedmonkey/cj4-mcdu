/*
Update version in XML or JSON files
*/

var files = [
    'src/app/package.json',
    'src/mod/PackageDefinitions/z-dementedmonkey-cj4-mcdu.xml'
];

const fs = require('fs');
const path = require('path');

const root = path.resolve( path.join(__dirname,'..'));
const version = fs.readFileSync( path.join(root,'version')).toString().trim();

function regexForExtension(filename) {
    if (filename.endsWith('.json')) {
        return /("[vV]ersion"\s*:\s*")([0-9.]+)(")/g;
    }
    if (filename.endsWith('.xml')) {
        // Version is in an attribute with double quotes
        // negative lookbehind to not change the XML version        
        return /(?<!xml)(\s+[vV]ersion\s*=\s*")([0-9.]+)(")/g
    }
    throw new Error(`Unrecognized extension of ${filename}`);
}

function fixVersion(filename) {    
    const fullname = path.isAbsolute(filename) ? filename : path.join(root,filename);
    var text = fs.readFileSync(fullname).toString();
    
    const rex = regexForExtension(filename);
    var changed = text.replace(rex,`$1${version}$3`);
    if (changed != text) {
        fs.writeFileSync(fullname,changed);
        console.log(`updated ${fullname}`);
    } else {
        console.log(`Did not change ${fullname}`);
    }
}

for (const file of files) {
    fixVersion(file);
}
