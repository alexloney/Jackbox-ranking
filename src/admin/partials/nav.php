<?php
// Determine current page for active nav highlighting
$currentPage = basename($_SERVER['PHP_SELF'], '.php');
$navLinks = [
    'index'       => ['href' => 'index.php',       'label' => '🏠 Dashboard'],
    'users'       => ['href' => 'users.php',        'label' => '👤 Users'],
    'games'       => ['href' => 'games.php',        'label' => '🎮 Games'],
    'scores'      => ['href' => 'scores.php',       'label' => '⭐ Scores'],
    'comments'    => ['href' => 'comments.php',     'label' => '💬 Comments'],
    'merge'       => ['href' => 'merge.php',        'label' => '🔀 Merge'],
    'performance' => ['href' => 'performance.php',  'label' => '⚡ Performance'],
];
?>
<style>
    .admin-nav {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid #dee2e6;
    }
    .admin-nav a {
        padding: 7px 14px;
        border-radius: 4px;
        font-size: 13px;
        font-weight: 600;
        color: #495057;
        text-decoration: none;
        border: 1px solid #dee2e6;
        background: #f8f9fa;
        transition: background-color 0.15s;
    }
    .admin-nav a:hover { background: #e9ecef; text-decoration: none; }
    .admin-nav a.active { background: #007bff; color: white; border-color: #007bff; }
</style>
<nav class="admin-nav">
    <?php foreach ($navLinks as $page => $link): ?>
        <a href="<?php echo $link['href']; ?>"
           class="<?php echo $currentPage === $page ? 'active' : ''; ?>">
            <?php echo $link['label']; ?>
        </a>
    <?php endforeach; ?>
</nav>
