<?php
session_start();

include '../db.php';

session_destroy();
echo json_encode(['message' => 'Logout successful']);