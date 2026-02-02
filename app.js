// Backend API Configuration
// To change the backend URL for deployment, modify the value below
const API_URL = window.JACKBOX_CONFIG?.backendUrl || 'http://localhost:3000';
let authToken = null;
let currentUserId = null;

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

// Authenticate User with Backend API
async function authenticateUser(username) {
    const email = `${username.toLowerCase()}@example.com`;
    
    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });
        
        if (!response.ok) {
            throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        authToken = data.token;
        currentUserId = data.user.id;
        
        // Store token in localStorage for session persistence
        localStorage.setItem('jackbox_token', authToken);
        localStorage.setItem('jackbox_userId', currentUserId);
    } catch (error) {
        console.error('Failed to authenticate:', error);
        throw new Error('Backend database is not available. Please ensure the server is running.');
    }
}

// Helper function to make authenticated API requests
async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    
    return response.json();
}


// Initialize App
async function initApp() {
    // Initialize theme
    initTheme();
    
    // Check for existing session
    const savedUser = localStorage.getItem('jackbox_user');
    const savedToken = localStorage.getItem('jackbox_token');
    const savedUserId = localStorage.getItem('jackbox_userId');
    
    if (savedUser && savedToken && savedUserId) {
        currentUser = savedUser;
        authToken = savedToken;
        currentUserId = savedUserId;
        
        // Verify token is still valid
        try {
            await apiRequest('/api/auth/verify');
            showAppScreen();
            await loadGames();
        } catch (error) {
            console.error('Session verification failed:', error);
            alert('Error: Cannot connect to the backend database. Please ensure the server is running at ' + API_URL);
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
        
        // Authenticate with Backend API
        try {
            await authenticateUser(username);
            showAppScreen();
            await loadGames();
        } catch (error) {
            console.error('Login failed:', error);
            alert('Error: Cannot connect to the backend database. Please ensure the server is running at ' + API_URL);
            currentUser = null;
            localStorage.removeItem('jackbox_user');
        }
    }
}

// Handle Logout
function handleLogout() {
    currentUser = null;
    authToken = null;
    currentUserId = null;
    localStorage.removeItem('jackbox_user');
    localStorage.removeItem('jackbox_token');
    localStorage.removeItem('jackbox_userId');
    unsubscribeAll();
    
    // Call logout endpoint if we have a token
    if (authToken) {
        apiRequest('/api/auth/logout', { method: 'POST' }).catch(err => {
            console.warn('Logout request failed:', err);
        });
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

// Load User Scores from Database
async function loadUserScoresFromDB() {
    if (!authToken || !currentUserId) {
        return {};
    }
    
    try {
        // Fetch all scores for the current user
        const data = await apiRequest(`/api/scores?user=${currentUserId}`);
        
        // Map scores by game ID
        const scoresMap = {};
        data.items.forEach(record => {
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
        // Try to load from Backend API
        const data = await apiRequest('/api/games');
        
        // Map API response to expected format
        games = data.items.map(record => ({
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
        alert('Error: Cannot connect to the backend database. Please ensure the server is running at ' + API_URL);
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
    
    // Sync to Backend API if available
    try {
        if (authToken && currentUserId) {
            await syncScoreToPocketBase(gameId, newScore);
        }
    } catch (error) {
        console.warn('Failed to sync score to backend', error);
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

// Sync Score to Backend
async function syncScoreToPocketBase(gameId, score) {
    if (!authToken || !currentUserId) return;
    
    try {
        await apiRequest('/api/scores', {
            method: 'POST',
            body: JSON.stringify({
                game: gameId,
                score: score,
            }),
        });
    } catch (error) {
        console.error('Error syncing score:', error);
    }
}

// Setup Realtime Subscriptions (removed - no websocket support yet)
async function setupRealtimeSubscriptions() {
    // Real-time subscriptions not implemented in this version
    // Could be added later with WebSocket support
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
        // Fetch all scores with user and game data
        const data = await apiRequest('/api/scores');
        
        // Fetch all users and games to join the data
        const gamesData = await apiRequest('/api/games');
        const gamesMap = {};
        gamesData.items.forEach(g => {
            gamesMap[g.id] = g.name;
        });
        
        return data.items.map(r => ({
            user: r.user.substring(0, 8), // Use user ID prefix as identifier
            gameName: gamesMap[r.game] || 'Unknown',
            score: r.score || 0
        }));
    } catch (e) {
        console.warn('Failed to fetch votes in getAllVotes:', e);
        return [];
    }
}


// Load Comments for a Game
async function loadComments(gameId, card) {
    const commentsList = card.querySelector('.comments-list');
    
    try {
        // Fetch comments for this game
        const data = await apiRequest(`/api/comments?game=${gameId}`);
        
        if (data.items.length === 0) {
            commentsList.innerHTML = '<div class="comments-empty">No comments yet. Be the first to comment!</div>';
            return;
        }
        
        // Render comments
        commentsList.innerHTML = '';
        data.items.forEach(comment => {
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

// Show error message inline instead of alert
function showCommentError(card, message) {
    const commentsList = card.querySelector('.comments-list');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'comments-error';
    errorDiv.textContent = message;
    commentsList.prepend(errorDiv);
    
    // Remove error after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// Submit a Comment
async function submitComment(gameId, commentText, card) {
    if (!authToken || !currentUserId) {
        showCommentError(card, 'You must be logged in to comment');
        return;
    }
    
    try {
        await apiRequest('/api/comments', {
            method: 'POST',
            body: JSON.stringify({
                comment: commentText,
                game: gameId,
            }),
        });
        
        // Reload comments to show the new one
        await loadComments(gameId, card);
    } catch (error) {
        console.error('Failed to submit comment:', error);
        showCommentError(card, 'Failed to submit comment. Please try again.');
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
