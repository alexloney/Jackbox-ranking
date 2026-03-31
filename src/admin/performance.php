<?php
require_once '../api/db.php';

/**
 * Run a callable $times times, returning average, min and max execution time in ms.
 *
 * @param callable $fn    The test to benchmark
 * @param int      $times Number of iterations
 * @return array{avg: float, min: float, max: float, iterations: int, error: string|null}
 */
function benchmark(callable $fn, int $times = 5): array {
    $durations = [];
    $lastError = null;

    for ($i = 0; $i < $times; $i++) {
        $start = microtime(true);
        try {
            $fn();
        } catch (Exception $e) {
            $lastError = $e->getMessage();
        }
        $durations[] = (microtime(true) - $start) * 1000; // ms
    }

    return [
        'avg'        => array_sum($durations) / count($durations),
        'min'        => min($durations),
        'max'        => max($durations),
        'iterations' => $times,
        'error'      => $lastError,
    ];
}

/**
 * Format a millisecond value with colour coding.
 */
function fmtMs(float $ms): string {
    $color = $ms < 5 ? '#28a745' : ($ms < 50 ? '#856404' : '#dc3545');
    return sprintf('<span style="color:%s;font-weight:600">%.3f ms</span>', $color, $ms);
}

// Determine iterations from request (default 10, max 100)
$iterations = min(100, max(1, (int) ($_POST['iterations'] ?? 10)));
$run        = $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['run_tests']);

$results    = [];
$totalStart = microtime(true);

if ($run) {
    // ---------------------------------------------------------------
    // 1. SELECT all users
    // ---------------------------------------------------------------
    $results['select_all_users'] = [
        'label'       => 'SELECT all users',
        'description' => 'Fetch every row from the users table.',
        'query'       => 'SELECT * FROM users',
        'result'      => benchmark(function() use ($pdo) {
            $pdo->query("SELECT * FROM users")->fetchAll();
        }, $iterations),
    ];

    // ---------------------------------------------------------------
    // 2. SELECT all games
    // ---------------------------------------------------------------
    $results['select_all_games'] = [
        'label'       => 'SELECT all games',
        'description' => 'Fetch every row from the games table.',
        'query'       => 'SELECT * FROM games',
        'result'      => benchmark(function() use ($pdo) {
            $pdo->query("SELECT * FROM games")->fetchAll();
        }, $iterations),
    ];

    // ---------------------------------------------------------------
    // 3. SELECT all scores (plain)
    // ---------------------------------------------------------------
    $results['select_all_scores'] = [
        'label'       => 'SELECT all scores (plain)',
        'description' => 'Fetch every row from the scores table without JOINs.',
        'query'       => 'SELECT * FROM scores',
        'result'      => benchmark(function() use ($pdo) {
            $pdo->query("SELECT * FROM scores")->fetchAll();
        }, $iterations),
    ];

    // ---------------------------------------------------------------
    // 4. SELECT scores with JOINs (leaderboard query)
    // ---------------------------------------------------------------
    $leaderboardSql = "
        SELECT g.id, g.name, g.pack, g.img,
               AVG(NULLIF(s.score, 0)) AS avg_score,
               COUNT(CASE WHEN s.score > 0 THEN 1 END) AS vote_count
        FROM games g
        LEFT JOIN scores s ON s.game_id = g.id
        GROUP BY g.id
        ORDER BY avg_score DESC
    ";
    $results['leaderboard'] = [
        'label'       => 'Leaderboard aggregate query',
        'description' => 'Compute average scores per game, sorted by average (mirrors front-end leaderboard).',
        'query'       => trim($leaderboardSql),
        'result'      => benchmark(function() use ($pdo, $leaderboardSql) {
            $pdo->query($leaderboardSql)->fetchAll();
        }, $iterations),
    ];

    // ---------------------------------------------------------------
    // 5. SELECT comments with user & game JOINs
    // ---------------------------------------------------------------
    $commentSql = "
        SELECT c.id, c.comment, c.created_at,
               u.username, g.name AS game_name, g.pack
        FROM comments c
        JOIN users u ON u.id = c.user_id
        JOIN games  g ON g.id = c.game_id
        ORDER BY c.created_at DESC
        LIMIT 100
    ";
    $results['comments_join'] = [
        'label'       => 'SELECT latest 100 comments (with JOINs)',
        'description' => 'Fetch the 100 most recent comments joined with user and game data.',
        'query'       => trim($commentSql),
        'result'      => benchmark(function() use ($pdo, $commentSql) {
            $pdo->query($commentSql)->fetchAll();
        }, $iterations),
    ];

    // ---------------------------------------------------------------
    // 6. SELECT scores for a single user (prepared statement)
    // ---------------------------------------------------------------
    $singleUserSql = "
        SELECT s.score, g.name, g.pack
        FROM scores s
        JOIN games g ON g.id = s.game_id
        WHERE s.user_id = ?
    ";
    // Pick the first user id if any exist
    $firstUserId = (int) ($pdo->query("SELECT id FROM users LIMIT 1")->fetchColumn() ?: 1);
    $results['scores_single_user'] = [
        'label'       => 'SELECT scores for one user (prepared)',
        'description' => "Fetch all scores for a single user (user_id = $firstUserId) using a prepared statement.",
        'query'       => trim($singleUserSql) . "  /* user_id = $firstUserId */",
        'result'      => benchmark(function() use ($pdo, $singleUserSql, $firstUserId) {
            $stmt = $pdo->prepare($singleUserSql);
            $stmt->execute([$firstUserId]);
            $stmt->fetchAll();
        }, $iterations),
    ];

    // ---------------------------------------------------------------
    // 7. INSERT + DELETE score (write-path latency)
    // ---------------------------------------------------------------
    // Use a temporary user and game to avoid conflicts
    $tempUserId = null;
    $tempGameId = null;
    $writeError = null;
    try {
        $pdo->exec("INSERT INTO users (username) VALUES ('__perf_test_user__')");
        $tempUserId = (int) $pdo->lastInsertId();
        $tempGameId = (int) ($pdo->query("SELECT id FROM games LIMIT 1")->fetchColumn() ?: 0);
    } catch (Exception $e) {
        $writeError = "Setup failed: " . $e->getMessage();
    }

    if ($tempUserId && $tempGameId) {
        $results['insert_score'] = [
            'label'       => 'INSERT score (prepared statement)',
            'description' => 'Insert a single score row using a prepared statement (UPSERT via ON DUPLICATE KEY UPDATE).',
            'query'       => 'INSERT INTO scores (user_id, game_id, score) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score)',
            'result'      => benchmark(function() use ($pdo, $tempUserId, $tempGameId) {
                $stmt = $pdo->prepare("INSERT INTO scores (user_id, game_id, score) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score)");
                $stmt->execute([$tempUserId, $tempGameId, rand(1, 5)]);
            }, $iterations),
        ];

        // Clean up temp data
        $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$tempUserId]);
    } else {
        $results['insert_score'] = [
            'label'       => 'INSERT score (prepared statement)',
            'description' => 'Skipped — no users or games in database to test with.',
            'query'       => 'N/A',
            'result'      => ['avg' => 0, 'min' => 0, 'max' => 0, 'iterations' => 0, 'error' => $writeError ?? 'No games found'],
        ];
    }

    // ---------------------------------------------------------------
    // 8. COUNT queries (cheap admin stats)
    // ---------------------------------------------------------------
    $results['count_stats'] = [
        'label'       => 'Admin dashboard stats (5× COUNT queries)',
        'description' => 'Run the five COUNT queries that power the admin dashboard.',
        'query'       => 'SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM games; … (×5)',
        'result'      => benchmark(function() use ($pdo) {
            $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
            $pdo->query("SELECT COUNT(*) FROM games")->fetchColumn();
            $pdo->query("SELECT COUNT(*) FROM scores")->fetchColumn();
            $pdo->query("SELECT COUNT(*) FROM comments")->fetchColumn();
            $pdo->query("SELECT COUNT(*) FROM user_aliases")->fetchColumn();
        }, $iterations),
    ];

    // ---------------------------------------------------------------
    // 9. Full-text LIKE search on comments
    // ---------------------------------------------------------------
    $results['comment_search'] = [
        'label'       => 'Comment LIKE search',
        'description' => 'Simulate the admin comment search using a LIKE wildcard on comment text.',
        'query'       => "SELECT * FROM comments WHERE comment LIKE '%fun%' LIMIT 50",
        'result'      => benchmark(function() use ($pdo) {
            $stmt = $pdo->prepare("SELECT * FROM comments WHERE comment LIKE ? LIMIT 50");
            $stmt->execute(['%fun%']);
            $stmt->fetchAll();
        }, $iterations),
    ];

    // ---------------------------------------------------------------
    // 10. User alias lookup (simulates login alias resolution)
    // ---------------------------------------------------------------
    $results['alias_lookup'] = [
        'label'       => 'User alias lookup',
        'description' => 'Resolve a username through user_aliases (mirrors the login alias check).',
        'query'       => "SELECT u.id, u.username FROM users u LEFT JOIN user_aliases a ON a.user_id = u.id WHERE u.username = ? OR a.alias = ? LIMIT 1",
        'result'      => benchmark(function() use ($pdo) {
            $stmt = $pdo->prepare("SELECT u.id, u.username FROM users u LEFT JOIN user_aliases a ON a.user_id = u.id WHERE u.username = ? OR a.alias = ? LIMIT 1");
            $stmt->execute(['nonexistent_user_xyz', 'nonexistent_user_xyz']);
            $stmt->fetch();
        }, $iterations),
    ];
}

$totalElapsed = (microtime(true) - $totalStart) * 1000;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Tests - Admin</title>
    <?php include 'partials/head_styles.php'; ?>
    <style>
        .perf-controls {
            display: flex;
            align-items: flex-end;
            gap: 16px;
            flex-wrap: wrap;
            padding: 16px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            margin-bottom: 24px;
        }
        .perf-controls .form-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .perf-controls label { font-size: 13px; font-weight: 600; color: #495057; }
        .perf-controls input[type=number] {
            width: 100px;
            padding: 7px 10px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
        }
        .legend {
            display: flex;
            gap: 16px;
            flex-wrap: wrap;
            font-size: 13px;
            margin-bottom: 16px;
        }
        .legend span { display: flex; align-items: center; gap: 4px; }
        .dot {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }
        .dot-green  { background: #28a745; }
        .dot-yellow { background: #856404; }
        .dot-red    { background: #dc3545; }
        .result-card {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .result-card-header {
            background: #f8f9fa;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        .result-card-header h3 { margin: 0; font-size: 15px; }
        .result-card-body { padding: 16px; }
        .result-card-body p { margin: 0 0 8px 0; font-size: 13px; color: #6c757d; }
        .timing-grid {
            display: grid;
            grid-template-columns: repeat(3, auto);
            gap: 16px 32px;
            margin-top: 10px;
        }
        .timing-item label { font-size: 11px; text-transform: uppercase; color: #6c757d; display: block; }
        .query-pre {
            background: #272822;
            color: #f8f8f2;
            padding: 12px;
            border-radius: 4px;
            font-size: 12px;
            white-space: pre-wrap;
            word-break: break-all;
            margin-top: 10px;
            display: none;
        }
        .toggle-sql { font-size: 12px; cursor: pointer; color: #007bff; border: none; background: none; padding: 0; }
        .toggle-sql:hover { text-decoration: underline; }
        .summary-bar {
            background: #e9ecef;
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 24px;
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
            font-size: 13px;
        }
        .summary-bar strong { display: block; }
        .error-msg { color: #dc3545; font-size: 12px; margin-top: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <?php include 'partials/nav.php'; ?>
        <h1>⚡ Performance Tests</h1>

        <p>Benchmark common database operations to assess query latency. Each test is executed the specified
           number of times; average, minimum and maximum durations are reported in milliseconds.</p>

        <form method="POST" class="perf-controls">
            <div class="form-group">
                <label for="iterations">Iterations per test</label>
                <input type="number" id="iterations" name="iterations"
                       min="1" max="100" value="<?php echo $iterations; ?>">
            </div>
            <button type="submit" name="run_tests" class="btn btn-primary">▶ Run Tests</button>
        </form>

        <?php if ($run): ?>

        <div class="summary-bar">
            <div><strong>Tests run</strong><?php echo count($results); ?></div>
            <div><strong>Iterations each</strong><?php echo $iterations; ?></div>
            <div><strong>Total wall time</strong><?php echo fmtMs($totalElapsed); ?></div>
        </div>

        <div class="legend">
            <span><span class="dot dot-green"></span> &lt; 5 ms (fast)</span>
            <span><span class="dot dot-yellow"></span> 5–50 ms (moderate)</span>
            <span><span class="dot dot-red"></span> &gt; 50 ms (slow)</span>
        </div>

        <?php foreach ($results as $key => $test):
            $r = $test['result'];
            $skipped = $r['iterations'] === 0;
        ?>
        <div class="result-card">
            <div class="result-card-header">
                <h3><?php echo htmlspecialchars($test['label']); ?></h3>
                <?php if (!$skipped && !$r['error']): ?>
                    <span>avg: <?php echo fmtMs($r['avg']); ?></span>
                <?php elseif ($skipped): ?>
                    <span style="color:#6c757d">skipped</span>
                <?php else: ?>
                    <span style="color:#dc3545">error</span>
                <?php endif; ?>
            </div>
            <div class="result-card-body">
                <p><?php echo htmlspecialchars($test['description']); ?></p>

                <?php if ($r['error']): ?>
                    <div class="error-msg">⚠ <?php echo htmlspecialchars($r['error']); ?></div>
                <?php endif; ?>

                <?php if (!$skipped && !$r['error']): ?>
                <div class="timing-grid">
                    <div class="timing-item">
                        <label>Average</label>
                        <?php echo fmtMs($r['avg']); ?>
                    </div>
                    <div class="timing-item">
                        <label>Minimum</label>
                        <?php echo fmtMs($r['min']); ?>
                    </div>
                    <div class="timing-item">
                        <label>Maximum</label>
                        <?php echo fmtMs($r['max']); ?>
                    </div>
                </div>
                <?php endif; ?>

                <button class="toggle-sql" onclick="
                    var el = this.nextElementSibling;
                    el.style.display = el.style.display === 'none' ? 'block' : 'none';
                    this.textContent = el.style.display === 'none' ? 'Show SQL' : 'Hide SQL';
                ">Show SQL</button>
                <pre class="query-pre"><?php echo htmlspecialchars($test['query']); ?></pre>
            </div>
        </div>
        <?php endforeach; ?>

        <?php else: ?>
            <div class="message info">
                Set the number of iterations above and click <strong>▶ Run Tests</strong> to start benchmarking.
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
