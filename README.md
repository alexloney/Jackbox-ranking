# Jackbox-ranking
Simple self hosted ranking for Jackbox games

## Features

- 🎮 Simple name-based login with automatic PocketBase authentication
- 📱 Mobile-friendly responsive design
- 🎯 Score tracking for Jackbox games (0-10 scale)
- 🏆 Real-time leaderboard with vote aggregation
- 💾 PocketBase backend for data persistence
- 🔐 Secure authentication with user-specific score permissions
- 🌙 Dark mode support with persistent preference
- ✅ Comprehensive unit tests with Jest
- 🔄 CI/CD with GitHub Actions

## Quick Start

### Prerequisites

**PocketBase Backend Required:** This application requires a running PocketBase instance to function. It does not work in offline mode.

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

4. **Seed the database** (Optional - first time setup):
   
   Open `seed.html` in your browser to populate the database with initial Jackbox games from Party Pack 1:
   ```bash
   npm run serve
   # Then navigate to http://localhost:8080/seed.html
   ```
   
   This will add the following games:
   - You Don't Know Jack 2015
   - Drawful
   - Word Spud
   - Fibbage XL
   - Lie Swatter

5. **Run the app:**
   ```bash
   npm install
   npm run serve
   ```

6. **Login:** Enter your name - the app will automatically:
   - Create a PocketBase user with email `lower(name)@example.com`
   - Authenticate you and sync scores to the database
   - Allow you to start ranking games

The app will connect to PocketBase at `http://127.0.0.1:8090` and sync scores in real-time.

## Dark Mode

The application includes a dark mode toggle:
- Click the moon/sun icon in the header to toggle between light and dark themes
- Your preference is automatically saved in localStorage
- Dark mode provides reduced eye strain in low-light environments

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
├── seed.html            # Database seeding utility
├── styles.css           # CSS styles (mobile-first responsive with dark mode)
├── app.js               # Core application logic
├── __tests__/           # Unit tests
│   └── app.test.js
├── .github/
│   └── workflows/
│       └── ci.yml       # GitHub Actions CI configuration
└── package.json         # NPM dependencies and scripts
```

## Usage

1. **Login:** Enter your name and click Login (requires PocketBase to be running)
2. **Score Games:** Use the + and - buttons to adjust scores (0-10 range)
3. **View Leaderboard:** Tap the Leaderboard tab to see average scores from all users
4. **Toggle Dark Mode:** Click the moon/sun icon in the header to switch themes
5. **Seed Database:** Use `seed.html` to populate the database with initial games

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
