<?php
session_start();

include '../db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch($method) {
    case 'POST':
        $username = $input['username'] ?? '';

        if (empty($username)) {
            http_response_code(400);
            echo json_encode(['error' => 'Username is required']);
            exit;
        }

        // Check if user exists
        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            // Create new user
            $stmt = $pdo->prepare('INSERT INTO users (username) VALUES (?)');
            $stmt->execute([$username]);
            $user_id = $pdo->lastInsertId();
        } else {
            $user_id = $user['id'];
        }

        $_SESSION['user_id'] = $user_id;
        $_SESSION['username'] = $username;

        echo json_encode(['message' => 'Login successful', 'user' => ['id' => $user_id, 'name' => $username]]);
        break;
}