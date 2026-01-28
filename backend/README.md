# Lost & Found Backend

MongoDB-based backend for MCC Lost & Found application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start MongoDB locally or update MONGODB_URI in .env

3. Run the server:
```bash
npm run dev
```

## API Endpoints

- POST /api/auth/login - User login
- POST /api/auth/register - User registration
- GET /api/items - Get all items
- POST /api/items - Create new item (auth required)
- PUT /api/items/:id - Update item (auth required)