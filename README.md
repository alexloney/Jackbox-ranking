# Jackbox-ranking
Simple self hosted ranking for Jackbox games

## Features

- 🎮 Simple name-based login with automatic PocketBase authentication
- 📱 Mobile-friendly responsive design
- 🎯 Score tracking for Jackbox games (0-10 scale)
- 🏆 Real-time leaderboard with vote aggregation
- 💾 PocketBase backend support with automatic user creation and game seeding
- 🔐 Secure authentication with user-specific score permissions
- ✅ Comprehensive unit tests with Jest
- 🔄 CI/CD with GitHub Actions

## Quick Start

### Frontend Only (No Backend)

The app works standalone with localStorage. Just open `index.html` in a browser or use a simple HTTP server:

```bash
# Install dependencies
npm install

# Run development server
npm run serve

# Open http://localhost:8080 in your browser
```

### With PocketBase Backend

1. **Download and install PocketBase** from https://pocketbase.io/

2. **Start PocketBase server:**
   ```bash
   ./pocketbase serve
   ```

3. **Configure the database** (via PocketBase Admin UI at http://127.0.0.1:8090/_/):
   
   Create two collections:
   
   **Collection: `games`**
   - `name` (text, required)
   - `pack` (text, optional - Party Pack name)
   - `img` (url, optional - URL to game image)
   - List Rule: `""` (public read)
   - View Rule: `""` (public read)
   - Create Rule: `@request.auth.id != ""` (authenticated users)

   **Collection: `scores`**
   - `user` (relation to users collection, required)
   - `game` (relation to games collection, required)
   - `score` (number, required, min: 0, max: 10)
   - List Rule: `""` (public read for leaderboard)
   - View Rule: `""` (public read)
   - Create Rule: `@request.auth.id != '' && @request.auth.id = user`
   - Update Rule: `@request.auth.id != '' && @request.auth.id = user`

4. **Run the app:**
   ```bash
   npm run serve
   ```

5. **Login:** Enter your name - the app will automatically:
   - Create a PocketBase user with email `lower(name)@example.com`
   - Seed the games collection with initial Party Pack 1 games (if empty)
   - Authenticate you and sync scores to the database

The app will automatically connect to PocketBase at `http://127.0.0.1:8090` and sync scores in real-time.

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
├── index.html           # Main HTML file
├── styles.css           # CSS styles (mobile-first responsive)
├── app.js               # Core application logic
├── __tests__/           # Unit tests
│   └── app.test.js
├── .github/
│   └── workflows/
│       └── ci.yml       # GitHub Actions CI configuration
└── package.json         # NPM dependencies and scripts
```

## Usage

1. **Login:** Enter your name and click Login
2. **Score Games:** Use the + and - buttons to adjust scores (0-10 range)
3. **View Leaderboard:** Tap the Leaderboard tab to see sorted scores from all users

## Technology Stack

- Vanilla JavaScript (ES6+)
- CSS3 with CSS Variables
- PocketBase SDK for backend (optional)
- Jest for unit testing
- GitHub Actions for CI/CD

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT
