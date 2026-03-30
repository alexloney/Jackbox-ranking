<?php
session_start();

include '../api/db.php';

// Helper function to get or create user ID
function getUserId($pdo, $username) {
    $sql = "SELECT id FROM users WHERE lower(username) = lower(?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$username]);
    $user_id = $stmt->fetchColumn();
    
    if (!$user_id) {
        $sql = "INSERT INTO users (username) VALUES (?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$username]);
        echo "User '$username' inserted successfully.<br>";
        $user_id = $pdo->lastInsertId();
    }
    
    return $user_id;
}

// Helper function to get game ID
function getGameId($pdo, $gameName, $gamePack) {
    $sql = "SELECT id FROM games WHERE lower(name) = lower(?) AND lower(pack) = lower(?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$gameName, $gamePack]);
    return $stmt->fetchColumn();
}

echo "<h2>Importing Users</h2>";
// Read and insert users from users.txt
$usersFile = __DIR__ . '/users.txt';
if (file_exists($usersFile)) {
    $users = file($usersFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($users as $username) {
        $username = trim($username);
        if (!empty($username)) {
            getUserId($pdo, $username);
        }
    }
    echo "Users imported successfully.<br>";
} else {
    echo "users.txt not found.<br>";
}

echo "<h2>Importing Comments</h2>";
// Read and insert comments from comments.txt
$commentsFile = __DIR__ . '/comments.txt';
if (file_exists($commentsFile)) {
    $comments = file($commentsFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $commentCount = 0;
    
    foreach ($comments as $line) {
        $parts = explode("\t", $line);
        if (count($parts) >= 5) {
            $comment = trim($parts[0]);
            $username = trim($parts[1]);
            $gameName = trim($parts[2]);
            $gamePack = trim($parts[3]);
            $createdAt = trim($parts[4]);
            
            $user_id = getUserId($pdo, $username);
            $game_id = getGameId($pdo, $gameName, $gamePack);
            
            if ($user_id && $game_id) {
                // Convert ISO 8601 datetime to MySQL format
                $dateTime = new DateTime($createdAt);
                $mysqlDateTime = $dateTime->format('Y-m-d H:i:s');
                
                $sql = "INSERT INTO comments (comment, user_id, game_id, created_at) VALUES (:comment, :user_id, :game_id, :created_at)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':comment' => $comment, 
                    ':user_id' => $user_id, 
                    ':game_id' => $game_id,
                    ':created_at' => $mysqlDateTime
                ]);
                $commentCount++;
            } else {
                echo "Warning: Could not insert comment - User: $username, Game: $gameName ($gamePack)<br>";
            }
        }
    }
    echo "$commentCount comments imported successfully.<br>";
} else {
    echo "comments.txt not found.<br>";
}

echo "<h2>Importing Scores</h2>";
// Read and insert scores from scores.txt
$scoresFile = __DIR__ . '/scores.txt';
if (file_exists($scoresFile)) {
    $scores = file($scoresFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $scoreCount = 0;
    
    foreach ($scores as $line) {
        $parts = explode("\t", $line);
        if (count($parts) >= 4) {
            $username = trim($parts[0]);
            $score = trim($parts[1]);
            $gameName = trim($parts[2]);
            $gamePack = trim($parts[3]);
            
            $user_id = getUserId($pdo, $username);
            $game_id = getGameId($pdo, $gameName, $gamePack);
            
            if ($user_id && $game_id) {
                $sql = "INSERT INTO scores (score, user_id, game_id) VALUES (:score, :user_id, :game_id)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':score' => $score, ':user_id' => $user_id, ':game_id' => $game_id]);
                $scoreCount++;
            } else {
                echo "Warning: Could not insert score - User: $username, Game: $gameName ($gamePack)<br>";
            }
        }
    }
    echo "$scoreCount scores imported successfully.<br>";
} else {
    echo "scores.txt not found.<br>";
}

echo "<h2>Import Complete!</h2>";

