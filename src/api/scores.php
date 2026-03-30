<?php
session_start();

include 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch($method) {
    case 'GET':
        $user_id = $_GET['user_id'] ?? '';
        $game_id = $_GET['game_id'] ?? '';

        $sql = 'SELECT user_id, game_id, score FROM scores';

        if (!empty($user_id) && !empty($game_id)) {
            $sql .= ' WHERE user_id = ? AND game_id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user_id, $game_id]);
        } elseif (!empty($user_id)) {
            $sql .= ' WHERE user_id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user_id]);
        } elseif (!empty($game_id)) {
            $sql .= ' WHERE game_id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$game_id]);
        } else {
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
        }
        $scores = $stmt->fetchAll();

        echo json_encode(['scores' => $scores]);
        break;
    case 'POST':
        $user_id = $_SESSION['user_id'] ?? '';
        $game_id = $input['game_id'] ?? '';
        $score = $input['score'] ?? '';

        if (empty($user_id) || !is_numeric($game_id) || !is_numeric($score)) {
            http_response_code(400);
            echo json_encode(['error' => 'User ID, numeric game ID, and numeric score are required']);
            exit;
        }

        $sql = 'SELECT id FROM scores WHERE user_id = ? AND game_id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$user_id, $game_id]);
        if ($stmt->fetch()) {
            $sql = 'UPDATE scores SET score = ?, created_at = CURRENT_TIMESTAMP WHERE user_id = ? AND game_id = ?';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$score, $user_id, $game_id]);
            echo json_encode(['message' => 'Score updated successfully']);
            break;
        } else {
            $sql = 'INSERT INTO scores (user_id, game_id, score) VALUES (?, ?, ?)';
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$user_id, $game_id, $score]);
            echo json_encode(['message' => 'Score submitted successfully']);
        }
        break;
}