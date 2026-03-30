<?php
session_start();

include '../db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch($method) {
    case 'GET':
        $user_id = $_SESSION['user_id'] ?? null;
        $username = $_SESSION['username'] ?? null;

        if (!$user_id || !$username) {
            http_response_code(401);
            echo json_encode(['error' => 'User not authenticated']);
            exit;
        }

        echo json_encode(['message' => 'Verify successful', 'user' => ['id' => $user_id, 'name' => $username]]);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}