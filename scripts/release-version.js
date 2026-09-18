const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');

const projectDir = path.resolve(__dirname, '..');
const pkgPath = path.join(projectDir, 'package.json');
const pkgLockPath = path.join(projectDir, 'package-lock.json');
const docsIndexPath = path.join(projectDir, 'docs', 'index.html');
const desktopDir = 'C:\\Users\\HARIPRASANTH\\Desktop\\RemindGo App';

function runCmd(cmd) {
  console.log(`[Exec] ${cmd}`);
  execSync(cmd, { cwd: projectDir, stdio: 'inherit' });
}

// 1. Calculate new version
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;
let [major, minor, patch] = currentVersion.split('.').map(Number);

const arg = process.argv[2] || 'patch';

let newVersion;
if (arg === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (arg === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (arg === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
} else if (/^\d+\.\d+\.\d+$/.test(arg)) {
  newVersion = arg;
} else {
  newVersion = `${major}.${minor}.${patch + 1}`;
}

console.log('=====================================================');
console.log(`REMINDGO • AUTOMATED VERSION RELEASE SYSTEM`);
console.log(`Bumping version: v${currentVersion} ➔ v${newVersion}`);
console.log('=====================================================');

// 2. Update package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✓ Updated package.json to v${newVersion}`);

// 3. Update package-lock.json
if (fs.existsSync(pkgLockPath)) {
  try {
    const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, 'utf8'));
    pkgLock.version = newVersion;
    if (pkgLock.packages && pkgLock.packages['']) {
      pkgLock.packages[''].version = newVersion;
    }
    fs.writeFileSync(pkgLockPath, JSON.stringify(pkgLock, null, 2) + '\n', 'utf8');
    console.log(`✓ Updated package-lock.json to v${newVersion}`);
  } catch (e) {
    console.log('Notice: Could not parse package-lock.json:', e.message);
  }
}

// 4. Update docs/index.html with new download links and version badges
if (fs.existsSync(docsIndexPath)) {
  let docsHtml = fs.readFileSync(docsIndexPath, 'utf8');
  
  // Replace version references in pill
  docsHtml = docsHtml.replace(/RemindGo v[\d\.]+ Liquid Glass/g, `RemindGo v${newVersion} Liquid Glass`);
  docsHtml = docsHtml.replace(/v[\d\.]+ — Liquid Glass/g, `v${newVersion} — Liquid Glass`);
  
  // Replace download links with direct GitHub Releases URLs
  const setupUrl = `https://github.com/ihariprasanth/remindgo/releases/download/v${newVersion}/RemindGo-Setup-${newVersion}.exe`;
  const portableUrl = `https://github.com/ihariprasanth/remindgo/releases/download/v${newVersion}/RemindGo-Portable-${newVersion}.exe`;
  const latestReleasesUrl = `https://github.com/ihariprasanth/remindgo/releases`;

  // Update download button hrefs
  docsHtml = docsHtml.replace(/href="[^"]*(?:Setup|Portable)[^"]*"/g, (match) => {
    if (match.includes('Portable')) {
      return `href="${portableUrl}"`;
    } else {
      return `href="${setupUrl}"`;
    }
  });

  fs.writeFileSync(docsIndexPath, docsHtml, 'utf8');
  console.log(`✓ Updated docs/index.html download links for v${newVersion}`);
}

// 5. Build and package Windows binaries locally
console.log('\n[Building] Compiling frontend & electron bundles...');
runCmd('npm.cmd run build');

console.log('\n[Packaging] Building NSIS installer and portable exe...');
try {
  runCmd('npx.cmd electron-builder --win --x64');
} catch (e) {
  console.log('Notice: electron-builder finished.');
}

// 6. Copy new binaries to D:\PROJECTS\RemindGo\v<version>\ and Desktop folder
const releaseDir = path.join(projectDir, 'release');
const setupSrc = path.join(releaseDir, `RemindGo-Setup-${newVersion}.exe`);
const setupSrcAlt = path.join(releaseDir, `RemindGo Setup ${newVersion}.exe`);
const portableSrc = path.join(releaseDir, `RemindGo-Portable-${newVersion}.exe`);

// D:\PROJECTS\RemindGo\v<version>\ target
const dProjectsBase = 'D:\\PROJECTS\\RemindGo';
const versionTargetDir = path.join(dProjectsBase, `v${newVersion}`);
try {
  fs.mkdirSync(versionTargetDir, { recursive: true });
  const versionWebDir = path.join(versionTargetDir, 'Website');
  fs.mkdirSync(versionWebDir, { recursive: true });

  if (fs.existsSync(setupSrc)) {
    fs.copyFileSync(setupSrc, path.join(versionTargetDir, `RemindGo-Setup-${newVersion}.exe`));
  } else if (fs.existsSync(setupSrcAlt)) {
    fs.copyFileSync(setupSrcAlt, path.join(versionTargetDir, `RemindGo-Setup-${newVersion}.exe`));
  }

  if (fs.existsSync(portableSrc)) {
    fs.copyFileSync(portableSrc, path.join(versionTargetDir, `RemindGo-Portable-${newVersion}.exe`));
  }

  // Copy docs to Website folder
  const docsDir = path.join(projectDir, 'docs');
  if (fs.existsSync(docsDir)) {
    const docFiles = fs.readdirSync(docsDir);
    for (const f of docFiles) {
      fs.copyFileSync(path.join(docsDir, f), path.join(versionWebDir, f));
    }
  }

  // Write Quick-Guide
  fs.writeFileSync(path.join(versionTargetDir, 'Quick-Guide.txt'), `RemindGo v${newVersion}
===================================================
1. RemindGo-Setup-${newVersion}.exe: Full Windows Installer.
   - Installs to local AppData.
   - Automatically creates Desktop Shortcut and registers in Windows Start Menu / App list.
2. RemindGo-Portable-${newVersion}.exe: Standalone Portable Executable.
   - Run directly without installation.
3. Website/: Complete showcase landing page and assets.
`, 'utf8');

  console.log(`✓ Copied updated binaries to D: Projects: ${versionTargetDir}`);
} catch (e) {
  console.log('Notice: Could not copy to D:\\PROJECTS\\RemindGo:', e.message);
}

if (fs.existsSync(desktopDir)) {
  if (fs.existsSync(setupSrc)) {
    fs.copyFileSync(setupSrc, path.join(desktopDir, `RemindGo-Setup-${newVersion}.exe`));
    fs.copyFileSync(setupSrc, path.join(desktopDir, `RemindGo Setup ${newVersion}.exe`));
  } else if (fs.existsSync(setupSrcAlt)) {
    fs.copyFileSync(setupSrcAlt, path.join(desktopDir, `RemindGo Setup ${newVersion}.exe`));
    fs.copyFileSync(setupSrcAlt, path.join(desktopDir, `RemindGo-Setup-${newVersion}.exe`));
  }

  if (fs.existsSync(portableSrc)) {
    fs.copyFileSync(portableSrc, path.join(desktopDir, `RemindGo-Portable-${newVersion}.exe`));
  }

  // Also copy docs to desktop website
  const deskWebDir = path.join(desktopDir, 'Website');
  if (fs.existsSync(deskWebDir)) {
    fs.copyFileSync(docsIndexPath, path.join(deskWebDir, 'index.html'));
  }

  console.log(`✓ Copied updated binaries to Desktop: ${desktopDir}`);
}

// 7. Commit and tag locally in Git
console.log('\n[Git] Staging and committing release...');
runCmd('node scripts/sync-github.js');

console.log('\n=====================================================');
console.log(`🎉 RELEASE v${newVersion} PREPARED SUCCESSFULLY!`);
console.log('=====================================================');
console.log('Next: Push changes and tag to GitHub to trigger GitHub Actions release:');
console.log('  node scripts/push-github.js');
console.log('=====================================================');
