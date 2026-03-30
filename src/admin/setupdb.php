<?php

// Perform initial database setup, create a new database if it doesn't exist already.
include '../api/db.config.php';
try {
    // Create database if it doesn't exist
    $conn = new mysqli($host, $username, $password);
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
    $sql = "CREATE DATABASE IF NOT EXISTS $dbname";
    if ($conn->query($sql) === TRUE) {
        echo "Database created successfully or already exists.<br>";
    } else {
        die("Error creating database: " . $conn->error);
    }
    $conn->close();
} catch (Exception $e) {
    die("Database setup failed: " . $e->getMessage());
}

// Now we can guarentee that the database exists.

// Check for and create the config table if it doesn't exist.
include '../api/db.php';
$sql = "SELECT 1 FROM information_schema.tables WHERE table_schema = '$dbname' AND table_name = 'config' LIMIT 1";
$stmt = $pdo->prepare($sql);
$stmt->execute();
if ($stmt->fetch()) {
    echo "Table 'config' already exists.<br>";
} else {
    $sql = "CREATE TABLE config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) NOT NULL UNIQUE,
        setting_value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    $pdo->exec($sql);
    echo "Table 'config' created successfully.<br>";

    $sql = "INSERT INTO config (setting_key, setting_value) VALUES ('version', '1')";
    $pdo->exec($sql);
    echo "Initial config version inserted.<br>";
}

// Fetch the current version from the config table.
$version = $pdo->query("SELECT setting_value FROM config WHERE setting_key = 'version'")->fetchColumn();
echo "Current config version: $version<br>";

// ====================================================================
// Version 1 -> 2: Create users, games, scores, and comments tables.
// ====================================================================
if ($version == '1') {
    echo "Running migrations for version 1 -> 2...<br>";

    $sql = "CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    $pdo->exec($sql);
    echo "Table 'users' created successfully.<br>";

    $sql = "CREATE TABLE games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        pack VARCHAR(255) NOT NULL,
        img VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    $pdo->exec($sql);
    echo "Table 'games' created successfully.<br>";

    $sql = "CREATE TABLE scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        game_id INT NOT NULL,
        score DOUBLE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
    )";
    $pdo->exec($sql);
    echo "Table 'scores' created successfully.<br>";

    $sql = "CREATE TABLE comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        comment TEXT NOT NULL,
        user_id INT NOT NULL,
        game_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES games(id)
    )";
    $pdo->exec($sql);
    echo "Table 'comments' created successfully.<br>";

    $sql = "UPDATE config SET setting_value = '2' WHERE setting_key = 'version'";
    $pdo->exec($sql);
    echo "Config version updated to 2.<br>";
    
    $version = $pdo->query("SELECT setting_value FROM config WHERE setting_key = 'version'")->fetchColumn();
    echo "Current config version: $version<br>";
} else {
    echo "No migrations needed. Current version is up to date.<br>";
}

// TODO: Add version migrations here
