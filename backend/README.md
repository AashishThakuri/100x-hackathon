# Backend API

Node.js/Express backend server.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
- Copy `.env` file and update as needed
- Default port is 5000

3. Run the server:

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

## API Endpoints

- `GET /` - Welcome message
- `GET /api/health` - Health check
- `GET /api/data` - Get sample data
- `POST /api/data` - Create new data

## Tech Stack

- Node.js
- Express.js
- CORS enabled
- dotenv for environment variables
