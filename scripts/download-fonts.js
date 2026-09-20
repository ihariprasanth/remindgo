const https = require('https');
const fs = require('fs');
const path = require('path');

const fontsDir = path.resolve(__dirname, '../assets/fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

const fonts = [
  'SF-Pro-Display-Regular.otf',
  'SF-Pro-Display-Medium.otf',
  'SF-Pro-Display-Semibold.otf',
  'SF-Pro-Display-Bold.otf',
  'SF-Pro-Text-Regular.otf',
  'SF-Pro-Text-Medium.otf',
  'SF-Pro-Text-Semibold.otf',
  'SF-Pro-Text-Bold.otf'
];

function download(filename) {
  return new Promise((resolve, reject) => {
    const dest = path.join(fontsDir, filename);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 100000) {
      console.log(`Already downloaded: ${filename}`);
      return resolve();
    }
    const url = `https://raw.githubusercontent.com/sahibjotsaggu/San-Francisco-Pro-Fonts/master/${encodeURIComponent(filename)}`;
    console.log(`Downloading ${filename}...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Saved: ${filename} (${fs.statSync(dest).size} bytes)`);
            resolve();
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Saved: ${filename} (${fs.statSync(dest).size} bytes)`);
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  for (const f of fonts) {
    try {
      await download(f);
    } catch (e) {
      console.error(`Failed to download ${f}:`, e.message);
    }
  }
  console.log('All fonts ready.');
}

run();
