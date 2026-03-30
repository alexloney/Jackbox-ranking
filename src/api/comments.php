<?php
session_start();
include 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch($method) {
    case 'GET':
        $game_id = $_GET['game_id'] ?? '';

        if (empty($game_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'Game ID is required']);
            exit;
        }
        $sql = 'SELECT c.id, c.comment, u.username AS user, c.created_at as created FROM comments c JOIN users u ON c.user_id = u.id WHERE c.game_id = ? ORDER BY c.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$game_id]);
        $comments = $stmt->fetchAll();
        echo json_encode(['items' => $comments]);

        break;
    case 'POST':
        $comment = $input['comment'] ?? '';
        $game_id = $input['game_id'] ?? '';

        if (empty($comment) || empty($game_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'Comment text and Game ID are required']);
            exit;
        }

        $username = $_SESSION['username'] ?? 'Anonymous';
        $sql = 'INSERT INTO comments (user_id, game_id, comment) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?)';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$username, $game_id, $comment]);
        echo json_encode(['message' => 'Comment submitted successfully']);
        break;
}