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
  console.log('TASKPULSE • GITHUB REPOSITORY & RELEASE VERSIONING');
  console.log('=====================================================');

  const gitDir = path.join(projectDir, '.git');
  const isNew = !fs.existsSync(gitDir);

  if (isNew) {
    console.log('[Git] Initializing new Git repository...');
    await git.init({ fs, dir: projectDir, defaultBranch: 'main' });
  } else {
    console.log('[Git] Using existing Git repository in taskpulse');
  }

  // Get all files
  const files = getFiles(projectDir);
  console.log(`[Git] Staging ${files.length} project files...`);

  for (const file of files) {
    await git.add({ fs, dir: projectDir, filepath: file });
  }

  // Create commit
  const author = {
    name: 'Hariprasanth',
    email: 'hariprasanth@taskpulse.app'
  };

  const version = 'v2.5.0';
  const commitMsg = `Release ${version}: macOS 26 Liquid Glass UI, LeetCode sync fix, Apple SF Pro typography, and showcase web page`;

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

  console.log('\n=====================================================');
  console.log('SUCCESS: Local Git repository is fully up to date!');
  console.log('=====================================================');
  console.log('\nTo connect and push to your GitHub account:');
  console.log('1. Create a repository named "taskpulse" on GitHub (https://github.com/new)');
  console.log('2. Run these commands:');
  console.log('   git remote add origin https://github.com/<YOUR_USERNAME>/taskpulse.git');
  console.log('   git branch -M main');
  console.log('   git push -u origin main --tags');
  console.log('\nGitHub Pages Hosting:');
  console.log('   In your GitHub Repo Settings > Pages, select Source: "Deploy from a branch", Branch: "main", Folder: "/docs"');
  console.log('   Your showcase landing website will be live at https://<YOUR_USERNAME>.github.io/taskpulse/');
}

syncGit().catch(console.error);
