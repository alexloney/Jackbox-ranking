// PocketBase Configuration
const PB_URL = 'http://127.0.0.1:8090';
let pb;

// Initialize PocketBase
if (typeof PocketBase !== 'undefined') {
    try {
        pb = new PocketBase(PB_URL);
    } catch (error) {
        console.warn('Failed to initialize PocketBase, running in demo mode');
    }
} else {
    console.warn('PocketBase SDK not loaded, running in demo mode');
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
const gamesContainer = document.getElementById('games-container');
const leaderboardContainer = document.getElementById('leaderboard-container');
const navBtns = document.querySelectorAll('.nav-btn');

// Authenticate User with PocketBase
async function authenticateUser(username) {
    if (!pb || !pb.collection) return;
    
    const email = `${username.toLowerCase()}@example.com`;
    const password = username.toLowerCase();
    
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

// Initialize Database and Seed Data
async function initializeDatabase() {
    if (!pb || !pb.collection) return;
    
    try {
        // Check if Games collection has any records
        const existingGames = await pb.collection('games').getList(1, 1);
        
        // If no games exist, seed the collection
        if (existingGames.items.length === 0) {
            const gamesToSeed = [
                { name: 'You Don\'t Know Jack 2015', pack: 'Party Pack 1', img: '' },
                { name: 'Drawful', pack: 'Party Pack 1', img: '' },
                { name: 'Word Spud', pack: 'Party Pack 1', img: '' },
            ];
            
            for (const game of gamesToSeed) {
                await pb.collection('games').create(game);
            }
            
            console.log('Database seeded with initial games');
        }
    } catch (error) {
        console.warn('Database initialization warning:', error);
        // Collections might not exist yet - this is handled by PocketBase admin UI
    }
}

// Initialize App
async function initApp() {
    // Check for existing session
    const savedUser = localStorage.getItem('jackbox_user');
    if (savedUser) {
        currentUser = savedUser;
        
        // Try to re-authenticate with PocketBase
        if (pb && pb.collection) {
            try {
                await authenticateUser(savedUser);
                await initializeDatabase();
            } catch (error) {
                console.warn('PocketBase re-authentication failed, continuing in local mode:', error);
            }
        }
        
        showAppScreen();
        await loadGames();
        setupRealtimeSubscriptions();
    }
    
    // Setup event listeners
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    
    if (username) {
        currentUser = username;
        localStorage.setItem('jackbox_user', username);
        
        // Authenticate with PocketBase if available
        if (pb && pb.collection) {
            try {
                await authenticateUser(username);
                await initializeDatabase();
            } catch (error) {
                console.warn('PocketBase authentication failed, continuing in local mode:', error);
            }
        }
        
        showAppScreen();
        await loadGames();
        setupRealtimeSubscriptions();
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
        if (pb && pb.collection) {
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
        } else {
            // Use demo data
            games = getDemoGames();
        }
        
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
        
        renderGames();
    } catch (error) {
        console.warn('Failed to load from PocketBase, using demo data', error);
        games = getDemoGames();
        scores = {};
        games.forEach(game => {
            scores[game.id] = 0;
        });
        renderGames();
    }
}

// Get Demo Games
function getDemoGames() {
    return [
        { id: 'game1', name: 'Quiplash', image: '' },
        { id: 'game2', name: 'Fibbage', image: '' },
        { id: 'game3', name: 'Drawful', image: '' },
        { id: 'game4', name: 'Trivia Murder Party', image: '' },
        { id: 'game5', name: 'Tee K.O.', image: '' },
        { id: 'game6', name: 'Monster Seeking Monster', image: '' },
        { id: 'game7', name: 'Bracketeering', image: '' },
        { id: 'game8', name: 'Civic Doodle', image: '' },
    ];
}

// Render Games
function renderGames() {
    gamesContainer.innerHTML = '';
    
    if (games.length === 0) {
        gamesContainer.innerHTML = '<div class="empty-state">No games available</div>';
        return;
    }
    
    games.forEach(game => {
        const card = createGameCard(game);
        gamesContainer.appendChild(card);
    });
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
        if (pb && pb.collection) {
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
        } else {
            // Adapt your local storage logic here to return the same structure
            return getLocalVotes();
        }
    } catch (e) {
        console.warn('Failed to fetch votes in getAllVotes:', e);
        return [];
    }
}

// Get Local Votes (for localStorage fallback)
function getLocalVotes() {
    const allVotes = [];
    
    // Get all user scores from localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('scores_')) {
            const username = key.replace('scores_', '');
            const userScores = JSON.parse(localStorage.getItem(key));
            
            Object.entries(userScores).forEach(([gameId, score]) => {
                const game = games.find(g => g.id === gameId);
                if (game && score > 0) {
                    allVotes.push({
                        user: username,
                        gameName: game.name,
                        score: score,
                    });
                }
            });
        }
    }
    
    return allVotes;
}

// Get Local Scores (deprecated - kept for backward compatibility with tests)
function getLocalScores() {
    const allScores = [];
    
    // Get all user scores from localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('scores_')) {
            const username = key.replace('scores_', '');
            const userScores = JSON.parse(localStorage.getItem(key));
            
            Object.entries(userScores).forEach(([gameId, score]) => {
                const game = games.find(g => g.id === gameId);
                if (game && score > 0) {
                    allScores.push({
                        user: username,
                        game: game.name,
                        totalScore: score,
                    });
                }
            });
        }
    }
    
    return allScores;
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleLogin,
        handleLogout,
        updateScore,
        getDemoGames,
        getLocalScores,
        getLocalVotes,
        getAllVotes,
        switchTab,
        authenticateUser,
        initializeDatabase,
    };
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
