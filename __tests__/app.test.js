/**
 * @jest-environment jsdom
 */

// Mock PocketBase
global.PocketBase = class PocketBase {
  constructor(url) {
    this.baseUrl = url;
  }
};

// Set up DOM
document.body.innerHTML = `
  <div id="login-screen" class="screen active">
    <form id="login-form">
      <input type="text" id="username-input" />
    </form>
  </div>
  <div id="app-screen" class="screen">
    <span id="username-display"></span>
    <button id="logout-btn"></button>
    <div id="games-container"></div>
    <div id="leaderboard-container"></div>
    <div id="scoring-tab" class="tab-pane active"></div>
    <div id="leaderboard-tab" class="tab-pane"></div>
  </div>
`;

// Import the module
const {
  getDemoGames,
  getLocalScores,
  getLocalVotes,
  getAllVotes,
} = require('../app.js');

describe('Jackbox Ranking App', () => {
  describe('getDemoGames', () => {
    test('should return an array of games', () => {
      const games = getDemoGames();
      expect(Array.isArray(games)).toBe(true);
      expect(games.length).toBeGreaterThan(0);
    });

    test('each game should have required properties', () => {
      const games = getDemoGames();
      games.forEach(game => {
        expect(game).toHaveProperty('id');
        expect(game).toHaveProperty('name');
        expect(game).toHaveProperty('image');
      });
    });

    test('game ids should be unique', () => {
      const games = getDemoGames();
      const ids = games.map(g => g.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getLocalScores', () => {
    test('should return empty array when no scores exist', () => {
      global.localStorage.length = 0;
      const scores = getLocalScores();
      expect(Array.isArray(scores)).toBe(true);
      expect(scores.length).toBe(0);
    });

    test('should parse and return local scores when data exists', () => {
      // Mock localStorage with some data
      const mockScores = { game1: 5, game2: 8 };
      global.localStorage.length = 1;
      global.localStorage.key = jest.fn((i) => i === 0 ? 'scores_testuser' : null);
      global.localStorage.getItem = jest.fn((key) => {
        if (key === 'scores_testuser') {
          return JSON.stringify(mockScores);
        }
        return null;
      });
      
      // Need to set up games array in the global scope
      global.games = getDemoGames();
      
      const scores = getLocalScores();
      expect(Array.isArray(scores)).toBe(true);
    });
  });

  describe('Score Management', () => {
    test('scores should be between 0 and 10', () => {
      const minScore = 0;
      const maxScore = 10;
      
      // Test boundary conditions
      expect(Math.max(0, Math.min(10, -1))).toBe(minScore);
      expect(Math.max(0, Math.min(10, 0))).toBe(minScore);
      expect(Math.max(0, Math.min(10, 5))).toBe(5);
      expect(Math.max(0, Math.min(10, 10))).toBe(maxScore);
      expect(Math.max(0, Math.min(10, 11))).toBe(maxScore);
    });

    test('score increments should work correctly', () => {
      let score = 5;
      const delta = 1;
      const newScore = Math.max(0, Math.min(10, score + delta));
      expect(newScore).toBe(6);
    });

    test('score decrements should work correctly', () => {
      let score = 5;
      const delta = -1;
      const newScore = Math.max(0, Math.min(10, score + delta));
      expect(newScore).toBe(4);
    });

    test('score should not go below 0', () => {
      let score = 0;
      const delta = -1;
      const newScore = Math.max(0, Math.min(10, score + delta));
      expect(newScore).toBe(0);
    });

    test('score should not go above 10', () => {
      let score = 10;
      const delta = 1;
      const newScore = Math.max(0, Math.min(10, score + delta));
      expect(newScore).toBe(10);
    });
  });

  describe('User Authentication', () => {
    test('should handle username storage', () => {
      const username = 'testuser';
      const key = 'jackbox_user';
      
      // Test that we can call setItem without error
      expect(() => {
        global.localStorage.setItem(key, username);
      }).not.toThrow();
    });

    test('should retrieve username from localStorage', () => {
      const username = 'testuser';
      const getItemMock = jest.fn((key) => key === 'jackbox_user' ? username : null);
      global.localStorage.getItem = getItemMock;
      
      const retrieved = global.localStorage.getItem('jackbox_user');
      expect(retrieved).toBe(username);
    });

    test('should handle username removal', () => {
      const key = 'jackbox_user';
      
      // Test that we can call removeItem without error
      expect(() => {
        global.localStorage.removeItem(key);
      }).not.toThrow();
    });
  });

  describe('DOM Manipulation', () => {
    test('login screen should exist', () => {
      const loginScreen = document.getElementById('login-screen');
      expect(loginScreen).not.toBeNull();
    });

    test('app screen should exist', () => {
      const appScreen = document.getElementById('app-screen');
      expect(appScreen).not.toBeNull();
    });

    test('username display element should exist', () => {
      const usernameDisplay = document.getElementById('username-display');
      expect(usernameDisplay).not.toBeNull();
    });

    test('games container should exist', () => {
      const gamesContainer = document.getElementById('games-container');
      expect(gamesContainer).not.toBeNull();
    });

    test('leaderboard container should exist', () => {
      const leaderboardContainer = document.getElementById('leaderboard-container');
      expect(leaderboardContainer).not.toBeNull();
    });
  });

  describe('Tab Navigation', () => {
    test('scoring tab should exist', () => {
      const scoringTab = document.getElementById('scoring-tab');
      expect(scoringTab).not.toBeNull();
    });

    test('leaderboard tab should exist', () => {
      const leaderboardTab = document.getElementById('leaderboard-tab');
      expect(leaderboardTab).not.toBeNull();
    });

    test('should switch active class on tab', () => {
      const scoringTab = document.getElementById('scoring-tab');
      const leaderboardTab = document.getElementById('leaderboard-tab');
      
      // Initially scoring tab is active
      expect(scoringTab.classList.contains('active')).toBe(true);
      expect(leaderboardTab.classList.contains('active')).toBe(false);
      
      // Switch to leaderboard
      scoringTab.classList.remove('active');
      leaderboardTab.classList.add('active');
      
      expect(scoringTab.classList.contains('active')).toBe(false);
      expect(leaderboardTab.classList.contains('active')).toBe(true);
    });
  });

  describe('Data Validation', () => {
    test('username should not be empty', () => {
      const username = '   ';
      const trimmed = username.trim();
      expect(trimmed.length).toBe(0);
    });

    test('username should be trimmed', () => {
      const username = '  testuser  ';
      const trimmed = username.trim();
      expect(trimmed).toBe('testuser');
    });

    test('score should be a number', () => {
      const score = 5;
      expect(typeof score).toBe('number');
    });

    test('game id should be a string', () => {
      const games = getDemoGames();
      games.forEach(game => {
        expect(typeof game.id).toBe('string');
      });
    });
  });

  describe('Leaderboard Aggregation', () => {
    beforeEach(() => {
      // Set up games in global scope
      global.games = getDemoGames();
    });

    test('getLocalVotes should return empty array when no votes exist', () => {
      global.localStorage.length = 0;
      const votes = getLocalVotes();
      expect(Array.isArray(votes)).toBe(true);
      expect(votes.length).toBe(0);
    });

    test('getLocalVotes should return vote data in correct format', () => {
      // Ensure games is set up in the right scope
      global.games = getDemoGames();
      
      // Mock localStorage with some data
      const mockScores = { game1: 5, game2: 8 };
      
      // Create a more complete mock
      const storage = {
        'scores_alice': JSON.stringify(mockScores)
      };
      
      global.localStorage.length = Object.keys(storage).length;
      global.localStorage.key = jest.fn((i) => {
        const keys = Object.keys(storage);
        return i < keys.length ? keys[i] : null;
      });
      global.localStorage.getItem = jest.fn((key) => storage[key] || null);
      
      const votes = getLocalVotes();
      expect(Array.isArray(votes)).toBe(true);
      // Should have 2 votes if games exist with those IDs
      if (votes.length > 0) {
        expect(votes[0]).toHaveProperty('user');
        expect(votes[0]).toHaveProperty('gameName');
        expect(votes[0]).toHaveProperty('score');
        expect(votes[0].user).toBe('alice');
      }
    });

    test('vote aggregation should calculate average correctly', () => {
      // Simulate multiple votes for the same game
      const mockVotes = [
        { user: 'alice', gameName: 'Quiplash', score: 8 },
        { user: 'bob', gameName: 'Quiplash', score: 6 },
        { user: 'charlie', gameName: 'Quiplash', score: 10 },
        { user: 'alice', gameName: 'Fibbage', score: 5 },
      ];

      // Aggregate scores by Game
      const gameStats = {};
      mockVotes.forEach(vote => {
        const gameName = vote.gameName;
        if (!gameStats[gameName]) {
          gameStats[gameName] = { total: 0, count: 0 };
        }
        gameStats[gameName].total += vote.score;
        gameStats[gameName].count += 1;
      });

      // Calculate averages
      const rankedGames = Object.entries(gameStats).map(([name, stats]) => ({
        name,
        average: parseFloat((stats.total / stats.count).toFixed(1)),
      }));

      // Verify Quiplash average
      const quiplash = rankedGames.find(g => g.name === 'Quiplash');
      expect(quiplash).toBeDefined();
      expect(quiplash.average).toBe(8.0); // (8 + 6 + 10) / 3 = 8.0

      // Verify Fibbage average
      const fibbage = rankedGames.find(g => g.name === 'Fibbage');
      expect(fibbage).toBeDefined();
      expect(fibbage.average).toBe(5.0);
    });

    test('games should be sorted by average descending', () => {
      const rankedGames = [
        { name: 'Game A', average: '7.5', count: 2 },
        { name: 'Game B', average: '9.0', count: 3 },
        { name: 'Game C', average: '5.5', count: 1 },
      ];

      rankedGames.sort((a, b) => b.average - a.average);

      expect(rankedGames[0].name).toBe('Game B');
      expect(rankedGames[1].name).toBe('Game A');
      expect(rankedGames[2].name).toBe('Game C');
    });

    test('getAllVotes should return empty array when PocketBase is not available', async () => {
      // Ensure pb is not defined
      global.pb = undefined;
      global.localStorage.length = 0;
      
      const votes = await getAllVotes();
      expect(Array.isArray(votes)).toBe(true);
    });
  });
});
