<?php
session_start();

include '../db.php';

header('Content-Type: application/json');

session_destroy();
echo json_encode(['message' => 'Logout successful']);