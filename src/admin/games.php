<?php
require_once '../api/db.php';

const PAGE_SIZE = 50;

$message = '';
$error   = '';

// --- Handle EDIT action ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['edit_game'])) {
    $gameId  = (int) $_POST['game_id'];
    $name    = trim($_POST['name']  ?? '');
    $pack    = trim($_POST['pack']  ?? '');
    $img     = trim($_POST['img']   ?? '');

    if ($gameId > 0 && $name !== '' && $pack !== '' && $img !== '') {
        try {
            $stmt = $pdo->prepare("UPDATE games SET name = ?, pack = ?, img = ? WHERE id = ?");
            $stmt->execute([$name, $pack, $img, $gameId]);
            if ($stmt->rowCount() > 0) {
                $message = "Game updated successfully.";
            } else {
                $message = "No changes were made.";
            }
        } catch (Exception $e) {
            $error = "Update failed: " . $e->getMessage();
        }
    } else {
        $error = "All fields are required.";
    }
}

// --- Handle DELETE action ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_game'])) {
    $gameId = (int) $_POST['game_id'];
    if ($gameId > 0) {
        try {
            $stmt = $pdo->prepare("DELETE FROM games WHERE id = ?");
            $stmt->execute([$gameId]);
            if ($stmt->rowCount() > 0) {
                $message = "Game deleted successfully (cascading scores and comments also removed).";
            } else {
                $error = "Game not found.";
            }
        } catch (Exception $e) {
            $error = "Delete failed: " . $e->getMessage();
        }
    }
}

// --- Filters ---
$search  = trim($_GET['search'] ?? '');
$pack    = trim($_GET['pack']   ?? '');
$page    = max(1, (int) ($_GET['page'] ?? 1));
$offset  = ($page - 1) * PAGE_SIZE;

$where  = [];
$params = [];

if ($search !== '') {
    $where[]  = 'g.name LIKE ?';
    $params[] = '%' . $search . '%';
}
if ($pack !== '') {
    $where[]  = 'g.pack = ?';
    $params[] = $pack;
}
$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

try {
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM games g $whereSql");
    $countStmt->execute($params);
    $totalRows  = (int) $countStmt->fetchColumn();
    $totalPages = (int) ceil($totalRows / PAGE_SIZE);

    $sql = "
        SELECT g.id, g.name, g.pack, g.img, g.created_at,
               COUNT(DISTINCT s.id) AS score_count,
               COUNT(DISTINCT c.id) AS comment_count
        FROM games g
        LEFT JOIN scores   s ON s.game_id = g.id
        LEFT JOIN comments c ON c.game_id = g.id
        $whereSql
        GROUP BY g.id
        ORDER BY g.pack, g.name
        LIMIT ? OFFSET ?
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(array_merge($params, [PAGE_SIZE, $offset]));
    $games = $stmt->fetchAll();

    // Unique packs for filter dropdown
    $packs = $pdo->query("SELECT DISTINCT pack FROM games ORDER BY pack")->fetchAll(PDO::FETCH_COLUMN);
} catch (Exception $e) {
    $error  = "Failed to load games: " . $e->getMessage();
    $games  = [];
    $packs  = [];
    $totalRows = $totalPages = 0;
}

// Determine edit mode
$editGame = null;
if (isset($_GET['edit']) && is_numeric($_GET['edit'])) {
    $editId = (int) $_GET['edit'];
    foreach ($games as $g) {
        if ((int)$g['id'] === $editId) { $editGame = $g; break; }
    }
    // Fetch from DB if not on current page
    if (!$editGame) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM games WHERE id = ?");
            $stmt->execute([$editId]);
            $editGame = $stmt->fetch() ?: null;
        } catch (Exception $e) {}
    }
}

function buildQuery(array $overrides = []): string {
    $base = [
        'search' => trim($_GET['search'] ?? ''),
        'pack'   => trim($_GET['pack']   ?? ''),
        'page'   => 1,
    ];
    $p = array_merge($base, $overrides);
    return '?' . http_build_query(array_filter($p, fn($v) => $v !== '' && $v !== 0));
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manage Games - Admin</title>
    <?php include 'partials/head_styles.php'; ?>
    <style>
        .game-img { width: 40px; height: 40px; object-fit: contain; border-radius: 4px; }
        .edit-panel {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 24px;
        }
        .edit-panel h2 { margin-top: 0; }
        .edit-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        .edit-grid .full { grid-column: 1 / -1; }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group label { font-size: 13px; font-weight: 600; color: #495057; }
        .form-group input {
            padding: 7px 10px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <?php include 'partials/nav.php'; ?>
        <h1>Manage Games</h1>

        <?php if ($message): ?><div class="message success"><?php echo htmlspecialchars($message); ?></div><?php endif; ?>
        <?php if ($error):   ?><div class="message error"><?php echo htmlspecialchars($error);   ?></div><?php endif; ?>

        <?php if ($editGame): ?>
        <div class="edit-panel">
            <h2>Edit Game: <?php echo htmlspecialchars($editGame['name']); ?></h2>
            <form method="POST">
                <input type="hidden" name="game_id" value="<?php echo $editGame['id']; ?>">
                <div class="edit-grid">
                    <div class="form-group">
                        <label for="name">Name</label>
                        <input type="text" id="name" name="name" required
                               value="<?php echo htmlspecialchars($editGame['name']); ?>">
                    </div>
                    <div class="form-group">
                        <label for="pack">Pack</label>
                        <input type="text" id="pack" name="pack" required
                               value="<?php echo htmlspecialchars($editGame['pack']); ?>">
                    </div>
                    <div class="form-group full">
                        <label for="img">Image path</label>
                        <input type="text" id="img" name="img" required
                               value="<?php echo htmlspecialchars($editGame['img']); ?>">
                    </div>
                </div>
                <div style="margin-top:16px;display:flex;gap:8px;">
                    <button type="submit" name="edit_game" class="btn btn-primary">Save Changes</button>
                    <a href="games.php<?php echo buildQuery(); ?>" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
        <?php endif; ?>

        <form method="GET" class="filter-form">
            <div class="form-group">
                <label for="search">Game name</label>
                <input type="text" id="search" name="search"
                       value="<?php echo htmlspecialchars($search); ?>"
                       placeholder="Search…">
            </div>
            <div class="form-group">
                <label for="pack">Pack</label>
                <select id="pack" name="pack">
                    <option value="">— All packs —</option>
                    <?php foreach ($packs as $p): ?>
                        <option value="<?php echo htmlspecialchars($p); ?>"
                            <?php echo $pack === $p ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($p); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Filter</button>
            <?php if ($search || $pack): ?>
                <a href="games.php" class="btn btn-secondary">Clear</a>
            <?php endif; ?>
        </form>

        <p>Showing <?php echo number_format($totalRows); ?> game<?php echo $totalRows !== 1 ? 's' : ''; ?>
           <?php if ($totalPages > 1): ?>(page <?php echo $page; ?> of <?php echo $totalPages; ?>)<?php endif; ?></p>

        <?php if ($games): ?>
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Pack</th>
                    <th>Scores</th>
                    <th>Comments</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($games as $g): ?>
                <tr>
                    <td><?php echo $g['id']; ?></td>
                    <td>
                        <?php if ($g['img']): ?>
                            <img class="game-img"
                                 src="../<?php echo htmlspecialchars($g['img']); ?>"
                                 alt="<?php echo htmlspecialchars($g['name']); ?>"
                                 onerror="this.style.display='none'">
                        <?php endif; ?>
                    </td>
                    <td><?php echo htmlspecialchars($g['name']); ?></td>
                    <td><?php echo htmlspecialchars($g['pack']); ?></td>
                    <td><span class="badge badge-blue"><?php echo $g['score_count']; ?></span></td>
                    <td><span class="badge badge-green"><?php echo $g['comment_count']; ?></span></td>
                    <td style="white-space:nowrap">
                        <a href="<?php echo buildQuery(['edit' => $g['id'], 'page' => $page]); ?>"
                           class="btn btn-secondary btn-sm">Edit</a>
                        <form method="POST" style="display:inline"
                              onsubmit="return confirm('Delete game <?php echo htmlspecialchars(addslashes($g['name'])); ?>? This will also remove all scores and comments for this game.');">
                            <input type="hidden" name="game_id" value="<?php echo $g['id']; ?>">
                            <button type="submit" name="delete_game" class="btn btn-danger btn-sm">Delete</button>
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
            <p>No games found.</p>
        <?php endif; ?>
    </div>
</body>
</html>
