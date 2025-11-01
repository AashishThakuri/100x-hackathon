import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ThreeDImageRing from './components/ThreeDvideoRing';

function HomePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate('/chat', { state: { initialQuery: searchQuery } });
    }
  };

  const handleVoiceSearch = () => {
    navigate('/chat');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
    setShowProfileMenu(false);
  };

  // Video files for the 3D carousel
  const videoFiles = [
    '/assets/vid2 (1).mp4',
    '/assets/vid4.mp4',
    '/assets/vid5.mp4',
    '/assets/vid6.mp4',
    '/assets/vid7.mp4',
    '/assets/vid9.mp4',
    '/assets/vid10.mp4',
    '/assets/vid11.mp4',
    '/assets/vid1.mp4',
    '/assets/Untitled video - Made with Clipchamp (1).mp4',
    '/assets/Untitled video - Made with Clipchamp (4).mp4',
    '/assets/Untitled video - Made with Clipchamp (6).mp4',
    '/assets/Untitled video - Made with Clipchamp (7).mp4',
    '/assets/Untitled video - Made with Clipchamp.mp4',
  ];

  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="home-brand">
          <span className="nepal">Nepal</span> <span className="connect">Connect</span>
        </div>
        <div className="home-nav-links">
          <Link to="/home">Homepage</Link>
          <a href="#business">List Your Business</a>
          <Link to="/stories">Stories</Link>
        </div>
        <div className="home-nav-profile">
          <div className="profile-dropdown">
            <button 
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
            {showProfileMenu && (
              <div className="profile-menu">
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="home-hero">
        <h1 className="home-title">
          Your Journey to Nepal<br />
          Starts Here
        </h1>

        <p className="home-subtitle">
          Your complete Nepal adventure awaits dream plan and explore effortlessly<br />
          Instant confirmations, Pay when ready, Transparent pricing always<br />
          From Himalayan peaks to ancient temples experience it all with us
        </p>

        <form className="home-search-box" onSubmit={handleSearch}>
          <input 
            type="text" 
            className="home-search-input" 
            placeholder="Where are you going?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="button" className="home-voice-btn" onClick={handleVoiceSearch}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button type="submit" className="home-search-btn">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

        <div className="home-carousel-3d">
          <ThreeDImageRing
            videos={videoFiles}
            width={280}
            perspective={2000}
            imageDistance={900}
            initialRotation={180}
            animationDuration={1.5}
            staggerDelay={0.1}
            hoverOpacity={0.5}
            backgroundColor="transparent"
            draggable={true}
            mobileBreakpoint={768}
            mobileScaleFactor={0.7}
            inertiaPower={0.8}
            inertiaTimeConstant={300}
            inertiaVelocityMultiplier={20}
            containerClassName="ring-container"
            imageClassName="ring-image"
          />
        </div>

      </div>
    </div>
  );
}

export default HomePage;
