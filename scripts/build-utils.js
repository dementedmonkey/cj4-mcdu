/**
 * Shared helpers for LiM 747-8i v2 CDU builds (config-driven).
 * Adapted from LiM-GTX345; single versioned Community package (WT21 ContentInfo rule).
 */
const fs = require('fs');
const path = require('path');

function validatePackageEntry(pkg, index) {
  const label = `packages[${index}]`;
  if (!pkg.packageFolderName || typeof pkg.packageFolderName !== 'string') {
    throw new Error(`${label} must set string packageFolderName`);
  }
  if (pkg.minify != null) {
    const m = pkg.minify;
    if (!m.relativeDir || typeof m.relativeDir !== 'string') {
      throw new Error(`${label}.minify must set relativeDir (or null to skip)`);
    }
  }
}

function loadBuildConfig(workfolderRoot) {
  const p = path.join(workfolderRoot, 'build-config.json');
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${p}`);
  }
  const c = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!Array.isArray(c.packages) || c.packages.length === 0) {
    throw new Error('build-config.json must contain non-empty packages array');
  }
  c.packages.forEach((pkg, i) => validatePackageEntry(pkg, i));
  return c;
}

function getPackages(workfolderRoot) {
  return loadBuildConfig(workfolderRoot).packages;
}

function readReleaseVersion(workfolderRoot) {
  const p = path.join(workfolderRoot, 'release-version.json');
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${p}`);
  }
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!j.version || typeof j.version !== 'string') {
    throw new Error('release-version.json must contain a string "version"');
  }
  return j.version.trim();
}

/**
 * Set root package.json "version" to match release-version.json (single source of truth).
 */
function syncPackageVersionFromRelease(workfolderRoot) {
  const version = readReleaseVersion(workfolderRoot);
  const pkgPath = path.join(workfolderRoot, 'package.json');
  let changed = false;

  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    if (pkg.version !== version) {
      pkg.version = version;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
      changed = true;
    }
  }

  const lockPath = path.join(workfolderRoot, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    let lockChanged = false;
    if (lock.version !== version) {
      lock.version = version;
      lockChanged = true;
    }
    if (lock.packages && lock.packages[''] && lock.packages[''].version !== version) {
      lock.packages[''].version = version;
      lockChanged = true;
    }
    if (lockChanged) {
      fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
      changed = true;
    }
  }

  if (changed) {
    console.log(`Synced package.json / lock version → ${version}\n`);
  }
}

/** Versioned Community folder name, e.g. z-LiM-747v2-CDU-v1.0.0 */
function versionedPackageFolderName(pkg, version) {
  return `${pkg.packageFolderName}-v${version}`;
}

function docsDirForPackage(workfolderRoot, pkg) {
  return path.join(workfolderRoot, pkg.docsDir || '0 - DocsFolder');
}

function releaseNotesFilename(pkg) {
  return pkg.releaseNotesFile || 'RELEASE-NOTES.md';
}

function userManualFilename(pkg) {
  return pkg.userManualFile || 'USER-MANUAL.md';
}

function thumbnailFilename(pkg) {
  return pkg.thumbnailFile || 'thumbnail.jpg';
}

/** JS mtime ms → Windows FILETIME (100ns since 1601-01-01) */
function toWindowsFiletime(mtimeMs) {
  return Math.floor(mtimeMs * 10000 + 116444736000000000);
}

/** Windows can only store one casing of Instruments/Airliners. Layout paths must match the sim. */
function msfsLayoutPath(rel) {
  return String(rel)
    .replace(
      /^html_ui\/Pages\/VCockpit\/Instruments\/airliners\/(WTB747|WTB707)/i,
      'html_ui/Pages/VCockpit/Instruments/Airliners/$1'
    );
}

function scanPackageLayout(packageRoot) {
  const entries = [];

  function walk(dir, basePosix) {
    const names = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of names) {
      const full = path.join(dir, ent.name);
      const rel = basePosix ? `${basePosix}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        walk(full, rel);
      } else if (ent.isFile()) {
        if (ent.name === 'manifest.json' || ent.name === 'layout.json') continue;
        if (ent.name === '.gitkeep') continue;
        const st = fs.statSync(full);
        entries.push({
          path: msfsLayoutPath(rel),
          size: st.size,
          date: toWindowsFiletime(st.mtimeMs)
        });
      }
    }
  }

  walk(packageRoot, '');
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const total = entries.reduce((s, e) => s + e.size, 0);
  return {
    content: entries,
    totalPackageSize: total.toString().padStart(20, '0')
  };
}

function patchManifestVersions(manifest, version, dependencyNames) {
  const names = Array.isArray(dependencyNames) ? dependencyNames : [];
  const nameSet = new Set(names);
  manifest.package_version = version;
  if (nameSet.size && Array.isArray(manifest.dependencies)) {
    for (const dep of manifest.dependencies) {
      if (dep && nameSet.has(dep.name)) {
        dep.package_version = version;
      }
    }
  }
}

function applyManifestAndLayout(packageRoot, version, dependencyPackageNamesForVersionPatch) {
  const depNames = dependencyPackageNamesForVersionPatch || [];
  const manifestPath = path.join(packageRoot, 'manifest.json');
  const layoutPath = path.join(packageRoot, 'layout.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  patchManifestVersions(manifest, version, depNames);
  const { content, totalPackageSize } = scanPackageLayout(packageRoot);
  manifest.total_package_size = totalPackageSize;
  fs.writeFileSync(layoutPath, JSON.stringify({ content }, null, 2) + '\n', 'utf8');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

/**
 * Remap source ContentInfo/* into ContentInfo/{versionedFolderName}/
 * so Content Manager thumbnail path matches the Community folder name.
 */
function remapContentInfoToVersionedFolder(packageRoot, versionedFolderName, thumbName) {
  const contentInfoRoot = path.join(packageRoot, 'ContentInfo');
  const versionedDest = path.join(contentInfoRoot, versionedFolderName);

  if (!fs.existsSync(contentInfoRoot)) {
    console.warn(`  ⚠️ ContentInfo/ missing under ${packageRoot}`);
    return;
  }

  fs.mkdirSync(versionedDest, { recursive: true });

  // Move loose files at ContentInfo/ root into the versioned subfolder
  for (const ent of fs.readdirSync(contentInfoRoot, { withFileTypes: true })) {
    if (ent.name === versionedFolderName) continue;
    const full = path.join(contentInfoRoot, ent.name);
    if (ent.isFile()) {
      fs.renameSync(full, path.join(versionedDest, ent.name));
    } else if (ent.isDirectory()) {
      // Flatten any non-versioned ContentInfo subdirs (e.g. leftover stable names)
      for (const nested of fs.readdirSync(full, { withFileTypes: true })) {
        if (nested.isFile()) {
          fs.renameSync(path.join(full, nested.name), path.join(versionedDest, nested.name));
        }
      }
      fs.rmSync(full, { recursive: true, force: true });
    }
  }

  const thumbPath = path.join(versionedDest, thumbName);
  if (!fs.existsSync(thumbPath)) {
    console.warn(`  ⚠️ Missing ${thumbName} under ContentInfo/${versionedFolderName}/`);
  } else {
    console.log(`  ContentInfo → ContentInfo/${versionedFolderName}/${thumbName}`);
  }
}

function copyCustomerDocumentation(workfolderRoot, pkg, packageRoot) {
  const docsDir = docsDirForPackage(workfolderRoot, pkg);
  const destDir = path.join(packageRoot, 'documentation');
  fs.mkdirSync(destDir, { recursive: true });

  const files = [releaseNotesFilename(pkg), userManualFilename(pkg)];
  for (const filename of files) {
    const src = path.join(docsDir, filename);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing ${src}`);
    }
    fs.copyFileSync(src, path.join(destDir, filename));
  }
  console.log(`  Copied documentation/ (${files.join(', ')})`);
}

module.exports = {
  loadBuildConfig,
  getPackages,
  readReleaseVersion,
  syncPackageVersionFromRelease,
  versionedPackageFolderName,
  docsDirForPackage,
  releaseNotesFilename,
  userManualFilename,
  thumbnailFilename,
  scanPackageLayout,
  patchManifestVersions,
  applyManifestAndLayout,
  remapContentInfoToVersionedFolder,
  copyCustomerDocumentation
};
