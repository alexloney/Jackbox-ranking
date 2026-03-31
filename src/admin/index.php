<?php
require_once '../api/db.php';

$stats = [
    'users'    => 0,
    'games'    => 0,
    'scores'   => 0,
    'comments' => 0,
    'aliases'  => 0,
];

$dbVersion = 'N/A';

try {
    $stats['users']    = (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
    $stats['games']    = (int) $pdo->query("SELECT COUNT(*) FROM games")->fetchColumn();
    $stats['scores']   = (int) $pdo->query("SELECT COUNT(*) FROM scores")->fetchColumn();
    $stats['comments'] = (int) $pdo->query("SELECT COUNT(*) FROM comments")->fetchColumn();
    $stats['aliases']  = (int) $pdo->query("SELECT COUNT(*) FROM user_aliases")->fetchColumn();
    $dbVersion = $pdo->query("SELECT setting_value FROM config WHERE setting_key = 'version'")->fetchColumn();
} catch (Exception $e) {
    // Stats unavailable if DB not initialized
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Jackbox Ranking</title>
    <?php include 'partials/head_styles.php'; ?>
    <style>
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 16px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .stat-card .number {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        .stat-card .label {
            color: #6c757d;
            margin-top: 4px;
        }
        .nav-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }
        .nav-card {
            display: block;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            text-decoration: none;
            color: #333;
            transition: box-shadow 0.2s, border-color 0.2s;
        }
        .nav-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-color: #007bff;
            text-decoration: none;
            color: #333;
        }
        .nav-card .icon {
            font-size: 2em;
            margin-bottom: 10px;
        }
        .nav-card h3 {
            margin: 0 0 6px 0;
            color: #007bff;
        }
        .nav-card p {
            margin: 0;
            font-size: 0.875em;
            color: #6c757d;
        }
        .db-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            font-size: 0.75em;
            padding: 2px 8px;
            border-radius: 12px;
            margin-left: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <?php include 'partials/nav.php'; ?>

        <h1>Admin Dashboard
            <span class="db-badge">DB v<?php echo htmlspecialchars((string)$dbVersion); ?></span>
        </h1>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="number"><?php echo number_format($stats['users']); ?></div>
                <div class="label">Users</div>
            </div>
            <div class="stat-card">
                <div class="number"><?php echo number_format($stats['games']); ?></div>
                <div class="label">Games</div>
            </div>
            <div class="stat-card">
                <div class="number"><?php echo number_format($stats['scores']); ?></div>
                <div class="label">Scores</div>
            </div>
            <div class="stat-card">
                <div class="number"><?php echo number_format($stats['comments']); ?></div>
                <div class="label">Comments</div>
            </div>
            <div class="stat-card">
                <div class="number"><?php echo number_format($stats['aliases']); ?></div>
                <div class="label">Aliases</div>
            </div>
        </div>

        <h2>Management Tools</h2>
        <div class="nav-grid">
            <a href="users.php" class="nav-card">
                <div class="icon">👤</div>
                <h3>Users</h3>
                <p>View, search and delete user accounts</p>
            </a>
            <a href="games.php" class="nav-card">
                <div class="icon">🎮</div>
                <h3>Games</h3>
                <p>View, edit and delete games</p>
            </a>
            <a href="scores.php" class="nav-card">
                <div class="icon">⭐</div>
                <h3>Scores</h3>
                <p>View and delete user scores</p>
            </a>
            <a href="comments.php" class="nav-card">
                <div class="icon">💬</div>
                <h3>Comments</h3>
                <p>View and delete user comments</p>
            </a>
            <a href="merge.php" class="nav-card">
                <div class="icon">🔀</div>
                <h3>Merge Users</h3>
                <p>Merge duplicate user accounts</p>
            </a>
        </div>

        <h2>Setup &amp; Data Tools</h2>
        <div class="nav-grid">
            <a href="setupdb.php" class="nav-card">
                <div class="icon">🗄️</div>
                <h3>Setup Database</h3>
                <p>Run database migrations to latest version</p>
            </a>
            <a href="seed.php" class="nav-card">
                <div class="icon">🌱</div>
                <h3>Seed Games</h3>
                <p>Load Jackbox game catalogue into database</p>
            </a>
            <a href="existing.php" class="nav-card">
                <div class="icon">📥</div>
                <h3>Import Legacy Data</h3>
                <p>Import users, scores and comments from text files</p>
            </a>
            <a href="performance.php" class="nav-card">
                <div class="icon">⚡</div>
                <h3>Performance Tests</h3>
                <p>Benchmark database operations and query timings</p>
            </a>
        </div>
    </div>
</body>
</html>
