const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const assetsDir = path.resolve(__dirname, '../assets');
const soundsDir = path.resolve(assetsDir, 'sounds');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir, { recursive: true });

// 1. Generate Alarm WAV audio file
function generateWavFile(filename, durationSec = 2.0, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM = 1)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Synthesize repeating alert beeps (880Hz / 660Hz)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Pattern: 4 beeps per second
    const cycle = t % 0.5;
    if (cycle < 0.2) {
      const freq = cycle < 0.1 ? 880 : 660;
      const env = Math.sin((cycle / 0.2) * Math.PI); // Envelope
      sample = Math.sin(2 * Math.PI * freq * t) * env * 0.7;
    }

    const intSample = Math.max(-32767, Math.min(32767, Math.floor(sample * 32767)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
  console.log(`[generate-assets] Created WAV: ${filename}`);
}

// 2. Generate PNG buffer with CRC32
function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const crcTable = createCrc32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePng(width, height, isTray = false) {
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;
  const innerRadius = width * 0.24;

  for (let y = 0; y < height; y++) {
    rawData[y * rowSize] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pxIdx = y * rowSize + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Outer glow or border
        if (dist > radius - 2 && !isTray) {
          // #238636 dark green border
          rawData[pxIdx] = 35;
          rawData[pxIdx + 1] = 134;
          rawData[pxIdx + 2] = 54;
          rawData[pxIdx + 3] = 255;
        } else if (dist <= innerRadius) {
          // Bright green center #39d353
          rawData[pxIdx] = 57;
          rawData[pxIdx + 1] = 211;
          rawData[pxIdx + 2] = 83;
          rawData[pxIdx + 3] = 255;
        } else {
          // Background #161b22 dark surface or green fill
          if (isTray) {
            rawData[pxIdx] = 57;
            rawData[pxIdx + 1] = 211;
            rawData[pxIdx + 2] = 83;
            rawData[pxIdx + 3] = 255;
          } else {
            rawData[pxIdx] = 22;
            rawData[pxIdx + 1] = 27;
            rawData[pxIdx + 2] = 34;
            rawData[pxIdx + 3] = 255;
          }
        }
      } else {
        rawData[pxIdx + 3] = 0; // Transparent
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // Build PNG chunks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace

  const ihdrChunk = Buffer.alloc(4 + 4 + 13 + 4);
  ihdrChunk.writeUInt32BE(13, 0);
  ihdrChunk.write('IHDR', 4);
  ihdrData.copy(ihdrChunk, 8);
  const ihdrCrc = crc32(ihdrChunk.subarray(4, 21));
  ihdrChunk.writeUInt32BE(ihdrCrc, 21);

  // IDAT chunk
  const idatChunk = Buffer.alloc(4 + 4 + compressedData.length + 4);
  idatChunk.writeUInt32BE(compressedData.length, 0);
  idatChunk.write('IDAT', 4);
  compressedData.copy(idatChunk, 8);
  const idatCrc = crc32(idatChunk.subarray(4, 8 + compressedData.length));
  idatChunk.writeUInt32BE(idatCrc, 8 + compressedData.length);

  // IEND chunk
  const iendChunk = Buffer.alloc(4 + 4 + 0 + 4);
  iendChunk.writeUInt32BE(0, 0);
  iendChunk.write('IEND', 4);
  const iendCrc = crc32(iendChunk.subarray(4, 8));
  iendChunk.writeUInt32BE(iendCrc, 8);

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 3. Make ICO wrapping PNG
function makeIcoFromPng(pngBuffer, width, height) {
  const icoHeader = Buffer.alloc(6 + 16);
  // ICONDIR
  icoHeader.writeUInt16LE(0, 0); // Reserved
  icoHeader.writeUInt16LE(1, 2); // 1 = ICO
  icoHeader.writeUInt16LE(1, 4); // 1 image

  // ICONDIRENTRY
  icoHeader.writeUInt8(width >= 256 ? 0 : width, 6);
  icoHeader.writeUInt8(height >= 256 ? 0 : height, 7);
  icoHeader.writeUInt8(0, 8); // Color palette
  icoHeader.writeUInt8(0, 9); // Reserved
  icoHeader.writeUInt16LE(1, 10); // Color planes
  icoHeader.writeUInt16LE(32, 12); // Bits per pixel
  icoHeader.writeUInt32LE(pngBuffer.length, 14); // Size
  icoHeader.writeUInt32LE(22, 18); // Offset to image data

  return Buffer.concat([icoHeader, pngBuffer]);
}

// Generate all assets
console.log('[generate-assets] Generating application assets...');
generateWavFile(path.join(soundsDir, 'alarm.wav'));

const appIconPng = makePng(256, 256, false);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), appIconPng);
console.log('[generate-assets] Created assets/icon.png');

const trayIconPng = makePng(32, 32, true);
fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), trayIconPng);
console.log('[generate-assets] Created assets/tray-icon.png');

const appIconIco = makeIcoFromPng(appIconPng, 256, 256);
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), appIconIco);
console.log('[generate-assets] Created assets/icon.ico');

console.log('[generate-assets] All assets created successfully.');
