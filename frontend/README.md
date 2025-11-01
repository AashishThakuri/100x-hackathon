# Frontend React App

React frontend application that connects to the Node.js backend.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Features

- Fetches data from backend API
- Displays server health status
- Add new items functionality
- Responsive design
- Modern UI with gradient colors

## API Integration

- API calls use a development proxy defined in `src/setupProxy.js` (Create React App convention). Use relative URLs like `/api/chat` or `/api/plan-trip` and the dev server will forward them to `http://localhost:5000`.
- Make sure the backend server is running before starting the frontend.

## Avoid Live Server (fixes reload.js and WS errors)

If you see errors like `reload.js WebSocket connection to ws://127.0.0.1:5500//ws failed` or `net::ERR_NAME_NOT_RESOLVED`, it means the page was opened with "Live Server" or static file serving. This app must be run with the React dev server:

```powershell
cd frontend
npm start
```

Opening `public/index.html` directly or with Live Server injects a `reload.js` script that tries to connect to port 5500 and causes those errors.

## About Google Sign‑in console warnings

You may see warnings like `Cross-Origin-Opener-Policy policy would block the window.closed call` coming from `popup.ts` during Google sign-in. These are benign Chrome warnings related to popup isolation and do not affect sign-in success. We do not set any COOP/COEP headers in the backend.

## Tech Stack

- React 18
- Axios for API calls
- CSS3 with modern features
- Proxy configuration for API calls
