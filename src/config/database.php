<?php
class DatabaseConfig {
    public static function getConnection() {
        $host = $_ENV['MYSQL_HOST'] ?? 'db';
        $dbname = $_ENV['MYSQL_DATABASE'] ?? 'myapp';
        $username = $_ENV['MYSQL_USER'] ?? 'appuser';
        $password = $_ENV['MYSQL_PASSWORD'] ?? 'apppassword';
        $port = $_ENV['MYSQL_PORT'] ?? '3306';
        
        $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
        
        return new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    
    public static function getConfig() {
        return [
            'host' => $_ENV['MYSQL_HOST'] ?? 'db',
            'database' => $_ENV['MYSQL_DATABASE'] ?? 'myapp',
            'username' => $_ENV['MYSQL_USER'] ?? 'appuser',
            'password' => $_ENV['MYSQL_PASSWORD'] ?? 'apppassword',
            'port' => $_ENV['MYSQL_PORT'] ?? '3306',
        ];
    }
}
?>