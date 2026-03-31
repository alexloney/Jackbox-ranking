<?php
require_once '../api/db.php';

const PAGE_SIZE = 50;

$message = '';
$error   = '';

// --- Handle DELETE action ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_user'])) {
    $userId = (int) $_POST['user_id'];
    if ($userId > 0) {
        try {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            if ($stmt->rowCount() > 0) {
                $message = "User deleted successfully (cascading scores, comments and aliases also removed).";
            } else {
                $error = "User not found.";
            }
        } catch (Exception $e) {
            $error = "Delete failed: " . $e->getMessage();
        }
    }
}

// --- Filters ---
$search = trim($_GET['search'] ?? '');
$page   = max(1, (int) ($_GET['page'] ?? 1));
$offset = ($page - 1) * PAGE_SIZE;

$where  = '';
$params = [];
if ($search !== '') {
    $where    = 'WHERE u.username LIKE ?';
    $params[] = '%' . $search . '%';
}

try {
    $countSql = "SELECT COUNT(*) FROM users u $where";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $totalRows  = (int) $countStmt->fetchColumn();
    $totalPages = (int) ceil($totalRows / PAGE_SIZE);

    $sql = "
        SELECT u.id, u.username, u.created_at,
               COUNT(DISTINCT s.id) AS score_count,
               COUNT(DISTINCT c.id) AS comment_count,
               COUNT(DISTINCT a.id) AS alias_count
        FROM users u
        LEFT JOIN scores   s ON s.user_id = u.id
        LEFT JOIN comments c ON c.user_id = u.id
        LEFT JOIN user_aliases a ON a.user_id = u.id
        $where
        GROUP BY u.id
        ORDER BY u.username
        LIMIT ? OFFSET ?
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($params, [PAGE_SIZE, $offset]));
    $users = $stmt->fetchAll();
} catch (Exception $e) {
    $error = "Failed to load users: " . $e->getMessage();
    $users = [];
    $totalRows = $totalPages = 0;
}

// Build query string helper for pagination links
function buildQuery(array $overrides = []): string {
    $base = ['search' => trim($_GET['search'] ?? ''), 'page' => 1];
    $params = array_merge($base, $overrides);
    return '?' . http_build_query(array_filter($params, fn($v) => $v !== '' && $v !== 0 && $v !== '0'));
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Users - Admin</title>
    <?php include 'partials/head_styles.php'; ?>
</head>
<body>
    <div class="container">
        <?php include 'partials/nav.php'; ?>
        <h1>Manage Users</h1>

        <?php if ($message): ?><div class="message success"><?php echo htmlspecialchars($message); ?></div><?php endif; ?>
        <?php if ($error):   ?><div class="message error"><?php echo htmlspecialchars($error);   ?></div><?php endif; ?>

        <form method="GET" class="filter-form">
            <div class="form-group">
                <label for="search">Username</label>
                <input type="text" id="search" name="search"
                       value="<?php echo htmlspecialchars($search); ?>"
                       placeholder="Search…">
            </div>
            <button type="submit" class="btn btn-primary">Filter</button>
            <?php if ($search): ?>
                <a href="users.php" class="btn btn-secondary">Clear</a>
            <?php endif; ?>
        </form>

        <p>Showing <?php echo number_format($totalRows); ?> user<?php echo $totalRows !== 1 ? 's' : ''; ?>
           <?php if ($totalPages > 1): ?>(page <?php echo $page; ?> of <?php echo $totalPages; ?>)<?php endif; ?></p>

        <?php if ($users): ?>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Scores</th>
                    <th>Comments</th>
                    <th>Aliases</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($users as $u): ?>
                <tr>
                    <td><?php echo $u['id']; ?></td>
                    <td><?php echo htmlspecialchars($u['username']); ?></td>
                    <td><span class="badge badge-blue"><?php echo $u['score_count']; ?></span></td>
                    <td><span class="badge badge-green"><?php echo $u['comment_count']; ?></span></td>
                    <td><span class="badge badge-gray"><?php echo $u['alias_count']; ?></span></td>
                    <td><?php echo htmlspecialchars($u['created_at']); ?></td>
                    <td>
                        <form method="POST" style="display:inline"
                              onsubmit="return confirm('Delete user <?php echo htmlspecialchars(addslashes($u['username'])); ?>? This will also remove all their scores, comments and aliases.');">
                            <input type="hidden" name="user_id" value="<?php echo $u['id']; ?>">
                            <button type="submit" name="delete_user" class="btn btn-danger btn-sm">Delete</button>
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
            <p>No users found.</p>
        <?php endif; ?>
    </div>
</body>
</html>
