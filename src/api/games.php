<?php
session_start();

include 'db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch($method) {
    case 'GET':
        $stmt = $pdo->prepare('SELECT id, name, pack, img FROM games');
        $stmt->execute();
        $games = $stmt->fetchAll();
        
        echo json_encode(['items' => $games]);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}