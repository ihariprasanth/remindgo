const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  const outDir = path.resolve(__dirname, '../dist-electron');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Copy sql-wasm.wasm from node_modules/sql.js/dist/ if available
  const sqlWasmSrc = path.resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
  const sqlWasmDest = path.resolve(outDir, 'sql-wasm.wasm');
  if (fs.existsSync(sqlWasmSrc)) {
    fs.copyFileSync(sqlWasmSrc, sqlWasmDest);
    console.log('[build-electron] Copied sql-wasm.wasm to dist-electron');
  }

  // Also copy to public/ or dist/ for renderer if needed
  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distDir) && fs.existsSync(sqlWasmSrc)) {
    fs.copyFileSync(sqlWasmSrc, path.resolve(distDir, 'sql-wasm.wasm'));
  }

  console.log('[build-electron] Compiling Electron main and preload...');
  await esbuild.build({
    entryPoints: [
      path.resolve(__dirname, '../electron/main.ts'),
      path.resolve(__dirname, '../electron/preload.ts')
    ],
    outdir: outDir,
    bundle: true,
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    external: ['electron', 'sql.js']
  });

  console.log('[build-electron] Compilation completed successfully.');
}

build().catch((err) => {
  console.error('[build-electron] Error:', err);
  process.exit(1);
});
