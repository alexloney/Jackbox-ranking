# Jackbox-ranking
Simple self hosted ranking for Jackbox games

I created this with the help of Copilot, this is partially a test to see how Copilot works with a project and what's required
to be done to create and use something with it.

The intention of this project is to have a simple self-hosted webpage where my friends and I could rank Jackbox games. There
is **absolutely no security** in this implementation. The database credentials are "username@example.com:username@example.com".

## Quick Start

### Docker Deployment (Recommended)

To deploy this website locally using Docker, simply run:
```bash
docker-compose up
```

If you're developing/iterating locally, you may want to use the following to rebuild and recreate the containers so that changes take effect:
```bash
docker-compose up --build --force-recreate
```

The application will be available at `http://localhost:3000`.

### Local Development (Without Docker)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Access the application:**
   Open your browser to `http://localhost:3000`

## Production Deployment

For production deployment, update the `docker-compose.yml` file:

```yaml
version: "3.8"

services:
  jackbox-ranking:
    build: .
    container_name: jackbox_app
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      # Persist database - change this to your preferred location
      - /path/to/your/data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_PATH=/app/data/jackbox.db
```

**Important:** 
- Update the volume path to persist your database across container restarts
- The application is configured to use relative URLs by default, which works when served from the same origin
- If deploying behind a reverse proxy (nginx, traefik, etc.), the app is configured to trust proxy headers
- Consider setting up a reverse proxy for HTTPS

## Features

- 🎮 Simple name-based login with automatic user creation
- 📱 Mobile-friendly responsive design with optimized card layout
- 🎯 Score tracking for Jackbox games (1-5 star scale)
- 💬 Expandable comment sections for each game
- 🏆 Real-time leaderboard with vote aggregation
- 💾 SQLite database for data persistence
- 🔐 Token-based authentication with user-specific score permissions
- 🌙 Dark mode support with persistent preference
- ✅ Comprehensive unit tests with Jest
- 🔄 CI/CD with GitHub Actions
- 🐳 Single-container Docker deployment

## Configuration

### Backend URL Configuration

The application is configured to use relative URLs by default, which is recommended for production deployments:

```html
<script>
    window.JACKBOX_CONFIG = {
        // Empty string uses current origin (recommended for production)
        backendUrl: ''
    };
</script>
```

**For local development** with a separate backend server, you can specify the full URL:
```html
<script>
    window.JACKBOX_CONFIG = {
        backendUrl: 'http://localhost:3000'
    };
</script>
```

### Reverse Proxy Support

The application is configured with `trust proxy` enabled in Express, allowing it to work correctly behind reverse proxies like nginx or traefik. This ensures:
- Proper rate limiting based on client IP
- Correct handling of X-Forwarded-For headers
- Support for HTTPS termination at the proxy level

## Database Seeding

To populate the database with Jackbox games:

1. **Login first** via `index.html` with any username
2. **Navigate to** `seed.html` in your browser
3. **Click the "Seed Database" button**

This will add all Jackbox games from Party Packs 1-11, The Naughty Pack, and standalone games.

## Usage

1. **Login:** Enter your name and click Login
2. **Score Games:** Click on stars to rate games (1-5 stars, or leave unrated)
3. **View Comments:** Click the dropdown arrow on any game card to expand the comment section
4. **Add Comments:** Type your comment in the text field and click "Post Comment"
5. **View Leaderboard:** Tap the Leaderboard tab to see average scores from all users (unrated games are excluded from averages)
6. **Toggle Dark Mode:** Click the moon/sun icon in the header to switch themes

## Technology Stack

- **Frontend:** Vanilla JavaScript (ES6+), CSS3 with CSS Variables
- **Backend:** Node.js with Express.js
- **Database:** SQLite with better-sqlite3
- **Testing:** Jest for unit testing
- **CI/CD:** GitHub Actions
- **Deployment:** Docker & Docker Compose

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Project Structure

```
.
├── server.js            # Express backend with SQLite
├── index.html           # Main HTML file
├── seed.html            # Database seeding utility
├── styles.css           # CSS styles (mobile-first responsive with dark mode)
├── app.js               # Frontend application logic
├── __tests__/           # Unit tests
│   └── app.test.js
├── .github/
│   └── workflows/
│       └── ci.yml       # GitHub Actions CI configuration
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── data/                # SQLite database storage (git-ignored)
└── package.json         # NPM dependencies and scripts
```

## API Endpoints

The backend provides the following REST API endpoints:

### Authentication
- `POST /api/auth/login` - Login/create user
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verify authentication token

### Games
- `GET /api/games` - Get all games
- `POST /api/games` - Create a new game (requires auth)

### Scores
- `GET /api/scores` - Get all scores (optional query params: `user`, `game`)
- `POST /api/scores` - Create/update a score (requires auth)

### Comments
- `GET /api/comments` - Get comments (optional query param: `game`)
- `POST /api/comments` - Create a comment (requires auth)
- `DELETE /api/comments/:id` - Delete a comment (requires auth, owner only)

### Health
- `GET /api/health` - Health check endpoint

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT
