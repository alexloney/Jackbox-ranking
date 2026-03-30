<?php
session_start();
include 'db.php';

header('Content-Type: application/json');

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
        $sql = 'SELECT c.id, c.comment, u.username AS user, c.created_at as created 
                FROM comments c 
                JOIN users u ON c.user_id = u.id 
                WHERE c.game_id = ? 
                ORDER BY c.created_at DESC';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$game_id]);
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Convert database UTC to local Pacific Time
        foreach ($comments as &$row) {
            $date = new DateTime($row['created'], new DateTimeZone('UTC'));
            $date->setTimezone(new DateTimeZone('America/Los_Angeles'));
            
            // Format to match JS toLocaleString() output
            $row['created'] = $date->format('n/j/Y, g:i:s A'); 
        }
        unset($row);

        echo json_encode(['items' => $comments]);

        break;
    case 'POST':
        $user_id = $_SESSION['user_id'] ?? '';
        $comment = $input['comment'] ?? '';
        $game_id = $input['game_id'] ?? '';

        if (empty($user_id)) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required']);
            exit;
        }

        if (empty($comment) || empty($game_id)) {
            http_response_code(400);
            echo json_encode(['error' => 'Comment text and Game ID are required']);
            exit;
        }

        $sql = 'INSERT INTO comments (user_id, game_id, comment) VALUES (?, ?, ?)';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$user_id, $game_id, $comment]);
        echo json_encode(['message' => 'Comment submitted successfully']);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}