<?php
require_once '../api/db.php';

const PAGE_SIZE = 50;

$message = '';
$error   = '';

// --- Handle DELETE action ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_score'])) {
    $scoreId = (int) $_POST['score_id'];
    if ($scoreId > 0) {
        try {
            $stmt = $pdo->prepare("DELETE FROM scores WHERE id = ?");
            $stmt->execute([$scoreId]);
            if ($stmt->rowCount() > 0) {
                $message = "Score deleted successfully.";
            } else {
                $error = "Score not found.";
            }
        } catch (Exception $e) {
            $error = "Delete failed: " . $e->getMessage();
        }
    }
}

// --- Filters ---
$userId  = (int) ($_GET['user_id'] ?? 0);
$gameId  = (int) ($_GET['game_id'] ?? 0);
$minScore = isset($_GET['min_score']) && $_GET['min_score'] !== '' ? (float) $_GET['min_score'] : null;
$maxScore = isset($_GET['max_score']) && $_GET['max_score'] !== '' ? (float) $_GET['max_score'] : null;
$page    = max(1, (int) ($_GET['page'] ?? 1));
$offset  = ($page - 1) * PAGE_SIZE;

$where  = [];
$params = [];

if ($userId > 0) {
    $where[]  = 's.user_id = ?';
    $params[] = $userId;
}
if ($gameId > 0) {
    $where[]  = 's.game_id = ?';
    $params[] = $gameId;
}
if ($minScore !== null) {
    $where[]  = 's.score >= ?';
    $params[] = $minScore;
}
if ($maxScore !== null) {
    $where[]  = 's.score <= ?';
    $params[] = $maxScore;
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

try {
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM scores s $whereSql");
    $countStmt->execute($params);
    $totalRows  = (int) $countStmt->fetchColumn();
    $totalPages = (int) ceil($totalRows / PAGE_SIZE);

    $sql = "
        SELECT s.id, s.score, s.created_at,
               u.id AS user_id, u.username,
               g.id AS game_id, g.name AS game_name, g.pack AS game_pack
        FROM scores s
        JOIN users u ON u.id = s.user_id
        JOIN games  g ON g.id = s.game_id
        $whereSql
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($params, [PAGE_SIZE, $offset]));
    $scores = $stmt->fetchAll();

    $allUsers = $pdo->query("SELECT id, username FROM users ORDER BY username")->fetchAll();
    $allGames = $pdo->query("SELECT id, name, pack FROM games ORDER BY pack, name")->fetchAll();
} catch (Exception $e) {
    $error  = "Failed to load scores: " . $e->getMessage();
    $scores = [];
    $allUsers = [];
    $allGames = [];
    $totalRows = $totalPages = 0;
}

function buildQuery(array $overrides = []): string {
    $base = [
        'user_id'   => (int)   ($_GET['user_id']   ?? 0),
        'game_id'   => (int)   ($_GET['game_id']   ?? 0),
        'min_score' => $_GET['min_score'] ?? '',
        'max_score' => $_GET['max_score'] ?? '',
        'page'      => 1,
    ];
    $p = array_merge($base, $overrides);
    return '?' . http_build_query(array_filter($p, fn($v) => $v !== '' && $v !== 0));
}

function starDisplay(float $score): string {
    if ($score <= 0) return '<span style="color:#999">unscored</span>';
    $full  = floor($score);
    $half  = ($score - $full) >= 0.5 ? 1 : 0;
    $empty = 5 - $full - $half;
    return str_repeat('★', (int)$full)
         . str_repeat('½', $half)
         . str_repeat('☆', (int)$empty)
         . ' ' . number_format($score, 1);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Scores - Admin</title>
    <?php include 'partials/head_styles.php'; ?>
</head>
<body>
    <div class="container">
        <?php include 'partials/nav.php'; ?>
        <h1>Manage Scores</h1>

        <?php if ($message): ?><div class="message success"><?php echo htmlspecialchars($message); ?></div><?php endif; ?>
        <?php if ($error):   ?><div class="message error"><?php echo htmlspecialchars($error);   ?></div><?php endif; ?>

        <form method="GET" class="filter-form">
            <div class="form-group">
                <label for="user_id">User</label>
                <select id="user_id" name="user_id">
                    <option value="0">— All users —</option>
                    <?php foreach ($allUsers as $u): ?>
                        <option value="<?php echo $u['id']; ?>"
                            <?php echo $userId === (int)$u['id'] ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($u['username']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label for="game_id">Game</label>
                <select id="game_id" name="game_id">
                    <option value="0">— All games —</option>
                    <?php foreach ($allGames as $g): ?>
                        <option value="<?php echo $g['id']; ?>"
                            <?php echo $gameId === (int)$g['id'] ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($g['pack'] . ': ' . $g['name']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label for="min_score">Min score</label>
                <input type="number" id="min_score" name="min_score"
                       step="0.5" min="0" max="5"
                       value="<?php echo htmlspecialchars($_GET['min_score'] ?? ''); ?>"
                       placeholder="0">
            </div>
            <div class="form-group">
                <label for="max_score">Max score</label>
                <input type="number" id="max_score" name="max_score"
                       step="0.5" min="0" max="5"
                       value="<?php echo htmlspecialchars($_GET['max_score'] ?? ''); ?>"
                       placeholder="5">
            </div>
            <button type="submit" class="btn btn-primary">Filter</button>
            <?php if ($userId || $gameId || $minScore !== null || $maxScore !== null): ?>
                <a href="scores.php" class="btn btn-secondary">Clear</a>
            <?php endif; ?>
        </form>

        <p>Showing <?php echo number_format($totalRows); ?> score<?php echo $totalRows !== 1 ? 's' : ''; ?>
           <?php if ($totalPages > 1): ?>(page <?php echo $page; ?> of <?php echo $totalPages; ?>)<?php endif; ?></p>

        <?php if ($scores): ?>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>User</th>
                    <th>Game</th>
                    <th>Score</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($scores as $s): ?>
                <tr>
                    <td><?php echo $s['id']; ?></td>
                    <td>
                        <a href="users.php?search=<?php echo urlencode($s['username']); ?>">
                            <?php echo htmlspecialchars($s['username']); ?>
                        </a>
                    </td>
                    <td><?php echo htmlspecialchars($s['game_pack'] . ': ' . $s['game_name']); ?></td>
                    <td><?php echo starDisplay((float)$s['score']); ?></td>
                    <td><?php echo htmlspecialchars($s['created_at']); ?></td>
                    <td>
                        <form method="POST" style="display:inline"
                              onsubmit="return confirm('Delete this score?');">
                            <input type="hidden" name="score_id" value="<?php echo $s['id']; ?>">
                            <button type="submit" name="delete_score" class="btn btn-danger btn-sm">Delete</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <?php if ($totalPages > 1): ?>
        <div class="pagination">
            <?php if ($page > 1): ?>
                <a href="<?php echo buildQuery(['page' => $page - 1]); ?>">&laquo; Prev</a>
            <?php endif; ?>
            <?php for ($p = max(1, $page - 3); $p <= min($totalPages, $page + 3); $p++): ?>
                <?php if ($p === $page): ?>
                    <span class="active"><?php echo $p; ?></span>
                <?php else: ?>
                    <a href="<?php echo buildQuery(['page' => $p]); ?>"><?php echo $p; ?></a>
                <?php endif; ?>
            <?php endfor; ?>
            <?php if ($page < $totalPages): ?>
                <a href="<?php echo buildQuery(['page' => $page + 1]); ?>">Next &raquo;</a>
            <?php endif; ?>
        </div>
        <?php endif; ?>

        <?php else: ?>
            <p>No scores found.</p>
        <?php endif; ?>
    </div>
</body>
</html>
