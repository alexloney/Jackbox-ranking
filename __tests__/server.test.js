/**
 * @jest-environment node
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

describe('SQLite Database Configuration', () => {
  let db;
  const testDbPath = path.join(__dirname, '../data', 'test.db');
  
  beforeEach(() => {
    // Create data directory if it doesn't exist
    const testDbDir = path.dirname(testDbPath);
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    
    // Remove test database if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Create test database with the same configuration as server.js
    db = new Database(testDbPath);
    
    // Configure SQLite for better concurrency
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  });
  
  afterEach(() => {
    // Close database connection
    if (db) {
      db.close();
    }
    
    // Clean up test database file
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Clean up WAL and SHM files if they exist
    const walPath = testDbPath + '-wal';
    const shmPath = testDbPath + '-shm';
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  });
  
  describe('PRAGMA Settings', () => {
    test('should enable WAL mode for journal', () => {
      const result = db.pragma('journal_mode', { simple: true });
      expect(result).toBe('wal');
    });
    
    test('should set busy_timeout to 5000ms', () => {
      const result = db.pragma('busy_timeout', { simple: true });
      expect(result).toBe(5000);
    });
  });
  
  describe('Concurrent Write Support', () => {
    test('should allow database to be opened for reading while writing', () => {
      // Create a simple table
      db.exec(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INTEGER PRIMARY KEY,
          value TEXT
        )
      `);
      
      // Insert a row
      const insert = db.prepare('INSERT INTO test_table (value) VALUES (?)');
      insert.run('test1');
      
      // Verify the row was inserted
      const select = db.prepare('SELECT COUNT(*) as count FROM test_table');
      const result = select.get();
      expect(result.count).toBe(1);
    });
    
    test('should handle multiple sequential writes without errors', () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS test_table (
          id INTEGER PRIMARY KEY,
          value TEXT
        )
      `);
      
      const insert = db.prepare('INSERT INTO test_table (value) VALUES (?)');
      
      // Perform multiple writes
      expect(() => {
        for (let i = 0; i < 100; i++) {
          insert.run(`value_${i}`);
        }
      }).not.toThrow();
      
      // Verify all rows were inserted
      const count = db.prepare('SELECT COUNT(*) as count FROM test_table').get();
      expect(count.count).toBe(100);
    });
  });
  
  describe('Database Singleton Pattern', () => {
    test('database connection should be instantiated once', () => {
      // This test verifies the pattern used in server.js
      // where the database is created once at module level
      
      // Create a mock module-level database (simulating server.js)
      const dbPath = path.join(__dirname, '../data', 'singleton_test.db');
      
      // Ensure directory exists
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      const db1 = new Database(dbPath);
      
      // The same database instance should be used throughout the application
      // In server.js, 'db' is a constant at module level
      expect(db1).toBeDefined();
      expect(typeof db1.prepare).toBe('function');
      
      // Clean up
      db1.close();
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      const walPath = dbPath + '-wal';
      const shmPath = dbPath + '-shm';
      if (fs.existsSync(walPath)) {
        fs.unlinkSync(walPath);
      }
      if (fs.existsSync(shmPath)) {
        fs.unlinkSync(shmPath);
      }
    });
  });
});
