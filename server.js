const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Initialize SQLite database
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'jackbox.db');
const dbDir = path.dirname(dbPath);

// Create data directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Create tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        created TEXT DEFAULT CURRENT_TIMESTAMP,
        updated TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pack TEXT,
        img TEXT,
        created TEXT DEFAULT CURRENT_TIMESTAMP,
        updated TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scores (
        id TEXT PRIMARY KEY,
        user TEXT NOT NULL,
        game TEXT NOT NULL,
        score REAL,
        created TEXT DEFAULT CURRENT_TIMESTAMP,
        updated TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user) REFERENCES users(id),
        FOREIGN KEY (game) REFERENCES games(id),
        UNIQUE(user, game)
    );

    CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        comment TEXT NOT NULL,
        user TEXT NOT NULL,
        game TEXT NOT NULL,
        created TEXT DEFAULT CURRENT_TIMESTAMP,
        updated TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user) REFERENCES users(id),
        FOREIGN KEY (game) REFERENCES games(id)
    );

    CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user);
    CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game);
    CREATE INDEX IF NOT EXISTS idx_comments_game ON comments(game);
    CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user);
`);

// Helper function to generate ID
function generateId() {
    return crypto.randomBytes(8).toString('hex').substring(0, 15);
}

// Helper function to get current timestamp
function getCurrentTimestamp() {
    return new Date().toISOString();
}

// In-memory session store (simple implementation)
const sessions = new Map();

// Middleware to check authentication
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const session = sessions.get(token);
    
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.userId = session.userId;
    req.userEmail = session.email;
    next();
}

// API Routes

// Authentication
app.post('/api/auth/login', (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Check if user exists
        let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        
        // Create user if doesn't exist
        if (!user) {
            const userId = generateId();
            const username = email.split('@')[0];
            
            db.prepare(`
                INSERT INTO users (id, email, name, created, updated)
                VALUES (?, ?, ?, ?, ?)
            `).run(userId, email, username, getCurrentTimestamp(), getCurrentTimestamp());
            
            user = { id: userId, email, name: username };
        }

        // Create session token
        const token = crypto.randomBytes(32).toString('hex');
        sessions.set(token, {
            userId: user.id,
            email: user.email,
            createdAt: Date.now()
        });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to authenticate' });
    }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);
    sessions.delete(token);
    res.json({ success: true });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.userId);
    res.json({ user });
});

// Games
app.get('/api/games', (req, res) => {
    try {
        const games = db.prepare('SELECT * FROM games ORDER BY name').all();
        res.json({ items: games });
    } catch (error) {
        console.error('Get games error:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

app.post('/api/games', requireAuth, (req, res) => {
    const { name, pack, img } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    try {
        const gameId = generateId();
        const timestamp = getCurrentTimestamp();
        
        db.prepare(`
            INSERT INTO games (id, name, pack, img, created, updated)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(gameId, name, pack || null, img || null, timestamp, timestamp);
        
        const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
        res.json(game);
    } catch (error) {
        console.error('Create game error:', error);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Scores
app.get('/api/scores', (req, res) => {
    try {
        const { user, game } = req.query;
        let query = 'SELECT * FROM scores';
        const params = [];
        const conditions = [];

        if (user) {
            conditions.push('user = ?');
            params.push(user);
        }
        if (game) {
            conditions.push('game = ?');
            params.push(game);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const scores = db.prepare(query).all(...params);
        res.json({ items: scores });
    } catch (error) {
        console.error('Get scores error:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});

app.post('/api/scores', requireAuth, (req, res) => {
    const { game, score } = req.body;
    
    if (!game) {
        return res.status(400).json({ error: 'Game is required' });
    }

    try {
        // Check if score already exists
        const existingScore = db.prepare('SELECT * FROM scores WHERE user = ? AND game = ?')
            .get(req.userId, game);

        let result;
        const timestamp = getCurrentTimestamp();

        if (existingScore) {
            // Update existing score
            db.prepare(`
                UPDATE scores 
                SET score = ?, updated = ?
                WHERE id = ?
            `).run(score, timestamp, existingScore.id);
            
            result = db.prepare('SELECT * FROM scores WHERE id = ?').get(existingScore.id);
        } else {
            // Create new score
            const scoreId = generateId();
            db.prepare(`
                INSERT INTO scores (id, user, game, score, created, updated)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(scoreId, req.userId, game, score, timestamp, timestamp);
            
            result = db.prepare('SELECT * FROM scores WHERE id = ?').get(scoreId);
        }

        res.json(result);
    } catch (error) {
        console.error('Save score error:', error);
        res.status(500).json({ error: 'Failed to save score' });
    }
});

// Comments
app.get('/api/comments', (req, res) => {
    try {
        const { game } = req.query;
        let query = `
            SELECT c.*, u.name as userName, u.email as userEmail 
            FROM comments c
            JOIN users u ON c.user = u.id
        `;
        const params = [];

        if (game) {
            query += ' WHERE c.game = ?';
            params.push(game);
        }

        query += ' ORDER BY c.created DESC';

        const comments = db.prepare(query).all(...params);
        
        // Format comments to match PocketBase expand structure
        const formattedComments = comments.map(c => ({
            id: c.id,
            comment: c.comment,
            user: c.user,
            game: c.game,
            created: c.created,
            updated: c.updated,
            expand: {
                user: {
                    id: c.user,
                    name: c.userName,
                    email: c.userEmail
                }
            }
        }));

        res.json({ items: formattedComments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

app.post('/api/comments', requireAuth, (req, res) => {
    const { game, comment } = req.body;
    
    if (!game || !comment) {
        return res.status(400).json({ error: 'Game and comment are required' });
    }

    try {
        const commentId = generateId();
        const timestamp = getCurrentTimestamp();
        
        db.prepare(`
            INSERT INTO comments (id, comment, user, game, created, updated)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(commentId, comment, req.userId, game, timestamp, timestamp);
        
        // Get the created comment with user info
        const result = db.prepare(`
            SELECT c.*, u.name as userName, u.email as userEmail 
            FROM comments c
            JOIN users u ON c.user = u.id
            WHERE c.id = ?
        `).get(commentId);

        // Format to match PocketBase expand structure
        const formattedComment = {
            id: result.id,
            comment: result.comment,
            user: result.user,
            game: result.game,
            created: result.created,
            updated: result.updated,
            expand: {
                user: {
                    id: result.user,
                    name: result.userName,
                    email: result.userEmail
                }
            }
        };

        res.json(formattedComment);
    } catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ error: 'Failed to create comment' });
    }
});

app.delete('/api/comments/:id', requireAuth, (req, res) => {
    const { id } = req.params;
    
    try {
        // Check if comment exists and belongs to user
        const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
        
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.user !== req.userId) {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }

        db.prepare('DELETE FROM comments WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing database...');
    db.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, closing database...');
    db.close();
    process.exit(0);
});
