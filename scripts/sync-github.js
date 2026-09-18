const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

// Helper to recursively list non-ignored files
function getFiles(dir, baseDir = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  const ignored = ['node_modules', 'dist', 'dist-electron', 'release', '.git', '.data'];

  for (const entry of entries) {
    if (ignored.includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(baseDir, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      files = files.concat(getFiles(fullPath, relPath));
    } else {
      files.push(relPath);
    }
  }
  return files;
}

async function syncGit() {
  console.log('=====================================================');
  console.log('REMINDGO • GITHUB REPOSITORY & RELEASE VERSIONING');
  console.log('=====================================================');

  const gitDir = path.join(projectDir, '.git');
  const isNew = !fs.existsSync(gitDir);

  if (isNew) {
    console.log('[Git] Initializing new Git repository...');
    await git.init({ fs, dir: projectDir, defaultBranch: 'main' });
  } else {
    console.log('[Git] Using existing Git repository in remindgo');
  }

  // Get all files
  const files = getFiles(projectDir);
  console.log(`[Git] Staging ${files.length} project files...`);

  for (const file of files) {
    await git.add({ fs, dir: projectDir, filepath: file });
  }

  // Create commit
  const author = {
    name: 'ihariprasanth',
    email: 'hariprasanth.user@gmail.com'
  };

  const version = 'v2.5.4';
  const commitMsg = `Release v2.5.4: Professional Clean UI, Locked Desktop Widget, +5:30 IST Engine, and Extended Tones`;

  console.log(`[Git] Committing: "${commitMsg}"...`);
  const sha = await git.commit({
    fs,
    dir: projectDir,
    message: commitMsg,
    author
  });

  console.log(`[Git] Commit created: ${sha}`);

  // Create version tag
  try {
    await git.tag({
      fs,
      dir: projectDir,
      ref: version
    });
    console.log(`[Git] Tagged release: ${version}`);
  } catch (tagErr) {
    console.log(`[Git] Tag ${version} already exists or updated.`);
  }

  // Ensure remote origin is configured for ihariprasanth/remindgo
  try {
    const remotes = await git.listRemotes({ fs, dir: projectDir });
    const hasOrigin = remotes.some(r => r.remote === 'origin');
    const targetUrl = 'https://github.com/ihariprasanth/remindgo.git';
    if (hasOrigin) {
      await git.deleteRemote({ fs, dir: projectDir, remote: 'origin' });
    }
    await git.addRemote({ fs, dir: projectDir, remote: 'origin', url: targetUrl });
    console.log(`[Git] Remote origin configured: ${targetUrl}`);
  } catch (remoteErr) {
    console.log('[Git] Note on remote configuration:', remoteErr.message);
  }

  console.log('\n=====================================================');
  console.log('SUCCESS: Local Git repository is fully up to date!');
  console.log('=====================================================');
  console.log('\nGitHub Account: ihariprasanth');
  console.log('Repository URL: https://github.com/ihariprasanth/remindgo');
  console.log('Showcase Page:  https://ihariprasanth.github.io/remindgo/');
  console.log('\nTo publish your repository:');
  console.log('1. Open https://github.com/new and create a repository named: remindgo');
  console.log('2. Push code directly with either:');
  console.log('   a) If Git CLI is installed:');
  console.log('      git push -u origin main --tags');
  console.log('   b) Or using the Node script with your Personal Access Token:');
  console.log('      node scripts/push-github.js <YOUR_PERSONAL_ACCESS_TOKEN>');
  console.log('\nGitHub Pages Hosting:');
  console.log('   Go to https://github.com/ihariprasanth/remindgo/settings/pages');
  console.log('   Source: "Deploy from a branch", Branch: "main", Folder: "/docs"');
  console.log('   Your showcase landing website will be live at: https://ihariprasanth.github.io/remindgo/');
}

syncGit().catch(console.error);
