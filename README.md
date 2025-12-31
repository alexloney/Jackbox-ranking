# Jackbox-ranking
Simple self hosted ranking for Jackbox games

I created this with the help of Copilot, this is partially a test to see how Copilot works with a project and what's required
to be done to create and use something with it.

The intention of this project is to have a simple self-hosted webpage where my friends and I could rank Jackbox games. There
is **absolutely no security** in this implementation. The database credentials are "username@example.com:username@example.com".

To deploy this website locally, you simply have to run:
```
docker-compose up
```

If you're developing/iterating locally, you may want to use the following to recreate the containers so that changes
take effect:
```
docker-compose up --force-recreate
```

When you're ready to self-host it on a website somewhere, you'll want to update the `docker-compose.yml` file to be something
like this:
```
# docker-compose up --force-recreate

version: "3.8"

services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    container_name: jackbox_pb
    restart: unless-stopped
    command:
      - --encryptionEnv=PB_ENCRYPTION_KEY
    environment:
      # WARNING: Change this to a secure random key for production use!
      # Generate a secure key with: openssl rand -hex 16
      PB_ENCRYPTION_KEY: "xxx"
      PB_ADMIN_EMAIL: "admin@example.com"
      PB_ADMIN_PASSWORD: "xxx"
    volumes:
      - /volume1/docker/pocketbase/data:/pb/pb_data
    ports:
      - "8090"

  webapp:
    image: node:18-alpine
    container_name: jackbox_web
    working_dir: /app
    # Mount your current directory directly into the container
    volumes:
      - ./:/app
    # Install http-server globally and run it
    command: sh -c "npm install -g http-server && http-server -p 3000 --cors"
    ports:
      - "3000"
    environment:
      - COUNTER=1
    depends_on:
      - pocketbase

networks:
    default:
        name: MyNetwork
        external: true
```

This will allow you to persist the PocketBase database across executions by specifying a persistent directory.
Once up and running, you can set up SWAG (or other http server setup) configuration to point to the "jackbox_web"
and "jackbox_pb" containers. Finally, you'll want to make sure you update both "index.html" and "seed.html" to
set the domain the correct domain instead of "127.0.0.1".

And that should be all there is to it to get it deployed. You can access PocketBase from the web to manually manage
it if needed, which is useful for initial setup to set the containers up. You'll access and use "seed.html" once
to see the database with information, then it should be usable.

## Features

- 🎮 Simple name-based login with automatic PocketBase authentication
- 📱 Mobile-friendly responsive design with optimized card layout
- 🎯 Score tracking for Jackbox games (1-5 star scale)
- 💬 Expandable comment sections for each game
- 🏆 Real-time leaderboard with vote aggregation
- 💾 PocketBase backend for data persistence
- 🔐 Secure authentication with user-specific score permissions
- 🌙 Dark mode support with persistent preference
- ✅ Comprehensive unit tests with Jest
- 🔄 CI/CD with GitHub Actions

## Quick Start

### Configuration

The backend URL can be configured by editing the `JACKBOX_CONFIG` object in `index.html` and `seed.html`:

```html
<script>
    window.JACKBOX_CONFIG = {
        backendUrl: 'http://127.0.0.1:8090'  // Change this for deployment
    };
</script>
```

For production deployment, change the `backendUrl` to your PocketBase server URL (e.g., `'https://your-domain.com'`).

### Prerequisites

**PocketBase Backend Required:** This application requires a running PocketBase instance to function. It does not work in offline mode.

1. **Download and install PocketBase** from https://pocketbase.io/

2. **Start PocketBase server:**
   ```bash
   ./pocketbase serve
   ```

3. **Configure the database** (via PocketBase Admin UI at http://127.0.0.1:8090/_/):
   
   Create three collections:
   
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
   - `score` (number, required, min: 0, max: 5)
   - List Rule: `""` (public read for leaderboard)
   - View Rule: `""` (public read)
   - Create Rule: `@request.auth.id != '' && @request.auth.id = user`
   - Update Rule: `@request.auth.id != '' && @request.auth.id = user`

   **Collection: `comments`**
   - `comment` (text, required - max 500 characters recommended)
   - `user` (relation to users collection, required)
   - `game` (relation to games collection, required)
   - `created` (autodate - set onCreate: true, onUpdate: false)
   - List Rule: `""` (public read)
   - View Rule: `""` (public read)
   - Create Rule: `@request.auth.id != ''` (authenticated users can create)
   - Delete Rule: `@request.auth.id != '' && @request.auth.id = user` (users can delete their own comments)

   Note: The database schema is available in `db/pb_schema.json` which can be imported via the PocketBase admin UI.

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
2. **Score Games:** Click on stars to rate games (1-5 stars, or leave unrated)
3. **View Comments:** Click the dropdown arrow on any game card to expand the comment section
4. **Add Comments:** Type your comment in the text field and click "Post Comment"
5. **View Leaderboard:** Tap the Leaderboard tab to see average scores from all users (unrated games are excluded from averages)
6. **Toggle Dark Mode:** Click the moon/sun icon in the header to switch themes
7. **Seed Database:** Use `seed.html` to populate the database with initial games

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
