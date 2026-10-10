/**
 * Align package.json "version" with release-version.json (no staging/deliver).
 */
const path = require('path');
const { syncPackageVersionFromRelease } = require('./build-utils');

syncPackageVersionFromRelease(path.resolve(__dirname, '..'));
