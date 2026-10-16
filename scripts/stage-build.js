/**
 * Stage build: assemble versioned Community package under build/,
 * remap ContentInfo, copy docs, patch manifest + layout.
 */
const fs = require('fs');
const path = require('path');
const {
  getPackages,
  readReleaseVersion,
  syncPackageVersionFromRelease,
  versionedPackageFolderName,
  thumbnailFilename,
  remapContentInfoToVersionedFolder,
  copyCustomerDocumentation,
  applyManifestAndLayout,
  writeSimPackages
} = require('./build-utils');

const ROOT = path.resolve(__dirname, '..');

function assemblePackage(pkg, destPkg) {
  fs.rmSync(destPkg, { recursive: true, force: true });

  const sourceSubdir = pkg.sourceSubdir || '1 - Src';
  const src = path.join(ROOT, sourceSubdir, pkg.packageFolderName);
  if (!fs.existsSync(src)) {
    throw new Error(`Source package not found: ${src}`);
  }
  fs.cpSync(src, destPkg, { recursive: true });
}

/** Ship the Web CDU hub with a local ws runtime so start-web-cdu.cmd works from Community. */
function vendorWebCduRuntime(destPkg) {
  const webDir = path.join(destPkg, 'web-cdu');
  if (!fs.existsSync(webDir)) {
    return;
  }
  const wsSrc = path.join(ROOT, 'node_modules', 'ws');
  if (!fs.existsSync(path.join(wsSrc, 'index.js')) || !fs.existsSync(path.join(wsSrc, 'lib'))) {
    throw new Error('Missing node_modules/ws. Run npm install before building the Web CDU hub.');
  }
  const dest = path.join(webDir, 'node_modules', 'ws');
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const name of ['package.json', 'index.js', 'browser.js', 'wrapper.mjs', 'LICENSE', 'README.md']) {
    const from = path.join(wsSrc, name);
    if (fs.existsSync(from)) {
      fs.copyFileSync(from, path.join(dest, name));
    }
  }
  fs.cpSync(path.join(wsSrc, 'lib'), path.join(dest, 'lib'), { recursive: true });
  console.log('  Vendored web-cdu/node_modules/ws');
}

function installCommunityPackage(communityDir, src, folderName, pkg) {
  if (!communityDir) return;
  if (!fs.existsSync(communityDir)) {
    throw new Error(`Community folder not found: ${communityDir}`);
  }

  const dest = path.join(communityDir, folderName);
  const prefix = `${pkg.packageFolderName}-v`;
  const unversioned = path.join(communityDir, pkg.packageFolderName);

  for (const name of fs.readdirSync(communityDir)) {
    if (name.startsWith(prefix) && name !== folderName) {
      fs.rmSync(path.join(communityDir, name), { recursive: true, force: true });
      console.log(`  Removed older Community package ${name}`);
    }
  }
  if (fs.existsSync(unversioned) && path.resolve(unversioned) !== path.resolve(dest)) {
    fs.rmSync(unversioned, { recursive: true, force: true });
    console.log(`  Removed unversioned Community package ${pkg.packageFolderName}`);
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log(`  Copied to ${dest}`);
}

function copyStagedPackageToCommunity(pkg, version, variants) {
  const configPath = path.join(ROOT, 'build-config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const folderName = versionedPackageFolderName(pkg, version);
  if (!config.communityDir && !config.fs2020CommunityDir) return;
  installCommunityPackage(config.communityDir, variants.msfs2024, folderName, pkg);
  installCommunityPackage(config.fs2020CommunityDir, variants.msfs2020, folderName, pkg);
}

function stageOnePackage(pkg, version, BUILD_DIR) {
  const folderName = versionedPackageFolderName(pkg, version);
  const destPkg = path.join(BUILD_DIR, folderName);
  console.log(`Staging v${version} → ${destPkg}\n`);

  assemblePackage(pkg, destPkg);
  vendorWebCduRuntime(destPkg);
  remapContentInfoToVersionedFolder(destPkg, folderName, thumbnailFilename(pkg));
  copyCustomerDocumentation(ROOT, pkg, destPkg);

  const depPatch = pkg.dependencyPackageNamesForVersionPatch || [];
  applyManifestAndLayout(destPkg, version, depPatch);
  const variants = writeSimPackages(destPkg, version, depPatch);
  fs.rmSync(destPkg, { recursive: true, force: true });
  console.log(`  Manifest + layout: ${folderName}`);
  copyStagedPackageToCommunity(pkg, version, variants);
}

function main() {
  syncPackageVersionFromRelease(ROOT);
  const packages = getPackages(ROOT);
  const version = readReleaseVersion(ROOT);
  const BUILD_DIR = path.join(ROOT, 'build');

  fs.mkdirSync(BUILD_DIR, { recursive: true });

  for (const pkg of packages) {
    stageOnePackage(pkg, version, BUILD_DIR);
    console.log('');
  }

  console.log('Done. Unminified builds are ready under build/ only (no dist/, no minify, no zip).');
  console.log('    For shipping: npm run release  →  rebuilds build/ then dist/ + minify + zip.');
}

try {
  main();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
