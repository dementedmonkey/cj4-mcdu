/**
 * Release pipeline: copy build → dist, optional minify, refresh layout, zip.
 * Intended entry: `npm run release` (runs stage-build then this script).
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { minifyAuthoredTree } = require('./minify');
const {
  getPackages,
  readReleaseVersion,
  syncPackageVersionFromRelease,
  versionedPackageFolderName,
  applyManifestAndLayout
} = require('./build-utils');

const ROOT = path.resolve(__dirname, '..');

function zipDirectory(sourceDir, zipFile) {
  const src = path.resolve(sourceDir);
  const dst = path.resolve(zipFile);
  if (fs.existsSync(dst)) {
    fs.unlinkSync(dst);
  }

  if (process.platform === 'win32') {
    const srcEsc = src.replace(/'/g, "''");
    const dstEsc = dst.replace(/'/g, "''");
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Compress-Archive -LiteralPath '${srcEsc}' -DestinationPath '${dstEsc}' -Force`
      ],
      { stdio: 'inherit' }
    );
  } else {
    const parent = path.dirname(src);
    const base = path.basename(src);
    execFileSync('zip', ['-r', '-q', dst, base], { cwd: parent, stdio: 'inherit' });
  }
}

async function deliverOneVariant(pkg, version, distRoot, sim) {
  const folderName = versionedPackageFolderName(pkg, version);
  const srcPkg = path.join(ROOT, 'build', sim, folderName);
  const dstPkg = path.join(distRoot, sim, folderName);
  const zipPath = path.join(distRoot, `${folderName}-${sim}.zip`);

  if (!fs.existsSync(srcPkg)) {
    throw new Error(
      `Missing staged folder: ${srcPkg}\n` +
        '  Run: npm run build   (test build/ only), or   npm run release   (full ship to dist/).'
    );
  }

  console.log(`Release ${folderName} (${sim}) → dist/\n`);
  console.log(`  Copy ${srcPkg} → ${dstPkg}`);

  fs.rmSync(dstPkg, { recursive: true, force: true });
  fs.cpSync(srcPkg, dstPkg, { recursive: true });

  if (pkg.minify) {
    const minifyDir = path.join(dstPkg, pkg.minify.relativeDir.replace(/\\/g, '/'));
    if (fs.existsSync(minifyDir)) {
      try {
        await minifyAuthoredTree(minifyDir, version);
      } catch (e) {
        if (String(e.message || e).includes('No authored assets to minify')) {
          console.log(`  (minify skipped — no .js/.css under ${pkg.minify.relativeDir})`);
        } else {
          throw e;
        }
      }
    } else {
      console.log(`  (minify skipped — missing ${pkg.minify.relativeDir})`);
    }
  } else {
    console.log('  (minify skipped for this package)');
  }

  const depPatch = pkg.dependencyPackageNamesForVersionPatch || [];
  applyManifestAndLayout(dstPkg, version, depPatch);
  console.log(`  Refreshed manifest + layout: ${folderName}`);

  console.log(`\n  Zipping → ${zipPath}`);
  zipDirectory(dstPkg, zipPath);
  console.log('');
}

async function deliverOnePackage(pkg, version, distRoot) {
  const legacyZip = path.join(distRoot, `${versionedPackageFolderName(pkg, version)}.zip`);
  if (fs.existsSync(legacyZip)) {
    fs.unlinkSync(legacyZip);
  }
  await deliverOneVariant(pkg, version, distRoot, 'msfs2024');
  await deliverOneVariant(pkg, version, distRoot, 'msfs2020');
}

async function main() {
  syncPackageVersionFromRelease(ROOT);
  const packages = getPackages(ROOT);
  const version = readReleaseVersion(ROOT);
  const distRoot = path.join(ROOT, 'dist');

  fs.mkdirSync(distRoot, { recursive: true });

  for (const pkg of packages) {
    await deliverOnePackage(pkg, version, distRoot);
  }

  console.log('Done. Release artifacts under dist/ (versioned Community folder + .zip).');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
