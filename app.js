// PocketBase Configuration
// To change the backend URL for deployment, modify the value below
const PB_URL = window.JACKBOX_CONFIG?.backendUrl || 'http://127.0.0.1:8090';
let pb;

// Initialize PocketBase
if (typeof PocketBase !== 'undefined') {
    try {
        pb = new PocketBase(PB_URL);
    } catch (error) {
        console.error('Failed to initialize PocketBase:', error);
    }
} else {
    console.error('PocketBase SDK not loaded');
}

// App State
let currentUser = null;
let games = [];
let scores = {};
let subscriptions = [];

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const themeToggle = document.getElementById('theme-toggle');
const gamesContainer = document.getElementById('games-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const navBtns = document.querySelectorAll('.nav-btn');
const gameNameFilter = document.getElementById('game-name-filter');
const packFilter = document.getElementById('pack-filter');

// Authenticate User with PocketBase
async function authenticateUser(username) {
    if (!pb || !pb.collection) {
        throw new Error('Backend database is not available. Please ensure PocketBase is running.');
    }
    
    const email = `${username.toLowerCase()}@example.com`;
    const password = email;
    
    try {
        // Try to authenticate existing user
        await pb.collection('users').authWithPassword(email, password);
    } catch (error) {
        // If authentication fails, try to create the user
        try {
            await pb.collection('users').create({
                email: email,
                password: password,
                passwordConfirm: password,
                emailVisibility: true,
            });
            // Authenticate after creation
            await pb.collection('users').authWithPassword(email, password);
        } catch (createError) {
            console.error('Failed to create user:', createError);
            throw createError;
        }
    }
}



// Initialize App
async function initApp() {
    // Initialize theme
    initTheme();
    
    // Check for existing session
    const savedUser = localStorage.getItem('jackbox_user');
    if (savedUser) {
        currentUser = savedUser;
        
        // Try to re-authenticate with PocketBase
        try {
            await authenticateUser(savedUser);
            showAppScreen();
            await loadGames();
            setupRealtimeSubscriptions();
        } catch (error) {
            console.error('Failed to re-authenticate on app init:', error);
            alert('Error: Cannot connect to the backend database. Please ensure PocketBase is running at ' + PB_URL);
            handleLogout();
        }
    }
    
    // Setup event listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Setup filter listeners
    if (gameNameFilter) {
        gameNameFilter.addEventListener('input', applyFilters);
    }
    if (packFilter) {
        packFilter.addEventListener('change', applyFilters);
    }
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('jackbox_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon(true);
    }
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('jackbox_theme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    if (!themeToggle) return;
    
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    
    if (!sunIcon || !moonIcon) return;
    
    if (isDark) {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    
    if (username) {
        currentUser = username;
        localStorage.setItem('jackbox_user', username);
        
        // Authenticate with PocketBase
        try {
            await authenticateUser(username);
            showAppScreen();
            await loadGames();
            setupRealtimeSubscriptions();
        } catch (error) {
            console.error('Login failed:', error);
            alert('Error: Cannot connect to the backend database. Please ensure PocketBase is running at ' + PB_URL);
            currentUser = null;
            localStorage.removeItem('jackbox_user');
        }
    }
}

// Handle Logout
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('jackbox_user');
    unsubscribeAll();
    
    // Clear PocketBase auth state
    if (pb && pb.authStore) {
        pb.authStore.clear();
    }
    
    showLoginScreen();
}

// Screen Management
function showLoginScreen() {
    loginScreen.classList.add('active');
    appScreen.classList.remove('active');
    usernameInput.value = '';
}

function showAppScreen() {
    loginScreen.classList.remove('active');
    appScreen.classList.add('active');
    usernameDisplay.textContent = currentUser;
}

// Tab Switching
function switchTab(tabId) {
    // Update nav buttons
    navBtns.forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    
    // Refresh leaderboard when switching to it
    if (tabId === 'leaderboard-tab') {
        renderLeaderboard();
    }
}

// Load User Scores from PocketBase
async function loadUserScoresFromDB() {
    if (!pb || !pb.collection || !pb.authStore.model) {
        return {};
    }
    
    try {
        const userId = pb.authStore.model.id;
        
        // Escape filter values to prevent injection
        const escapedUserId = userId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        
        // Fetch all scores for the current user
        const userScores = await pb.collection('scores').getFullList({
            filter: `user = "${escapedUserId}"`,
        });
        
        // Map scores by game ID
        const scoresMap = {};
        userScores.forEach(record => {
            scoresMap[record.game] = record.score ?? 0;
        });
        
        return scoresMap;
    } catch (error) {
        console.warn('Failed to load user scores from database:', error);
        return {};
    }
}

// Load Games
async function loadGames() {
    try {
        if (!pb || !pb.collection) {
            throw new Error('Backend database is not available. Please ensure PocketBase is running.');
        }
        
        // Try to load from PocketBase
        const records = await pb.collection('games').getFullList({
            sort: 'name',
        });
        
        // Map PocketBase records to expected format
        games = records.map(record => ({
            id: record.id,
            name: record.name,
            image: record.img || '',
            pack: record.pack || '',
        }));
        
        // Load scores from database first
        const dbScores = await loadUserScoresFromDB();
        
        // Initialize scores - prioritize database scores over localStorage
        scores = {};
        games.forEach(game => {
            scores[game.id] = dbScores[game.id] !== undefined ? dbScores[game.id] : 0;
        });
        
        // Update localStorage with current scores from database
        localStorage.setItem(`scores_${currentUser}`, JSON.stringify(scores));
        
        populatePackFilter();
        renderGames();
    } catch (error) {
        console.error('Failed to load games from backend:', error);
        alert('Error: Cannot connect to the backend database. Please ensure PocketBase is running at ' + PB_URL);
        handleLogout();
    }
}



// Render Games
function renderGames() {
    gamesContainer.innerHTML = '';
    
    if (games.length === 0) {
        gamesContainer.innerHTML = '<div class="empty-state">No games available</div>';
        return;
    }
    
    // Apply filters
    const filteredGames = getFilteredGames();
    
    if (filteredGames.length === 0) {
        gamesContainer.innerHTML = '<div class="empty-state">No games match the current filters</div>';
        return;
    }
    
    filteredGames.forEach(game => {
        const card = createGameCard(game);
        gamesContainer.appendChild(card);
    });
}

// Populate Pack Filter
function populatePackFilter() {
    if (!packFilter) return;
    
    // Get unique packs
    const packs = [...new Set(games.map(game => game.pack).filter(pack => pack))].sort();
    
    // Clear existing options except "All Party Packs"
    packFilter.innerHTML = '<option value="">All Party Packs</option>';
    
    // Add pack options
    packs.forEach(pack => {
        const option = document.createElement('option');
        option.value = pack;
        option.textContent = pack;
        packFilter.appendChild(option);
    });
}

// Get Filtered Games
function getFilteredGames() {
    let filtered = [...games];
    
    // Filter by name
    if (gameNameFilter && gameNameFilter.value.trim()) {
        const searchTerm = gameNameFilter.value.trim().toLowerCase();
        filtered = filtered.filter(game => 
            game.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Filter by pack
    if (packFilter && packFilter.value) {
        filtered = filtered.filter(game => game.pack === packFilter.value);
    }
    
    return filtered;
}

// Apply Filters
function applyFilters() {
    renderGames();
}

// Create Game Card
function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.gameId = game.id;
    
    const score = scores[game.id] || 0;
    
    // Create stars HTML
    let starsHTML = '<div class="star-rating">';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= score ? 'filled' : '';
        starsHTML += `<span class="star ${filled}" data-rating="${i}">★</span>`;
    }
    starsHTML += '</div>';
    
    card.innerHTML = `
        <div class="game-card-header">
            <div class="game-image">
                ${game.image ? `<img src="${game.image}" alt="${game.name}">` : game.name.charAt(0)}
            </div>
            <div class="game-info">
                <div class="game-name">${game.name}</div>
                ${game.pack ? `<div class="game-pack">${game.pack}</div>` : ''}
                ${starsHTML}
            </div>
            <button class="comment-toggle" aria-label="Toggle comments" data-game-id="${game.id}">
                <svg class="chevron" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
        </div>
        <div class="comment-section" style="display: none;">
            <div class="comment-input-container">
                <textarea class="comment-input" placeholder="Add a comment..." rows="2" maxlength="500"></textarea>
                <button class="comment-submit">Post Comment</button>
            </div>
            <div class="comments-list">
                <div class="comments-loading">Loading comments...</div>
            </div>
        </div>
    `;
    
    // Add event listeners for stars
    const stars = card.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            const currentScore = scores[game.id] || 0;
            // If clicking the same star, reset to 0
            const newScore = currentScore === rating ? 0 : rating;
            updateScore(game.id, newScore);
            
            // Remove hover effect after click (important for mobile)
            stars.forEach(s => s.classList.remove('hover'));
        });
        
        // Add hover effect (desktop only)
        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        });
    });
    
    // Remove hover effect when leaving the star rating area
    const starRating = card.querySelector('.star-rating');
    starRating.addEventListener('mouseleave', () => {
        stars.forEach(s => s.classList.remove('hover'));
    });
    
    // Comment toggle functionality
    const commentToggle = card.querySelector('.comment-toggle');
    const commentSection = card.querySelector('.comment-section');
    const chevron = commentToggle.querySelector('.chevron');
    
    commentToggle.addEventListener('click', async () => {
        const isExpanded = commentSection.style.display !== 'none';
        
        if (isExpanded) {
            // Collapse
            commentSection.style.display = 'none';
            chevron.style.transform = 'rotate(0deg)';
        } else {
            // Expand
            commentSection.style.display = 'block';
            chevron.style.transform = 'rotate(180deg)';
            // Load comments when expanding
            await loadComments(game.id, card);
        }
    });
    
    // Comment submit functionality
    const commentSubmit = card.querySelector('.comment-submit');
    const commentInput = card.querySelector('.comment-input');
    
    commentSubmit.addEventListener('click', async () => {
        const commentText = commentInput.value.trim();
        if (commentText) {
            await submitComment(game.id, commentText, card);
            commentInput.value = '';
        }
    });
    
    return card;
}

// Update Score
async function updateScore(gameId, newScore) {
    // newScore can be 0-5, where 0 means unscored
    const currentScore = scores[gameId] || 0;
    
    // Validate score range - silently return for invalid scores or no change
    if (newScore < 0 || newScore > 5 || newScore === currentScore) {
        return;
    }
    
    scores[gameId] = newScore;
    
    // Save to localStorage
    localStorage.setItem(`scores_${currentUser}`, JSON.stringify(scores));
    
    // Update UI
    const card = document.querySelector(`[data-game-id="${gameId}"]`);
    if (card) {
        updateStarDisplay(card, newScore);
    }
    
    // Sync to PocketBase if available
    try {
        if (pb && pb.collection) {
            await syncScoreToPocketBase(gameId, newScore);
        }
    } catch (error) {
        console.warn('Failed to sync score to PocketBase', error);
    }
}

// Update Star Display
function updateStarDisplay(card, score) {
    const stars = card.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < score) {
            star.classList.add('filled');
        } else {
            star.classList.remove('filled');
        }
    });
}

// Sync Score to PocketBase
async function syncScoreToPocketBase(gameId, score) {
    if (!pb || !pb.collection || !pb.authStore.model) return;
    
    try {
        // Get the authenticated user ID
        const userId = pb.authStore.model.id;
        
        // Escape filter values to prevent injection
        const escapedUserId = userId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const escapedGameId = gameId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        
        // Check if score record exists
        const records = await pb.collection('scores').getFullList({
            filter: `user = "${escapedUserId}" && game = "${escapedGameId}"`,
        });
        
        const data = {
            user: userId,
            game: gameId,
            score: score,
        };
        
        if (records.length > 0) {
            // Update existing record
            await pb.collection('scores').update(records[0].id, data);
        } else {
            // Create new record
            await pb.collection('scores').create(data);
        }
    } catch (error) {
        console.error('Error syncing score:', error);
    }
}

// Setup Realtime Subscriptions
async function setupRealtimeSubscriptions() {
    if (!pb || !pb.collection) return;
    
    try {
        // Subscribe to scores changes
        const unsubscribe = await pb.collection('scores').subscribe('*', () => {
            // Refresh leaderboard when scores change
            if (document.getElementById('leaderboard-tab').classList.contains('active')) {
                renderLeaderboard();
            }
        });
        
        subscriptions.push(unsubscribe);
    } catch (error) {
        console.warn('Failed to setup realtime subscriptions', error);
    }
}

// Unsubscribe All
function unsubscribeAll() {
    subscriptions.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    subscriptions = [];
}

// Render Leaderboard
async function renderLeaderboard() {
    // 1. Fetch raw scores
    const allVotes = await getAllVotes();
    
    if (allVotes.length === 0) {
        leaderboardContainer.innerHTML = `
            <div class="leaderboard-header">Game Rankings</div>
            <div class="empty-state">No scores yet. Start scoring games!</div>
        `;
        return;
    }

    // 2. Aggregate scores by Game
    // Map<GameName, { total: number, count: number, voters: string[] }>
    const gameStats = {};

    allVotes.forEach(vote => {
        const gameName = vote.gameName;
        const score = vote.score;
        
        // Skip scores of 0 (unscored)
        if (score === 0) return;
        
        if (!gameStats[gameName]) {
            gameStats[gameName] = { total: 0, count: 0, voters: [] };
        }
        gameStats[gameName].total += score;
        gameStats[gameName].count += 1;
        // Optional: track who voted for the "details" view
        gameStats[gameName].voters.push(`${vote.user} (${score})`);
    });

    // 3. Convert to array and calculate average
    const rankedGames = Object.entries(gameStats).map(([name, stats]) => ({
        name,
        average: stats.total / stats.count,
        count: stats.count,
        voters: stats.voters
    }));

    // 4. Sort by Average Descending
    rankedGames.sort((a, b) => b.average - a.average);

    // 5. Render
    leaderboardContainer.innerHTML = '<div class="leaderboard-header">Game Rankings</div>';
    
    if (rankedGames.length === 0) {
        leaderboardContainer.innerHTML += '<div class="empty-state">No scored games yet. Start rating games!</div>';
        return;
    }
    
    rankedGames.forEach((item, index) => {
        const rank = index + 1;
        const leaderboardItem = document.createElement('div');
        leaderboardItem.className = 'leaderboard-item';
        
        // Dynamic rank styling
        let rankClass = '';
        if (rank === 1) rankClass = 'gold';
        else if (rank === 2) rankClass = 'silver';
        else if (rank === 3) rankClass = 'bronze';
        
        leaderboardItem.innerHTML = `
            <div class="rank ${rankClass}">${rank}</div>
            <div class="game-details">
                <div class="game-title">${item.name}</div>
                <div class="player-name">${item.count} votes</div>
            </div>
            <div class="total-score">${item.average.toFixed(1)}</div>
        `;
        // Optional: Click to expand 'voters' could go here
        leaderboardContainer.appendChild(leaderboardItem);
    });
}

// Helper to get raw vote data
async function getAllVotes() {
    try {
        if (!pb || !pb.collection) {
            throw new Error('Backend database is not available');
        }
        
        // Ensure you expand 'game' and 'user' to get the names
        const records = await pb.collection('scores').getFullList({
            expand: 'game,user',
            sort: 'created', // Consistent ordering
        });
        return records.map(r => ({
            user: r.expand?.user?.email?.replace('@example.com', '') || 'Unknown',
            gameName: r.expand?.game?.name || 'Unknown',
            score: r.score
        }));
    } catch (e) {
        console.warn('Failed to fetch votes in getAllVotes:', e);
        return [];
    }
}


// Load Comments for a Game
async function loadComments(gameId, card) {
    const commentsList = card.querySelector('.comments-list');
    
    if (!pb || !pb.collection) {
        commentsList.innerHTML = '<div class="comments-error">Comments unavailable - database not connected</div>';
        return;
    }
    
    try {
        // Fetch comments for this game, sorted by created date descending (newest first)
        const comments = await pb.collection('comments').getFullList({
            filter: `game = "${gameId.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`,
            sort: '-created',
            expand: 'user',
        });
        
        if (comments.length === 0) {
            commentsList.innerHTML = '<div class="comments-empty">No comments yet. Be the first to comment!</div>';
            return;
        }
        
        // Render comments
        commentsList.innerHTML = '';
        comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment-item';
            
            const username = comment.expand?.user?.email?.replace('@example.com', '') || 'Anonymous';
            const date = new Date(comment.created);
            const formattedDate = date.toLocaleString();
            
            commentEl.innerHTML = `
                <div class="comment-header">
                    <span class="comment-user">${username}</span>
                    <span class="comment-date">${formattedDate}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.comment)}</div>
            `;
            
            commentsList.appendChild(commentEl);
        });
    } catch (error) {
        console.error('Failed to load comments:', error);
        commentsList.innerHTML = '<div class="comments-error">Failed to load comments</div>';
    }
}

// Submit a Comment
async function submitComment(gameId, commentText, card) {
    if (!pb || !pb.collection || !pb.authStore.model) {
        alert('You must be logged in to comment');
        return;
    }
    
    try {
        const userId = pb.authStore.model.id;
        
        await pb.collection('comments').create({
            comment: commentText,
            user: userId,
            game: gameId,
        });
        
        // Reload comments to show the new one
        await loadComments(gameId, card);
    } catch (error) {
        console.error('Failed to submit comment:', error);
        alert('Failed to submit comment. Please try again.');
    }
}

// Helper function to escape HTML and prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleLogin,
        handleLogout,
        updateScore,
        getAllVotes,
        switchTab,
        authenticateUser,
        toggleTheme,
        initTheme,
        loadUserScoresFromDB,
    };
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
