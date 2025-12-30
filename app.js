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
        
        // Initialize scores from localStorage or default
        const savedScores = localStorage.getItem(`scores_${currentUser}`);
        if (savedScores) {
            scores = JSON.parse(savedScores);
        } else {
            scores = {};
            games.forEach(game => {
                scores[game.id] = 0;
            });
        }
        
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
    
    card.innerHTML = `
        <div class="game-image">
            ${game.image ? `<img src="${game.image}" alt="${game.name}">` : game.name.charAt(0)}
        </div>
        <div class="game-info">
            <div class="game-name">${game.name}</div>
            ${game.pack ? `<div class="game-pack">${game.pack}</div>` : ''}
            <div class="score-controls">
                <button class="score-btn" data-action="decrease" ${score <= 0 ? 'disabled' : ''}>−</button>
                <div class="score-display">${score}</div>
                <button class="score-btn" data-action="increase" ${score >= 10 ? 'disabled' : ''}>+</button>
            </div>
        </div>
    `;
    
    // Add event listeners for score buttons
    const decreaseBtn = card.querySelector('[data-action="decrease"]');
    const increaseBtn = card.querySelector('[data-action="increase"]');
    
    decreaseBtn.addEventListener('click', () => updateScore(game.id, -1));
    increaseBtn.addEventListener('click', () => updateScore(game.id, 1));
    
    return card;
}

// Update Score
async function updateScore(gameId, delta) {
    const currentScore = scores[gameId] || 0;
    const newScore = Math.max(0, Math.min(10, currentScore + delta));
    
    if (newScore === currentScore) return;
    
    scores[gameId] = newScore;
    
    // Save to localStorage
    localStorage.setItem(`scores_${currentUser}`, JSON.stringify(scores));
    
    // Update UI
    const card = document.querySelector(`[data-game-id="${gameId}"]`);
    if (card) {
        const scoreDisplay = card.querySelector('.score-display');
        const decreaseBtn = card.querySelector('[data-action="decrease"]');
        const increaseBtn = card.querySelector('[data-action="increase"]');
        
        scoreDisplay.textContent = newScore;
        decreaseBtn.disabled = newScore <= 0;
        increaseBtn.disabled = newScore >= 10;
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
        if (!gameStats[gameName]) {
            gameStats[gameName] = { total: 0, count: 0, voters: [] };
        }
        gameStats[gameName].total += vote.score;
        gameStats[gameName].count += 1;
        // Optional: track who voted for the "details" view
        gameStats[gameName].voters.push(`${vote.user} (${vote.score})`);
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
    };
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
