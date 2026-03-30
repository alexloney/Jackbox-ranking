<?php
session_start();

include 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

switch($method) {
    case 'GET':
        $stmt = $pdo->prepare('SELECT id, name, pack, img FROM games');
        $stmt->execute();
        $games = $stmt->fetchAll();
        
        echo json_encode(['items' => $games]);
        break;
}