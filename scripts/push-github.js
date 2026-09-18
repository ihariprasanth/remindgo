const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const token = process.argv[2];

if (!token) {
  console.log('=====================================================');
  console.log('REMINDGO • DIRECT GITHUB PUSH UTILITY');
  console.log('=====================================================');
  console.log('Push directly to GitHub without requiring native Git!\n');
  console.log('Step 1: Create the repo "remindgo" at:');
  console.log('        https://github.com/new\n');
  console.log('Step 2: Generate a GitHub Personal Access Token (classic):');
  console.log('        https://github.com/settings/tokens');
  console.log('        (Check the "repo" box and click Generate Token)\n');
  console.log('Step 3: Run this command in PowerShell:');
  console.log('        node scripts/push-github.js <PASTE_YOUR_GITHUB_TOKEN_HERE>\n');
  console.log('Target Repository: https://github.com/ihariprasanth/remindgo.git');
  console.log('=====================================================');
  process.exit(1);
}

async function push() {
  console.log('=====================================================');
  console.log('REMINDGO • PUSHING TO GITHUB');
  console.log('=====================================================');
  console.log('[1/2] Connecting to https://github.com/ihariprasanth/remindgo.git...');

  try {
    const pushResult = await git.push({
      fs,
      http,
      dir: projectDir,
      remote: 'origin',
      ref: 'main',
      force: false,
      onAuth: () => ({ username: token })
    });
    console.log('[Git] Main branch pushed successfully!');

    // Push tags
    console.log('[2/2] Pushing release tags...');
    try {
      await git.push({
        fs,
        http,
        dir: projectDir,
        remote: 'origin',
        ref: 'refs/tags/v2.5.0',
        onAuth: () => ({ username: token })
      });
      console.log('[Git] Tag v2.5.0 pushed successfully!');
    } catch(tagErr) {
      console.log('[Git] Tag push notice:', tagErr.message);
    }

    console.log('\n=====================================================');
    console.log('🎉 SUCCESS: Code & Website deployed to GitHub!');
    console.log('=====================================================');
    console.log('GitHub Repository: https://github.com/ihariprasanth/remindgo');
    console.log('\nNext step - Enable GitHub Pages:');
    console.log('1. Go to: https://github.com/ihariprasanth/remindgo/settings/pages');
    console.log('2. Source: "Deploy from a branch", Branch: "main", Folder: "/docs" -> Save');
    console.log('3. Your showcase website will be live at:');
    console.log('   https://ihariprasanth.github.io/remindgo/');
  } catch (err) {
    console.error('\n❌ Push Error:', err.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure the repository "remindgo" is created on https://github.com/new');
    console.log('2. Verify your Personal Access Token has the "repo" permission checked.');
  }
}

push();
