<?php
require_once '../api/db.php';

$message = '';
$error = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['merge'])) {
    $primaryUserId = (int) $_POST['primary_user'];
    $aliasUserId = (int) $_POST['alias_user'];
    
    if ($primaryUserId === $aliasUserId) {
        $error = 'Cannot merge a user with itself!';
    } elseif ($primaryUserId > 0 && $aliasUserId > 0) {
        try {
            $pdo->beginTransaction();
            
            // Get the username of the alias user
            $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$aliasUserId]);
            $aliasUser = $stmt->fetch();
            
            if (!$aliasUser) {
                throw new Exception('Alias user not found');
            }
            
            // Add alias user's username as an alias of primary user
            $stmt = $pdo->prepare("INSERT INTO user_aliases (user_id, alias) VALUES (?, ?)");
            $stmt->execute([$primaryUserId, $aliasUser['username']]);
            
            // Transfer all existing aliases from alias user to primary user
            $stmt = $pdo->prepare("UPDATE user_aliases SET user_id = ? WHERE user_id = ?");
            $stmt->execute([$primaryUserId, $aliasUserId]);
            
            // Update all comments to belong to primary user
            $stmt = $pdo->prepare("UPDATE comments SET user_id = ? WHERE user_id = ?");
            $stmt->execute([$primaryUserId, $aliasUserId]);
            $commentsUpdated = $stmt->rowCount();
            
            // For scores, we need to handle duplicates
            // Delete scores from alias user where primary user already has a score for that game
            $stmt = $pdo->prepare("
                DELETE s1 FROM scores s1
                INNER JOIN scores s2 ON s1.game_id = s2.game_id
                WHERE s1.user_id = ? AND s2.user_id = ?
            ");
            $stmt->execute([$aliasUserId, $primaryUserId]);
            $scoresDropped = $stmt->rowCount();
            
            // Update remaining scores to belong to primary user
            $stmt = $pdo->prepare("UPDATE scores SET user_id = ? WHERE user_id = ?");
            $stmt->execute([$primaryUserId, $aliasUserId]);
            $scoresUpdated = $stmt->rowCount();
            
            // Delete the alias user
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$aliasUserId]);
            
            $pdo->commit();
            
            $message = "Successfully merged users! Updated $commentsUpdated comments, $scoresUpdated scores (dropped $scoresDropped duplicate scores).";
            
        } catch (Exception $e) {
            $pdo->rollBack();
            $error = 'Merge failed: ' . $e->getMessage();
        }
    } else {
        $error = 'Please select both users.';
    }
}

// Get all users for dropdowns
try {
    $stmt = $pdo->query("SELECT id, username FROM users ORDER BY username");
    $users = $stmt->fetchAll();
} catch (Exception $e) {
    $error = 'Failed to load users: ' . $e->getMessage();
    $users = [];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Merge Users - Admin</title>
    <?php include 'partials/head_styles.php'; ?>
    <style>
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; color: #555; }
        select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        .warning { background-color: #fff3cd; color: #856404; padding: 15px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #ffeeba; }
        .info    { background-color: #d1ecf1; color: #0c5460; padding: 15px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #bee5eb; }
    </style>
</head>
<body>
    <div class="container">
        <?php include 'partials/nav.php'; ?>
        <h1>Merge Users</h1>
        
        <?php if ($message): ?>
            <div class="message success"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="message error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
        <div class="info">
            <strong>How this works:</strong><br>
            • The second user will become an alias of the first user<br>
            • All comments from the second user will be transferred to the first user<br>
            • All scores will be transferred (duplicates will be dropped, keeping the first user's scores)<br>
            • The second user will be deleted after the merge
        </div>
        
        <div class="warning">
            <strong>⚠️ Warning:</strong> This action cannot be undone!
        </div>
        
        <form method="POST">
            <div class="form-group">
                <label for="primary_user">Keep this user (Primary):</label>
                <select name="primary_user" id="primary_user" required>
                    <option value="">-- Select Primary User --</option>
                    <?php foreach ($users as $user): ?>
                        <option value="<?php echo $user['id']; ?>">
                            <?php echo htmlspecialchars($user['username']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="form-group">
                <label for="alias_user">Merge this user into the primary (Will be deleted):</label>
                <select name="alias_user" id="alias_user" required>
                    <option value="">-- Select User to Merge --</option>
                    <?php foreach ($users as $user): ?>
                        <option value="<?php echo $user['id']; ?>">
                            <?php echo htmlspecialchars($user['username']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <button type="submit" name="merge" class="btn btn-primary"
                    onclick="return confirm('Are you sure you want to merge these users? This cannot be undone!');">
                Merge Users
            </button>
        </form>
    </div>
</body>
</html>