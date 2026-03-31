<?php
require_once '../api/db.php';

const PAGE_SIZE = 50;

$message = '';
$error   = '';

// --- Handle DELETE action ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_comment'])) {
    $commentId = (int) $_POST['comment_id'];
    if ($commentId > 0) {
        try {
            $stmt = $pdo->prepare("DELETE FROM comments WHERE id = ?");
            $stmt->execute([$commentId]);
            if ($stmt->rowCount() > 0) {
                $message = "Comment deleted successfully.";
            } else {
                $error = "Comment not found.";
            }
        } catch (Exception $e) {
            $error = "Delete failed: " . $e->getMessage();
        }
    }
}

// --- Filters ---
$search  = trim($_GET['search']  ?? '');
$userId  = (int) ($_GET['user_id']  ?? 0);
$gameId  = (int) ($_GET['game_id']  ?? 0);
$page    = max(1, (int) ($_GET['page'] ?? 1));
$offset  = ($page - 1) * PAGE_SIZE;

$where  = [];
$params = [];

if ($search !== '') {
    $where[]  = 'c.comment LIKE ?';
    $params[] = '%' . $search . '%';
}
if ($userId > 0) {
    $where[]  = 'c.user_id = ?';
    $params[] = $userId;
}
if ($gameId > 0) {
    $where[]  = 'c.game_id = ?';
    $params[] = $gameId;
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

try {
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM comments c $whereSql");
    $countStmt->execute($params);
    $totalRows  = (int) $countStmt->fetchColumn();
    $totalPages = (int) ceil($totalRows / PAGE_SIZE);

    $sql = "
        SELECT c.id, c.comment, c.created_at,
               u.id AS user_id, u.username,
               g.id AS game_id, g.name AS game_name, g.pack AS game_pack
        FROM comments c
        JOIN users u ON u.id = c.user_id
        JOIN games  g ON g.id = c.game_id
        $whereSql
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($params, [PAGE_SIZE, $offset]));
    $comments = $stmt->fetchAll();

    // For filter dropdowns
    $allUsers = $pdo->query("SELECT id, username FROM users ORDER BY username")->fetchAll();
    $allGames = $pdo->query("SELECT id, name, pack FROM games ORDER BY pack, name")->fetchAll();
} catch (Exception $e) {
    $error    = "Failed to load comments: " . $e->getMessage();
    $comments = [];
    $allUsers = [];
    $allGames = [];
    $totalRows = $totalPages = 0;
}

function buildQuery(array $overrides = []): string {
    $base = [
        'search'  => trim($_GET['search']  ?? ''),
        'user_id' => (int) ($_GET['user_id'] ?? 0),
        'game_id' => (int) ($_GET['game_id'] ?? 0),
        'page'    => 1,
    ];
    $params = array_merge($base, $overrides);
    return '?' . http_build_query(array_filter($params, fn($v) => $v !== '' && $v !== 0));
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Comments - Admin</title>
    <?php include 'partials/head_styles.php'; ?>
</head>
<body>
    <div class="container">
        <?php include 'partials/nav.php'; ?>
        <h1>Manage Comments</h1>

        <?php if ($message): ?><div class="message success"><?php echo htmlspecialchars($message); ?></div><?php endif; ?>
        <?php if ($error):   ?><div class="message error"><?php echo htmlspecialchars($error);   ?></div><?php endif; ?>

        <form method="GET" class="filter-form">
            <div class="form-group">
                <label for="search">Comment text</label>
                <input type="text" id="search" name="search"
                       value="<?php echo htmlspecialchars($search); ?>"
                       placeholder="Search…">
            </div>
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
            <button type="submit" class="btn btn-primary">Filter</button>
            <?php if ($search || $userId || $gameId): ?>
                <a href="comments.php" class="btn btn-secondary">Clear</a>
            <?php endif; ?>
        </form>

        <p>Showing <?php echo number_format($totalRows); ?> comment<?php echo $totalRows !== 1 ? 's' : ''; ?>
           <?php if ($totalPages > 1): ?>(page <?php echo $page; ?> of <?php echo $totalPages; ?>)<?php endif; ?></p>

        <?php if ($comments): ?>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Comment</th>
                    <th>User</th>
                    <th>Game</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($comments as $c): ?>
                <tr>
                    <td><?php echo $c['id']; ?></td>
                    <td class="truncate" title="<?php echo htmlspecialchars($c['comment']); ?>">
                        <?php echo htmlspecialchars($c['comment']); ?>
                    </td>
                    <td>
                        <a href="users.php?search=<?php echo urlencode($c['username']); ?>">
                            <?php echo htmlspecialchars($c['username']); ?>
                        </a>
                    </td>
                    <td><?php echo htmlspecialchars($c['game_pack'] . ': ' . $c['game_name']); ?></td>
                    <td><?php echo htmlspecialchars($c['created_at']); ?></td>
                    <td>
                        <form method="POST" style="display:inline"
                              onsubmit="return confirm('Delete this comment?');">
                            <input type="hidden" name="comment_id" value="<?php echo $c['id']; ?>">
                            <button type="submit" name="delete_comment" class="btn btn-danger btn-sm">Delete</button>
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
            <p>No comments found.</p>
        <?php endif; ?>
    </div>
</body>
</html>
