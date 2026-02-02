# Migration Summary: PocketBase to SQLite Single Container

## Overview
Successfully migrated the Jackbox Ranking application from a dual-container setup (PocketBase + static server) to a single-container Node.js application with SQLite database.

## What Changed

### Backend
- **Old**: PocketBase (separate container) on port 8090
- **New**: Express.js with SQLite on port 3000
- **Database**: SQLite with better-sqlite3 (file-based at `data/jackbox.db`)
- **Authentication**: Token-based sessions (in-memory store)

### Frontend
- **Old**: PocketBase SDK (pocketbase.umd.js)
- **New**: Fetch API with REST endpoints
- **No changes to UI** - same user experience

### Docker
- **Old**: 2 containers (pocketbase + webapp)
- **New**: 1 container (jackbox-ranking)
- **Simplified** deployment and networking

## Files Modified

### New Files
- `server.js` - Express backend with SQLite
- `Dockerfile` - Single container build

### Updated Files
- `app.js` - REST API client instead of PocketBase SDK
- `index.html` - Removed PocketBase SDK, updated config
- `seed.html` - REST API client for seeding
- `docker-compose.yml` - Single service configuration
- `package.json` - Added backend dependencies and scripts
- `README.md` - Updated documentation
- `.gitignore` - Added data/ and *.backup

## Security Improvements

### Rate Limiting
- Auth endpoints: 5 requests per 15 minutes
- API endpoints: 100 requests per 15 minutes

### File Protection
- Blocked access to sensitive files (server.js, package.json, etc.)
- Blocked access to directories (node_modules, data, .git, etc.)
- Hidden files (dotfiles) are denied

## Testing Performed

✅ Health endpoint
✅ User authentication (login/logout)
✅ Games CRUD operations
✅ Scores CRUD operations
✅ Comments CRUD operations
✅ File access protection
✅ Rate limiting configuration

## Deployment

### Local Development
```bash
npm install
npm start
# Access at http://localhost:3000
```

### Docker
```bash
docker-compose up
# Access at http://localhost:3000
```

### Production
Update `docker-compose.yml` to use persistent volume:
```yaml
volumes:
  - /path/to/persistent/data:/app/data
```

Update `backendUrl` in `index.html` and `seed.html` to production URL.

## Database Schema

SQLite tables created automatically on first run:
- **users**: id, email, name, created, updated
- **games**: id, name, pack, img, created, updated
- **scores**: id, user, game, score, created, updated
- **comments**: id, comment, user, game, created, updated

## API Endpoints

### Authentication
- POST `/api/auth/login` - Login or create user
- POST `/api/auth/logout` - Logout
- GET `/api/auth/verify` - Verify token

### Games
- GET `/api/games` - List all games
- POST `/api/games` - Create game (auth required)

### Scores
- GET `/api/scores?user=X&game=Y` - List scores
- POST `/api/scores` - Create/update score (auth required)

### Comments
- GET `/api/comments?game=X` - List comments
- POST `/api/comments` - Create comment (auth required)
- DELETE `/api/comments/:id` - Delete comment (auth required, owner only)

## Migration Benefits

1. **Simplified Architecture**: Single container vs. two
2. **Easier Deployment**: No external database service needed
3. **Better Performance**: No network overhead between containers
4. **Easier Development**: Single process to run
5. **Cost Effective**: Fewer resources needed
6. **More Control**: Direct database access and schema management
7. **Better Security**: Rate limiting and file protection built-in

## Known Limitations

1. **No Real-time Updates**: Removed PocketBase real-time subscriptions (can be added with WebSockets if needed)
2. **In-Memory Sessions**: Session tokens stored in memory (will be lost on restart)
3. **File-based Database**: SQLite is file-based (fine for self-hosted, not ideal for high concurrency)
4. **No Admin UI**: No PocketBase admin interface (database management requires SQL tools)

## Future Enhancements

1. Add WebSocket support for real-time updates
2. Implement JWT tokens for better session management
3. Add database migrations system
4. Add admin API for game management
5. Implement persistent session storage (Redis/file-based)
6. Add API documentation (Swagger/OpenAPI)
7. Add health checks and metrics

## Rollback Plan

If needed to rollback to PocketBase:
1. Restore `.backup` files: `mv app.js.backup app.js` etc.
2. Revert `docker-compose.yml` from git history
3. Export data from SQLite and import to PocketBase
4. Update configuration URLs back to port 8090
