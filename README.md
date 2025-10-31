# Full Stack React + Node.js Application

A complete full-stack application with separate frontend and backend.

## Project Structure

```
letsgo/
├── backend/          # Node.js + Express API server
│   ├── server.js     # Main server file
│   ├── package.json  # Backend dependencies
│   ├── .env          # Environment variables
│   └── README.md     # Backend documentation
│
├── frontend/         # React application
│   ├── public/       # Static files
│   ├── src/          # React source code
│   ├── package.json  # Frontend dependencies
│   └── README.md     # Frontend documentation
│
└── README.md         # This file
```

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup Instructions

#### Option 1: Run Both Servers Together (Recommended)

From the root directory:

```bash
# Install dependencies for both frontend and backend
npm run install-all

# Install concurrently (if not done)
npm install

# Run both servers simultaneously
npm run dev
```

#### Option 2: Run Servers Separately

**Backend Server:**

```bash
cd backend
npm install
npm run dev
```

The backend server will start at **http://localhost:5000**

**Frontend Server:**

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

The React app will open at **http://localhost:3000**

## How Frontend & Backend Connect

The frontend and backend are connected through:

1. **Proxy Configuration**: The frontend's `package.json` includes `"proxy": "http://localhost:5000"` which automatically forwards API requests from the React dev server to the backend.

2. **CORS**: The backend has CORS enabled to allow cross-origin requests.

3. **Port Configuration**:
   - Backend: `http://localhost:5000` (configured in `.env`)
   - Frontend: `http://localhost:3000` (React default)

4. **API Calls**: The frontend uses Axios to make requests to `/api/*` endpoints, which are automatically proxied to `http://localhost:5000/api/*`

**Important**: Both servers MUST be running for the app to work properly!

## Running Both Servers

You need to run both servers simultaneously:

1. **Terminal 1** (Backend):
   ```bash
   cd backend
   npm run dev
   ```

2. **Terminal 2** (Frontend):
   ```bash
   cd frontend
   npm start
   ```

## Features

### Backend (Port 5000)
- ✅ Express.js REST API
- ✅ CORS enabled
- ✅ Environment variables support
- ✅ Sample endpoints for data management
- ✅ Error handling middleware

### Frontend (Port 3000)
- ✅ React 18
- ✅ Modern UI with responsive design
- ✅ API integration with Axios
- ✅ Server health monitoring
- ✅ Data fetching and display

## API Endpoints

- `GET /api/health` - Check server status
- `GET /api/data` - Get all data
- `POST /api/data` - Create new data

## Tech Stack

### Frontend
- React
- Axios
- CSS3

### Backend
- Node.js
- Express.js
- CORS
- dotenv

## Development

- Backend uses **nodemon** for auto-reload on file changes
- Frontend uses **React Scripts** with hot reload
- Proxy configured in frontend to connect to backend API

## Next Steps

- Add database (MongoDB, PostgreSQL, etc.)
- Implement authentication (JWT, OAuth)
- Add more API endpoints
- Create more React components
- Add state management (Redux, Context API)
- Write tests
- Deploy to production

## Troubleshooting

**Connection Issues:**
- Ensure BOTH backend (port 5000) and frontend (port 3000) servers are running
- Verify the proxy setting in `frontend/package.json` matches the backend port
- Check that the backend `.env` file has `PORT=5000`

**Port Already in Use:**
- Backend: Change `PORT` in `backend/.env` and update proxy in `frontend/package.json`
- Frontend: React will prompt to use a different port automatically

**CORS Errors:**
- Ensure backend server is running before starting frontend
- Verify CORS is enabled in `backend/server.js`
- Clear browser cache and restart both servers

**"Failed to fetch data" Error:**
- Check backend server is running: Visit `http://localhost:5000/api/health`
- Check console for detailed error messages
- Ensure backend dependencies are installed: `cd backend && npm install`

**Proxy Not Working:**
- After changing proxy settings, restart the frontend server
- Make sure you're using relative URLs in API calls (e.g., `/api/data` not `http://localhost:5000/api/data`)

## License

MIT
