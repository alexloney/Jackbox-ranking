# Jackbox Ranking
Simple web application for ranking Jackbox games

## Setup
Simply copy the `.env.example` file to `.env` and update the details in it, then run:

```
docker-compose up -d --build
```

It should be hosted at:
* Web Application: http://localhost:8080
* phpMyAdmin: http://localhost:8081
* MySQL Database: localhost:3306 (for external tools)

## Development Workflow
You can use VS Code to edit the files in the src/ directory directly, no need to restart Docker. For a production release, you'll want to build the src/ directory into the Docker container.
