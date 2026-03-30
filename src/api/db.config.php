<?php

$host = $_ENV['MYSQL_HOST'] ?? 'db';
$dbname = $_ENV['MYSQL_DATABASE'] ?? 'myapp';
$username = $_ENV['MYSQL_USER'] ?? 'appuser';
$password = $_ENV['MYSQL_PASSWORD'] ?? 'apppassword';
$port = $_ENV['MYSQL_PORT'] ?? '3306';
