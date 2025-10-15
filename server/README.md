# Furniture Backend (Express + MongoDB)

This is a minimal Express + MongoDB backend scaffold for the Furniture Stock Management app.

## Setup

1. Copy `.env.example` to `.env` and set `MONGO_URI` and `JWT_SECRET`.

2. Install dependencies:

```powershell
cd server
npm install
```

3. Start the server:

```powershell
npm run dev
# or
npm start
```

Notes:
- For multi-document ACID transactions in MongoDB (used by the batch order endpoint), MongoDB must be run as a replica set (or use MongoDB Atlas). For local development you can initiate a single-node replica set.
- The API exposes:
  - POST /api/auth/login
  - GET /api/items, POST /api/items
  - POST /api/orders/batch
  - GET /api/orders

You can wire the frontend to hit these endpoints instead of using the in-browser `FurnitureDB` module. If you want, I can also add migration scripts to import the current in-browser data to MongoDB.
