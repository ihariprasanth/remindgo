const path = require('path');
const fs = require('fs');

async function testDB() {
  console.log('[Test] Running SQLite Database verification...');
  const initSqlJs = require('sql.js');

  const wasmPath = path.resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
  const SQL = await initSqlJs({
    locateFile: () => wasmPath
  });

  const testDbFile = path.resolve(__dirname, 'test.db');
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

  const db = new SQL.Database();
  const schema = `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'General',
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      repeat TEXT DEFAULT 'none',
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      snoozed_until TEXT,
      last_notified_at TEXT
    );
  `;
  db.run(schema);

  // 1. Insert task
  const taskId = 'task_test_' + Date.now();
  const insertStmt = db.prepare(`
    INSERT INTO tasks (id, title, description, category, date, time, repeat, status, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStmt.run([taskId, 'Unit Test Task', 'Checking persistence', 'Work', '2026-09-18', '14:30', 'none', 'pending', 'high', new Date().toISOString()]);
  insertStmt.free();

  // 2. Query task
  const selectStmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
  selectStmt.bind([taskId]);
  if (!selectStmt.step()) {
    throw new Error('Task was not inserted properly!');
  }
  const row = selectStmt.getAsObject();
  console.log('[Test] Successfully retrieved task:', row.title, 'status:', row.status);
  selectStmt.free();

  // 3. Mark completed
  const completedAt = new Date().toISOString();
  db.run('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?', ['completed', completedAt, taskId]);

  // 4. Save and reload
  const exportedData = db.export();
  fs.writeFileSync(testDbFile, Buffer.from(exportedData));

  const reloadedBuffer = fs.readFileSync(testDbFile);
  const dbReloaded = new SQL.Database(reloadedBuffer);
  const verifyStmt = dbReloaded.prepare('SELECT status, completed_at FROM tasks WHERE id = ?');
  verifyStmt.bind([taskId]);
  verifyStmt.step();
  const reloadedRow = verifyStmt.getAsObject();
  console.log('[Test] Reloaded task after disk persistence:', reloadedRow);

  if (reloadedRow.status !== 'completed') {
    throw new Error('Persistence test failed: status was not completed!');
  }

  verifyStmt.free();
  dbReloaded.close();
  db.close();
  fs.unlinkSync(testDbFile);

  console.log('[Test] All SQLite database operations passed with flying colors! ✓');
}

testDB().catch((err) => {
  console.error('[Test] Error:', err);
  process.exit(1);
});
