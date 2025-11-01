import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import './HomePageStyles.css';
import LandingPage from './LandingPage';
import HomePage from './HomePage';
import ChatPage from './ChatPage';
import BookingPage from './BookingPage';
import StoriesPage from './StoriesPage';
import AuthPage from './AuthPage';
import { AuthProvider } from './AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/auth" element={<AuthPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
