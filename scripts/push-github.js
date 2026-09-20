const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const projectDir = path.resolve(__dirname, '..');

function askToken() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\n👉 Paste your GitHub Personal Access Token (ghp_...): ', (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function main() {
  console.log('=====================================================');
  console.log('REMINDGO • DIRECT GITHUB PUSH UTILITY');
  console.log('=====================================================');

  let rawToken = process.argv[2];

  if (!rawToken) {
    console.log('Target: https://github.com/ihariprasanth/remindgo.git');
    rawToken = await askToken();
  }

  // Clean token: remove accidental angle brackets <>, quotes, or whitespaces
  const token = rawToken.replace(/^[<"']+|[>"']+$/g, '').trim();

  if (!token) {
    console.log('❌ Error: No token provided.');
    process.exit(1);
  }

  console.log('\n[1/3] Verifying token format...');
  if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    console.log('⚠️  Notice: Token usually begins with "ghp_" (classic) or "github_pat_" (fine-grained). Proceeding...');
  } else {
    console.log('✓ Token format recognized.');
  }

  console.log('\n[2/3] Connecting and pushing main branch to GitHub...');

  try {
    const pushResult = await git.push({
      fs,
      http,
      dir: projectDir,
      remote: 'origin',
      ref: 'main',
      force: true,
      onAuth: () => ({
        username: token,
        password: ''
      })
    });
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
    const versionTag = `v${pkg.version}`;
    console.log(`\n[3/3] Pushing release tag ${versionTag}...`);
    try {
      await git.push({
        fs,
        http,
        dir: projectDir,
        remote: 'origin',
        ref: `refs/tags/${versionTag}`,
        force: true,
        onAuth: () => ({
          username: token,
          password: ''
        })
      });
      console.log(`✓ Tag ${versionTag} pushed successfully!`);
    } catch(tagErr) {
      console.log('Note on tag push:', tagErr.message);
    }

    console.log('\n=====================================================');
    console.log('🎉 SUCCESS! RemindGo is now live on your GitHub!');
    console.log('=====================================================');
    console.log('Repository: https://github.com/ihariprasanth/remindgo');
    console.log('\nFinal Step - Turn on GitHub Pages for the showcase website:');
    console.log('1. Open: https://github.com/ihariprasanth/remindgo/settings/pages');
    console.log('2. Source: "Deploy from a branch", Branch: "main", Folder: "/docs" -> Save');
    console.log('3. Your website will be live at:');
    console.log('   https://ihariprasanth.github.io/remindgo/\n');
  } catch (err) {
    console.error('\n❌ Push Error:', err.message);
    console.log('\nImportant troubleshooting check:');
    console.log('1. If "401 Unauthorized" occurs:');
    console.log('   Go to: https://github.com/settings/tokens');
    console.log('   Make sure the token was created as "Generate new token (classic)"');
    console.log('   and has the "repo" checkbox selected (Full control of private repositories).');
    console.log('2. Copy the token immediately after generating it.');
  }
}

main().catch(console.error);
