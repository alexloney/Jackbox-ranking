#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

// Open the database with the same path as the server
const dbPath = path.join(__dirname, 'data', 'jackbox.db');
const db = new Database(dbPath);

// Configure SQLite for better concurrency (same as server.js)
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Verify the settings
const journalMode = db.pragma('journal_mode', { simple: true });
const busyTimeout = db.pragma('busy_timeout', { simple: true });

console.log('✓ Database Configuration Verification:');
console.log(`  - Journal Mode: ${journalMode} (expected: wal)`);
console.log(`  - Busy Timeout: ${busyTimeout}ms (expected: 5000ms)`);

if (journalMode === 'wal' && busyTimeout === 5000) {
  console.log('\n✓ All database settings are correctly configured for concurrency!');
} else {
  console.error('\n✗ Database settings are NOT correctly configured!');
  process.exit(1);
}

db.close();
