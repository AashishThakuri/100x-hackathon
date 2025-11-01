import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './AdCreatorPageStyles.css';

const AdCreatorPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAd, setGeneratedAd] = useState(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
    setShowProfileMenu(false);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const imageUrls = files.map(file => URL.createObjectURL(file));
    setSelectedImages(prev => [...prev, ...imageUrls]);
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateAd = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt for your ad');
      return;
    }

    setIsGenerating(true);

    // Simulate AI ad generation
    setTimeout(() => {
      const mockAd = {
        id: Date.now(),
        title: `AI Generated Advertisement`,
        content: `Based on your prompt: "${prompt}", our AI has created this compelling video advertisement that captures your business essence and engages your target audience.`,
        images: selectedImages,
        video: '/assets/ef4046d2-c52a-4d00-b38a-b77cc85ad049 (1).mp4',
        prompt: prompt,
        createdAt: new Date().toLocaleString()
      };

      setGeneratedAd(mockAd);
      setIsGenerating(false);
    }, 3000); // Increased to 3 seconds for more realistic AI generation feel
  };

  const handleSaveAd = () => {
    if (generatedAd) {
      // In a real app, this would save to backend
      alert('Ad saved successfully!');
      // Reset form
      setPrompt('');
      setSelectedImages([]);
      setGeneratedAd(null);
    }
  };

  const handleNewAd = () => {
    setPrompt('');
    setSelectedImages([]);
    setGeneratedAd(null);
  };

  return (
    <div className="ad-creator-page">
      {/* Navigation */}
      <nav className="ad-creator-nav">
        <div className="ad-creator-brand" onClick={() => navigate('/home')}>
          <span className="nepal">Nepal</span> <span className="connect">Connect</span>
        </div>
        <div className="ad-creator-nav-links">
          <Link to="/home">Homepage</Link>
          <Link to="/business">List Your Business</Link>
          <Link to="/stories">Stories</Link>
          <Link to="/ad-creator" className="active">AI Ad Creator</Link>
        </div>
        <div className="ad-creator-nav-profile">
          <div className="profile-dropdown">
            <button
              className="profile-btn"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

      {/* Hero Section */}
      <div className="ad-creator-hero">
        <h1 className="ad-creator-title">
          Create Your Perfect<br />
          Advertisement with AI
        </h1>

        <p className="ad-creator-subtitle">
          Describe your business and let AI create compelling advertisements<br />
          Upload images, set your tone, and generate professional ads instantly<br />
          From social media posts to business flyers - AI does it all
        </p>

        {selectedImages.length > 0 && (
          <div className="selected-images-above">
            {selectedImages.map((image, index) => (
              <div key={index} className="image-preview-small">
                <img src={image} alt={`Preview ${index + 1}`} />
                <button
                  onClick={() => removeImage(index)}
                  className="remove-image-small"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="ad-creator-chatbox">
          <input
            type="text"
            className="ad-creator-input"
            placeholder="Describe your advertisement idea..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateAd()}
          />

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="image-upload-hidden"
            id="image-upload-chatbox"
          />

          <label htmlFor="image-upload-chatbox" className="ad-creator-image-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
              <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2" />
              <polyline points="21,15 16,10 5,21" stroke="currentColor" strokeWidth="2" />
            </svg>
          </label>

          <button
            type="button"
            className="ad-creator-generate-btn"
            onClick={handleGenerateAd}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <div className="spinner-small"></div>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" />
              </svg>
            )}
          </button>
        </div>

        {generatedAd && (
          <div className="generated-ad-display">
            <h2 className="ad-result-title">Your Generated Advertisement</h2>

            {generatedAd.video && (
              <div className="ad-video-frame">
                <video
                  controls
                  width="100%"
                  height="auto"
                >
                  <source src={generatedAd.video} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {generatedAd.images.length > 0 && (
              <div className="ad-images-display">
                <h4 className="source-images-title">Source Images Used:</h4>
                {generatedAd.images.map((image, index) => (
                  <img key={index} src={image} alt={`Source image ${index + 1}`} />
                ))}
              </div>
            )}

            <div className="ad-result-actions">
              <button onClick={handleNewAd} className="new-ad-btn">
                Create New Ad
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdCreatorPage;