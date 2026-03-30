<?php

// Perform initial database setup, create a new database if it doesn't exist already.
include '../api/db.config.php';

// Validate database name to prevent SQL injection
if (!preg_match('/^[a-zA-Z0-9_]+$/', $dbname)) {
    die("Invalid database name format.<br>");
}

try {
    // Create database if it doesn't exist (must use mysqli since we can't connect to non-existent DB with PDO)
    $conn = new mysqli($host, $username, $password, null, (int)$port);
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    $sql = "CREATE DATABASE IF NOT EXISTS `$dbname`";
    if ($conn->query($sql) === TRUE) {
        echo "Database created successfully or already exists.<br>";
    } else {
        die("Error creating database: " . $conn->error);
    }
    $conn->close();
} catch (Exception $e) {
    die("Database setup failed: " . $e->getMessage());
}

// Now we can guarantee that the database exists.

// Check for and create the config table if it doesn't exist.
include '../api/db.php';

try {
    $sql = "SELECT 1 FROM information_schema.tables WHERE table_schema = ? AND table_name = 'config' LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$dbname]);
    
    if ($stmt->fetch()) {
        echo "Table 'config' already exists.<br>";
    } else {
        // Note: CREATE TABLE causes an implicit commit in MySQL, so no transaction wrapper needed
        $sql = "CREATE TABLE config (
            id INT AUTO_INCREMENT PRIMARY KEY,
            setting_key VARCHAR(255) NOT NULL UNIQUE,
            setting_value VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_setting_key (setting_key)
        )";
        $pdo->exec($sql);
        echo "Table 'config' created successfully.<br>";

        $sql = "INSERT INTO config (setting_key, setting_value) VALUES ('version', '1')";
        $pdo->exec($sql);
        echo "Initial config version inserted.<br>";
    }
} catch (Exception $e) {
    die("Error setting up config table: " . $e->getMessage() . "<br>");
}

// Fetch the current version from the config table
$version = (int) $pdo->query("SELECT setting_value FROM config WHERE setting_key = 'version'")->fetchColumn();
echo "Current database version: $version<br><br>";

// Define all migrations
$migrations = [];

// ====================================================================
// Version 1 -> 2: Create users, games, scores, and comments tables
// ====================================================================
$migrations[2] = function($pdo) {
    echo "Running migration 1 -> 2: Creating core tables...<br>";
    
    $pdo->exec("CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_username (username)
    )");
    echo "- Table 'users' created<br>";

    $pdo->exec("CREATE TABLE games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        pack VARCHAR(255) NOT NULL,
        img VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name_pack (name, pack)
    )");
    echo "- Table 'games' created<br>";

    $pdo->exec("CREATE TABLE scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_id INT NOT NULL,
        score DOUBLE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_game (user_id, game_id),
        INDEX idx_user_id (user_id),
        INDEX idx_game_id (game_id),
        INDEX idx_score (score),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )");
    echo "- Table 'scores' created with unique constraint<br>";

    $pdo->exec("CREATE TABLE comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        comment TEXT NOT NULL,
        user_id INT NOT NULL,
        game_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_game_id (game_id),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )");
    echo "- Table 'comments' created<br>";
};

// ====================================================================
// Version 2 -> 3: Add user_aliases table
// ====================================================================
$migrations[3] = function($pdo) {
    echo "Running migration 2 -> 3: Adding user aliases...<br>";
    
    $pdo->exec("CREATE TABLE user_aliases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        alias VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_alias (alias),
        INDEX idx_user_id (user_id),
        INDEX idx_alias (alias),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");
    echo "- Table 'user_aliases' created<br>";
};

// ====================================================================
// Add new migrations here with incrementing version numbers
// ====================================================================
// $migrations[4] = function($pdo) {
//     echo "Running migration 3 -> 4: Description...<br>";
//     // Your migration code here
// };

// Run all pending migrations
$targetVersion = max(array_keys($migrations));
echo "Target version: $targetVersion<br><br>";

while ($version < $targetVersion) {
    $nextVersion = $version + 1;
    
    if (!isset($migrations[$nextVersion])) {
        echo "No migration defined for version $nextVersion, skipping...<br>";
        $version = $nextVersion;
        continue;
    }
    
    echo "========================================<br>";
    echo "Migrating from version $version to $nextVersion<br>";
    echo "========================================<br>";
    
    try {
        // Note: DDL statements (CREATE TABLE, ALTER TABLE) cause implicit commits in MySQL
        // We still use transactions to protect the version update and any DML statements
        $pdo->beginTransaction();
        
        // Run the migration
        $migrations[$nextVersion]($pdo);
        
        // Update version number
        $stmt = $pdo->prepare("UPDATE config SET setting_value = ? WHERE setting_key = 'version'");
        $stmt->execute([$nextVersion]);
        
        // Commit if transaction is still active (may have auto-committed due to DDL)
        if ($pdo->inTransaction()) {
            $pdo->commit();
        }
        
        $version = $nextVersion;
        echo "<strong>✓ Migration to version $version completed successfully!</strong><br><br>";
        
    } catch (Exception $e) {
        // Rollback if transaction is still active
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        die("<strong>✗ Migration failed:</strong> " . $e->getMessage() . "<br><br>" . 
            "<strong>Database rolled back to version $version.</strong><br>" .
            "<strong>Stack trace:</strong><br><pre>" . $e->getTraceAsString() . "</pre>");
    }
}

if ($version == $targetVersion) {
    echo "========================================<br>";
    echo "✓ Database is up to date at version $version!<br>";
    echo "========================================<br>";
}
