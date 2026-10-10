/**
 * Minify authored instrument assets under a folder (release / dist only).
 * Skips vendored SDK bundles in Libraries/ by default.
 *
 * CLI (tree): node scripts/minify.js <dir> [versionLabel]
 * CLI (legacy pair): node scripts/minify.js <dir> <jsBasename> <cssBasename> [versionLabel]
 */
const fs = require('fs');
const path = require('path');
const { minify: minifyJs } = require('terser');
const CleanCSS = require('clean-css');

const PRODUCT_LABEL = 'DementedMonkey-LiM-CDU';
const DEFAULT_EXCLUDE_DIRS = new Set(['Libraries']);

function shouldSkipDir(dirName, excludeDirs) {
  return excludeDirs.has(dirName);
}

function listAuthoredAssets(rootDir, { extensions, excludeDirs }) {
  const exts = extensions || ['.js', '.css'];
  const files = [];

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (shouldSkipDir(ent.name, excludeDirs)) {
          continue;
        }
        walk(full);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (exts.includes(ext)) {
          files.push(full);
        }
      }
    }
  }

  if (!fs.existsSync(rootDir)) {
    throw new Error(`Minify root not found: ${rootDir}`);
  }
  walk(rootDir);
  return files.sort();
}

async function minifyOneJs(jsPath, versionLabel) {
  const jsSource = fs.readFileSync(jsPath, 'utf8');
  const jsResult = await minifyJs(jsSource, {
    compress: {
      drop_console: false,
      passes: 1
    },
    mangle: {
      toplevel: true,
      properties: false
    },
    format: {
      comments: false,
      preamble: `/* ${PRODUCT_LABEL} v${versionLabel} - minified */`
    }
  });

  if (jsResult.error) {
    throw new Error(`JS minification failed (${path.basename(jsPath)}): ${jsResult.error}`);
  }
  fs.writeFileSync(jsPath, jsResult.code, 'utf8');
  const savings = ((1 - jsResult.code.length / jsSource.length) * 100).toFixed(1);
  console.log(
    `  ✓ ${path.basename(jsPath)}: ${(jsSource.length / 1024).toFixed(1)} KB → ${(jsResult.code.length / 1024).toFixed(1)} KB (${savings}% smaller)`
  );
}

function minifyOneCss(cssPath) {
  const cssSource = fs.readFileSync(cssPath, 'utf8');
  const cssResult = new CleanCSS({ level: 2 }).minify(cssSource);
  if (cssResult.errors.length) {
    throw new Error(`CSS minification failed (${path.basename(cssPath)}): ${cssResult.errors.join(', ')}`);
  }
  fs.writeFileSync(cssPath, cssResult.styles, 'utf8');
  const savings = ((1 - cssResult.styles.length / cssSource.length) * 100).toFixed(1);
  console.log(
    `  ✓ ${path.basename(cssPath)}: ${(cssSource.length / 1024).toFixed(1)} KB → ${(cssResult.styles.length / 1024).toFixed(1)} KB (${savings}% smaller)`
  );
}

async function minifyAuthoredTree(targetDir, versionLabel, options = {}) {
  const label = versionLabel || 'dev';
  const excludeDirs = options.excludeDirs || DEFAULT_EXCLUDE_DIRS;
  const extensions = options.extensions || ['.js', '.css'];

  const files = listAuthoredAssets(targetDir, { extensions, excludeDirs });
  if (files.length === 0) {
    throw new Error(`No authored assets to minify under ${targetDir}`);
  }

  console.log(`Minifying ${files.length} file(s) in ${targetDir} (skip: ${[...excludeDirs].join(', ')})\n`);

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.js') {
      await minifyOneJs(filePath, label);
    } else if (ext === '.css') {
      minifyOneCss(filePath);
    }
  }

  console.log('\nDone.');
}

async function minifyInstrument(targetDir, names, versionLabel) {
  const label = versionLabel || 'dev';
  const jsName = names && names.js;
  const cssName = names && names.css;
  if (!jsName || !cssName) {
    throw new Error('minifyInstrument requires names.js and names.css');
  }
  console.log(`Minifying in ${targetDir}\n`);
  await minifyOneJs(path.join(targetDir, jsName), label);
  minifyOneCss(path.join(targetDir, cssName));
  console.log('\nDone.');
}

async function cli() {
  const dir = process.argv[2] || process.env.LIM_MINIFY_DIR;
  const arg3 = process.argv[3];
  const arg4 = process.argv[4];
  const arg5 = process.argv[5];

  if (!dir) {
    console.error(
      'Usage:\n' +
        '  node scripts/minify.js <dir> [versionLabel]\n' +
        '  node scripts/minify.js <dir> <jsBasename> <cssBasename> [versionLabel]'
    );
    process.exit(1);
  }

  const resolved = path.resolve(dir);
  if (arg3 && arg3.endsWith('.js') && arg4 && arg4.endsWith('.css')) {
    const version = arg5 || process.env.LIM_RELEASE_VERSION || '';
    await minifyInstrument(resolved, { js: arg3, css: arg4 }, version || undefined);
    return;
  }

  const version = arg3 || process.env.LIM_RELEASE_VERSION || '';
  await minifyAuthoredTree(resolved, version || undefined);
}

if (require.main === module) {
  cli().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { minifyInstrument, minifyAuthoredTree, listAuthoredAssets };
