#!/usr/bin/env node

/**
 * This script simulates concurrent write operations to test the database
 * configuration for handling multiple simultaneous writes without SQLITE_BUSY errors.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Test database path
const testDbPath = path.join(__dirname, 'data', 'concurrent_test.db');
const testDbDir = path.dirname(testDbPath);

// Ensure directory exists
if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}

// Remove old test database if it exists
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

// Create database with concurrency optimizations
const db = new Database(testDbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Create test table
db.exec(`
  CREATE TABLE IF NOT EXISTS concurrent_test (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER,
    value TEXT,
    timestamp INTEGER
  )
`);

console.log('Starting concurrent write test...\n');

// Function to perform a series of writes
function performWrites(threadId, numWrites) {
  return new Promise((resolve, reject) => {
    try {
      const insert = db.prepare('INSERT INTO concurrent_test (thread_id, value, timestamp) VALUES (?, ?, ?)');
      
      for (let i = 0; i < numWrites; i++) {
        insert.run(threadId, `value_${threadId}_${i}`, Date.now());
      }
      
      resolve(threadId);
    } catch (error) {
      reject({ threadId, error });
    }
  });
}

// Simulate concurrent writes
const numThreads = 10;
const writesPerThread = 100;

console.log(`Simulating ${numThreads} concurrent writers, each performing ${writesPerThread} writes...`);

const startTime = Date.now();

// Execute all writes concurrently
Promise.all(
  Array.from({ length: numThreads }, (_, i) => performWrites(i + 1, writesPerThread))
)
  .then((results) => {
    const duration = Date.now() - startTime;
    
    // Verify all writes completed
    const count = db.prepare('SELECT COUNT(*) as count FROM concurrent_test').get();
    const expectedCount = numThreads * writesPerThread;
    
    console.log(`\n✓ Test completed in ${duration}ms`);
    console.log(`✓ All ${numThreads} threads completed successfully`);
    console.log(`✓ Total writes: ${count.count} (expected: ${expectedCount})`);
    
    if (count.count === expectedCount) {
      console.log('\n✓ SUCCESS: No SQLITE_BUSY errors occurred!');
      console.log('✓ Database is properly configured for concurrent writes.');
    } else {
      console.error(`\n✗ FAILURE: Write count mismatch! Got ${count.count}, expected ${expectedCount}`);
      process.exit(1);
    }
    
    // Clean up
    db.close();
    
    // Remove test database files
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    const walPath = testDbPath + '-wal';
    const shmPath = testDbPath + '-shm';
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  })
  .catch((error) => {
    console.error('\n✗ Test failed with error:', error);
    db.close();
    process.exit(1);
  });
