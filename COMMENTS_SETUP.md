# Comments Collection Setup Guide

## Overview
This document describes the structure of the `comments` collection that needs to be created in PocketBase for the comment functionality to work.

## PocketBase Collection Structure

### Collection Name: `comments`

#### Fields:

1. **id** (text, system field)
   - Auto-generated 15-character ID
   - Pattern: `^[a-z0-9]+$`
   - Primary Key
   - System field (auto-managed)

2. **comment** (text, required)
   - The comment text content
   - Required field
   - Recommended: Set max length to 500 characters
   - User input will be sanitized to prevent XSS

3. **user** (relation, required)
   - Relation to the `users` collection
   - Single select (maxSelect: 1)
   - Required field
   - References the user who created the comment

4. **game** (relation, required)
   - Relation to the `games` collection
   - Single select (maxSelect: 1)
   - Required field
   - References the game this comment is about

5. **created** (autodate)
   - Auto-generated timestamp
   - Set on creation: `onCreate: true`
   - Not updated: `onUpdate: false`
   - Used for sorting comments (newest first)

6. **updated** (autodate, optional)
   - Auto-generated timestamp
   - Set on creation and update
   - System field (auto-managed)

#### API Rules:

- **List Rule**: `""` (public read - anyone can view comments)
- **View Rule**: `""` (public read - anyone can view individual comments)
- **Create Rule**: `@request.auth.id != ''` (authenticated users only)
- **Update Rule**: `""` (no updates allowed - comments are immutable)
- **Delete Rule**: `@request.auth.id != '' && @request.auth.id = user` (users can delete their own comments)

## Creating the Collection

### Option 1: Via PocketBase Admin UI

1. Access PocketBase Admin UI at `http://127.0.0.1:8090/_/`
2. Navigate to Collections
3. Click "New Collection"
4. Name it `comments`
5. Add fields as described above:
   - Add text field "comment" (required)
   - Add relation field "user" pointing to users collection (required, single)
   - Add relation field "game" pointing to games collection (required, single)
6. Set the API rules as specified
7. Save the collection

### Option 2: Import Schema

The complete schema is available in `db/pb_schema.json`. You can import this file via the PocketBase admin UI:

1. Access PocketBase Admin UI
2. Go to Settings > Import collections
3. Select the `db/pb_schema.json` file
4. Confirm the import

## Usage in the Application

Once the collection is set up, the comment feature will:

1. **Display Comments**: Comments are loaded when a user clicks the dropdown arrow on a game card
2. **Sort Order**: Comments are displayed from newest to oldest (based on the `created` field)
3. **Post Comments**: Authenticated users can post comments via the text input field
4. **User Attribution**: Each comment shows the username (extracted from email) and timestamp
5. **Security**: All comment text is escaped to prevent XSS attacks

## Testing the Setup

To verify the comments collection is set up correctly:

1. Log in to the application
2. Click on any game card's dropdown arrow
3. Try posting a comment
4. Verify the comment appears in the list
5. Refresh the page and check that comments persist
6. Try posting comments from multiple users to verify the attribution

## Schema Export

The complete schema for the comments collection is included in this repository at `db/pb_schema.json`. The relevant section for the comments collection starts with:

```json
{
  "id": "pbc_3456789012",
  "name": "comments",
  "type": "base",
  ...
}
```

This can be used as a reference when creating the collection manually or for importing into PocketBase.
