import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './DashboardPageStyles.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
    setShowProfileMenu(false);
  };

  // Mock user data - in real app this would come from backend
  const userData = {
    name: currentUser?.displayName || 'Travel Explorer',
    email: currentUser?.email || 'explorer@nepalconnect.com',
    avatar: currentUser?.photoURL || null,
    joinDate: 'March 2024',
    totalTrips: 1,
    savedPlaces: 4,
    reviewsWritten: 8,
    storiesShared: 5
  };

  const recentActivities = [
    { 
      id: 1, 
      type: 'trip', 
      title: 'Completed Everest Base Camp Trek', 
      date: '2 days ago', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 20h18l-9-18-9 18z"/>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      )
    },
    { 
      id: 2, 
      type: 'review', 
      title: 'Reviewed Hotel Yak & Yeti Kathmandu', 
      date: '1 week ago', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/>
        </svg>
      )
    },
    { 
      id: 3, 
      type: 'story', 
      title: 'Shared sunrise photos from Sarangkot Hill', 
      date: '2 weeks ago', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      )
    },
    { 
      id: 4, 
      type: 'booking', 
      title: 'Booked Chitwan Jungle Safari Adventure', 
      date: '3 weeks ago', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      )
    },
    { 
      id: 5, 
      type: 'photo', 
      title: 'Uploaded photos from Annapurna Circuit', 
      date: '1 month ago', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21,15 16,10 5,21"/>
        </svg>
      )
    },
    { 
      id: 6, 
      type: 'guide', 
      title: 'Recommended local guide Pemba Sherpa', 
      date: '1 month ago', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      )
    }
  ];

  const upcomingTrips = [
    { 
      id: 1, 
      destination: 'Annapurna Circuit Trek', 
      date: 'Dec 15, 2024', 
      status: 'Confirmed', 
      image: '/assets/card-annapurna.jpg',
      duration: '16 days',
      difficulty: 'Moderate'
    },
    { 
      id: 2, 
      destination: 'Langtang Valley Trek', 
      date: 'Jan 20, 2025', 
      status: 'Pending', 
      image: '/assets/card-langtang.jpg',
      duration: '12 days',
      difficulty: 'Easy-Moderate'
    },
    { 
      id: 3, 
      destination: 'Gokyo Lakes Trek', 
      date: 'Mar 10, 2025', 
      status: 'Planning', 
      image: '/assets/card-gokyo.jpg',
      duration: '14 days',
      difficulty: 'Challenging'
    }
  ];

  const savedPlaces = [
    { id: 1, name: 'Everest Base Camp', category: 'Trekking', image: '/assets/card-everest.jpg' },
    { id: 2, name: 'Kathmandu Durbar Square', category: 'Cultural', image: '/assets/card-kathmandu.jpg' },
    { id: 3, name: 'Pokhara Lake', category: 'Nature', image: '/assets/card-pokhara.jpg' },
    { id: 4, name: 'Chitwan National Park', category: 'Wildlife', image: '/assets/card-chitwan.jpg' }
  ];

  return (
    <div className="dashboard-page">
      {/* Navigation */}
      <nav className="dashboard-nav">
        <div className="dashboard-brand" onClick={() => navigate('/home')}>
          <span className="nepal">Nepal</span> <span className="connect">Connect</span>
        </div>
        <div className="dashboard-nav-links">
          <Link to="/home">Homepage</Link>
          <Link to="/business">List Your Business</Link>
          <Link to="/stories">Stories</Link>
          <Link to="/ad-creator">AI Ad Creator</Link>
        </div>
        <div className="dashboard-nav-profile">
          <div className="profile-dropdown">
            <button
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              {userData.avatar ? (
                <img src={userData.avatar} alt="Profile" className="profile-avatar" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>
            {showProfileMenu && (
              <div className="profile-menu">
                <Link to="/dashboard" className="dashboard-btn">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-welcome">
            <h1>Welcome back, {userData.name}!</h1>
            <p>Ready for your next Nepal adventure?</p>
          </div>
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-number">{userData.totalTrips}</div>
              <div className="stat-label">Trips Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{userData.savedPlaces}</div>
              <div className="stat-label">Places Saved</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{userData.reviewsWritten}</div>
              <div className="stat-label">Reviews Written</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{userData.storiesShared}</div>
              <div className="stat-label">Stories Shared</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'trips' ? 'active' : ''}`}
            onClick={() => setActiveTab('trips')}
          >
            My Trips
          </button>
          <button 
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            Saved Places
          </button>
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="dashboard-grid">
                {/* Recent Activity */}
                <div className="dashboard-card">
                  <h3>Recent Activity</h3>
                  <div className="activity-list">
                    {recentActivities.slice(0, 4).map(activity => (
                      <div key={activity.id} className="activity-item">
                        <div className="activity-icon">{activity.icon}</div>
                        <div className="activity-details">
                          <div className="activity-title">{activity.title}</div>
                          <div className="activity-date">{activity.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="view-all-activity-btn" onClick={() => setActiveTab('trips')}>
                    View All Activity
                  </button>
                </div>

                {/* Upcoming Trips */}
                <div className="dashboard-card">
                  <h3>Upcoming Trips</h3>
                  <div className="trips-list">
                    {upcomingTrips.slice(0, 2).map(trip => (
                      <div key={trip.id} className="trip-item">
                        <img src={trip.image} alt={trip.destination} className="trip-image" />
                        <div className="trip-details">
                          <div className="trip-destination">{trip.destination}</div>
                          <div className="trip-meta">
                            <span className="trip-date">{trip.date}</span>
                            <span className="trip-duration">• {trip.duration}</span>
                          </div>
                          <span className={`trip-status ${trip.status.toLowerCase()}`}>
                            {trip.status}
                          </span>
                        </div>
                        <div className="trip-actions">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9,18 15,12 9,6"/>
                          </svg>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="plan-trip-btn" onClick={() => navigate('/home')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Plan New Trip
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trips' && (
            <div className="trips-tab">
              <div className="trips-section">
                <h3>Trip History</h3>
                <div className="trips-grid-compact">
                  <div className="trip-card completed">
                    <img src="/assets/card-everest.jpg" alt="Everest Base Camp" />
                    <div className="trip-card-content">
                      <h4>Everest Base Camp Trek</h4>
                      <p>14 days • Completed March 2024</p>
                      <div className="trip-rating">
                        <div className="stars">
                          {[...Array(5)].map((_, i) => (
                            <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1">
                              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/>
                            </svg>
                          ))}
                        </div>
                        <span>Amazing experience!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="saved-tab">
              <h3>Your Saved Places</h3>
              <div className="saved-places-grid">
                {savedPlaces.map(place => (
                  <div key={place.id} className="saved-place-card">
                    <img src={place.image} alt={place.name} />
                    <div className="saved-place-content">
                      <h4>{place.name}</h4>
                      <span className="place-category">{place.category}</span>
                      <button className="remove-saved-btn">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="profile-tab">
              <div className="profile-settings">
                <div className="profile-section">
                  <h3>Personal Information</h3>
                  <div className="profile-form">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" value={userData.name} readOnly />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={userData.email} readOnly />
                    </div>
                    <div className="form-group">
                      <label>Member Since</label>
                      <input type="text" value={userData.joinDate} readOnly />
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <h3>Travel Preferences</h3>
                  <div className="preferences-grid">
                    <div className="preference-item">
                      <input type="checkbox" id="trekking" />
                      <label htmlFor="trekking">Trekking & Hiking</label>
                    </div>
                    <div className="preference-item">
                      <input type="checkbox" id="cultural" />
                      <label htmlFor="cultural">Cultural Tours</label>
                    </div>
                    <div className="preference-item">
                      <input type="checkbox" id="wildlife" />
                      <label htmlFor="wildlife">Wildlife Safari</label>
                    </div>
                    <div className="preference-item">
                      <input type="checkbox" id="adventure" />
                      <label htmlFor="adventure">Adventure Sports</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;