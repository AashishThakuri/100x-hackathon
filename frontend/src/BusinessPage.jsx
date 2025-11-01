import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './BusinessPageStyles.css';

const BusinessPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: ''
  });
  const [formData, setFormData] = useState({
    businessName: '',
    category: '',
    description: '',
    location: '',
    contact: '',
    email: '',
    images: []
  });
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
    setShowProfileMenu(false);
  };

  const [businesses, setBusinesses] = useState([
    {
      id: 1,
      name: 'Ama Ko Chiya Pasal',
      category: 'Restaurant & Cafe',
      description: 'Small family tea shop serving traditional Nepali tea, sel roti, and local snacks. Run by local grandmother for 15 years.',
      location: 'Thamel, Kathmandu',
      contact: '+977-1-4441234',
      email: 'amakochiya@gmail.com',
      image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop&auto=format',
      rating: 4.8,
      reviews: 156,
      userReviews: [
        { user: 'Ramesh K.', rating: 5, comment: 'Best tea in Thamel! Ama is so kind and welcoming.' },
        { user: 'Sarah M.', rating: 4, comment: 'Authentic local experience, great sel roti!' }
      ]
    },
    {
      id: 2,
      name: 'Sherpa Guide Service',
      category: 'Tour & Travel',
      description: 'Local Sherpa guides for trekking and mountaineering. Family business with 3 generations of mountain experience.',
      location: 'Namche Bazaar, Everest Region',
      contact: '+977-38-540123',
      email: 'sherpaguide@yahoo.com',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&auto=format',
      rating: 4.9,
      reviews: 89,
      userReviews: [
        { user: 'John D.', rating: 5, comment: 'Amazing guide, very knowledgeable about local culture.' },
        { user: 'Lisa P.', rating: 5, comment: 'Safe and professional service, highly recommended!' }
      ]
    },
    {
      id: 3,
      name: 'Magar Handicrafts',
      category: 'Arts & Crafts',
      description: 'Traditional Magar community crafts including bamboo baskets, wooden items, and handwoven textiles made by local women.',
      location: 'Pokhara, Kaski',
      contact: '+977-61-462345',
      email: 'magarcraft@hotmail.com',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&auto=format',
      rating: 4.7,
      reviews: 203,
      userReviews: [
        { user: 'Maria S.', rating: 5, comment: 'Beautiful handmade items, supporting local women!' },
        { user: 'David L.', rating: 4, comment: 'Great quality crafts, fair prices.' }
      ]
    },
    {
      id: 4,
      name: 'Gurung Family Lodge',
      category: 'Accommodation',
      description: 'Simple mountain lodge run by Gurung family. Basic rooms with shared bathroom, home-cooked meals, mountain views.',
      location: 'Ghandruk, Annapurna Region',
      contact: '+977-61-460789',
      email: 'gurungfamily@gmail.com',
      image: 'https://images.unsplash.com/photo-1520637736862-4d197d17c90a?w=400&h=300&fit=crop&auto=format',
      rating: 4.6,
      reviews: 124,
      userReviews: [
        { user: 'Anna K.', rating: 5, comment: 'Warm hospitality, felt like family!' },
        { user: 'Mike R.', rating: 4, comment: 'Simple but clean, great dal bhat!' }
      ]
    },
    {
      id: 5,
      name: 'Tharu Organic Farm',
      category: 'Agriculture & Food',
      description: 'Small organic farm selling fresh vegetables, rice, and traditional Tharu pickles. Direct from farm to table.',
      location: 'Chitwan District',
      contact: '+977-56-420567',
      email: 'tharuorganic@gmail.com',
      image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop&auto=format',
      rating: 4.5,
      reviews: 67,
      userReviews: [
        { user: 'Priya N.', rating: 5, comment: 'Fresh organic vegetables, very tasty!' },
        { user: 'Tom W.', rating: 4, comment: 'Good quality produce, reasonable prices.' }
      ]
    },
    {
      id: 6,
      name: 'Local Tailor Shop',
      category: 'Other',
      description: 'Small tailoring shop for clothing repairs, alterations, and custom traditional Nepali clothes. Quick service.',
      location: 'Bhaktapur',
      contact: '+977-1-6612890',
      email: 'localtailor@yahoo.com',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&auto=format',
      rating: 4.3,
      reviews: 45,
      userReviews: [
        { user: 'Sita R.', rating: 4, comment: 'Good work, fair prices for alterations.' },
        { user: 'James H.', rating: 4, comment: 'Fixed my trekking gear quickly!' }
      ]
    },
    {
      id: 7,
      name: 'Newari Momo Corner',
      category: 'Restaurant & Cafe',
      description: 'Traditional Newari momo and local dishes. Family recipe passed down for generations. Best buff momo in town.',
      location: 'Bhaktapur Durbar Square',
      contact: '+977-1-6615678',
      email: 'newarimomo@gmail.com',
      image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400&h=300&fit=crop&auto=format',
      rating: 4.6,
      reviews: 89,
      userReviews: [
        { user: 'Bikash S.', rating: 5, comment: 'Authentic Newari taste, must try buff momo!' },
        { user: 'Jenny L.', rating: 4, comment: 'Great local food, friendly service.' }
      ]
    },
    {
      id: 8,
      name: 'Tamang Weaving Center',
      category: 'Arts & Crafts',
      description: 'Traditional Tamang carpet weaving and textile production. Handmade carpets, bags, and traditional clothing.',
      location: 'Rasuwa District',
      contact: '+977-10-560234',
      email: 'tamangweaving@yahoo.com',
      image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=400&h=300&fit=crop&auto=format',
      rating: 4.4,
      reviews: 34,
      userReviews: [
        { user: 'Michael R.', rating: 5, comment: 'Beautiful handwoven carpets, excellent quality!' },
        { user: 'Pema T.', rating: 4, comment: 'Supporting local Tamang community, great work.' }
      ]
    }
  ]);

  const categories = [
    'Restaurant & Cafe',
    'Accommodation',
    'Outdoor Equipment',
    'Arts & Crafts',
    'Agriculture & Food',
    'Transportation',
    'Tour & Travel',
    'Healthcare',
    'Education',
    'Other'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setFormData(prev => ({
      ...prev,
      images: files
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.businessName || !formData.category || !formData.description || !formData.location || !formData.contact) {
      alert('Please fill in all required fields');
      return;
    }

    const newBusiness = {
      id: businesses.length + 1,
      name: formData.businessName,
      category: formData.category,
      description: formData.description,
      location: formData.location,
      contact: formData.contact,
      email: formData.email,
      image: selectedFiles.length > 0 ? URL.createObjectURL(selectedFiles[0]) : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&auto=format',
      rating: 0,
      reviews: 0,
      userReviews: []
    };

    setBusinesses(prev => [newBusiness, ...prev]);
    setShowAddModal(false);
    setFormData({
      businessName: '',
      category: '',
      description: '',
      location: '',
      contact: '',
      email: '',
      images: []
    });
    setSelectedFiles([]);
    alert('Your business has been listed successfully!');
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData({
      businessName: '',
      category: '',
      description: '',
      location: '',
      contact: '',
      email: '',
      images: []
    });
    setSelectedFiles([]);
  };

  const handleReviewClick = (business) => {
    setSelectedBusiness(business);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    
    if (!reviewData.comment.trim()) {
      alert('Please write a review comment');
      return;
    }

    const newReview = {
      user: 'Anonymous User', // In real app, this would come from auth
      rating: reviewData.rating,
      comment: reviewData.comment
    };

    // Update the business with new review
    setBusinesses(prev => prev.map(business => {
      if (business.id === selectedBusiness.id) {
        const updatedReviews = [...(business.userReviews || []), newReview];
        const totalRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0);
        const avgRating = (totalRating / updatedReviews.length).toFixed(1);
        
        return {
          ...business,
          userReviews: updatedReviews,
          reviews: updatedReviews.length,
          rating: parseFloat(avgRating)
        };
      }
      return business;
    }));

    setShowReviewModal(false);
    setReviewData({ rating: 5, comment: '' });
    setSelectedBusiness(null);
    alert('Thank you for your review!');
  };

  const handleReviewClose = () => {
    setShowReviewModal(false);
    setReviewData({ rating: 5, comment: '' });
    setSelectedBusiness(null);
  };

  return (
    <div className="business-page">
      {/* Navigation */}
      <nav className="business-nav">
        <div className="business-brand" onClick={() => navigate('/home')}>
          <span className="nepal">Nepal</span> <span className="connect">Connect</span>
        </div>
        <div className="business-nav-links">
          <Link to="/home">Homepage</Link>
          <Link to="/business" className="active">List Your Business</Link>
          <Link to="/stories">Stories</Link>
          <Link to="/ad-creator">AI Ad Creator</Link>
        </div>
        <div className="business-nav-profile">
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

      {/* Header */}
      <div className="business-header">
        <div className="business-header-content">
          <h1 className="business-main-title">List Your Business</h1>
          <p className="business-subtitle">Connect with travelers and grow your business in Nepal</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="business-main">
        <div className="business-grid">
          {businesses.map((business) => (
            <div key={business.id} className="business-card">
              <div className="business-image">
                <img src={business.image} alt={business.name} />
                <div className="business-rating">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFD700">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span>{business.rating}</span>
                  <span className="review-count">({business.reviews})</span>
                </div>
              </div>
              
              <div className="business-content">
                <div className="business-category">{business.category}</div>
                <h3 className="business-name">{business.name}</h3>
                <p className="business-description">{business.description}</p>
                
                <div className="business-details">
                  <div className="business-location">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {business.location}
                  </div>
                  
                  <div className="business-contact">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {business.contact}
                  </div>
                  
                  {business.email && (
                    <div className="business-email">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      {business.email}
                    </div>
                  )}
                </div>
                
                <div className="business-actions">
                  <button 
                    className="review-btn"
                    onClick={() => handleReviewClick(business)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Write Review
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fab" onClick={() => setShowAddModal(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Add Business Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>List Your Business</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <form className="business-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="businessName">Business Name *</label>
                    <input 
                      type="text" 
                      id="businessName"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      placeholder="Enter your business name"
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="category">Category *</label>
                    <select 
                      id="category" 
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="form-select"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="description">Business Description *</label>
                  <textarea 
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Describe your business, services, and what makes it special..."
                    className="form-textarea"
                    required
                  ></textarea>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="location">Location *</label>
                    <input 
                      type="text" 
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="City, District, Nepal"
                      className="form-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="contact">Contact Number *</label>
                    <input 
                      type="tel" 
                      id="contact"
                      name="contact"
                      value={formData.contact}
                      onChange={handleInputChange}
                      placeholder="+977-XX-XXXXXXX"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input 
                    type="email" 
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="business@example.com"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="images">Business Photos</label>
                  <div className="file-upload-wrapper">
                    <input 
                      type="file" 
                      id="images" 
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      className="file-upload-input"
                    />
                    <div className={`file-upload-button ${selectedFiles.length > 0 ? 'has-file' : ''}`}>
                      <svg className="upload-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Choose business photos'}
                    </div>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    List Business
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedBusiness && (
        <div className="modal-overlay" onClick={handleReviewClose}>
          <div className="modal-content review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Write a Review for {selectedBusiness.name}</h2>
              <button className="close-btn" onClick={handleReviewClose}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <form className="review-form" onSubmit={handleReviewSubmit}>
                <div className="form-group">
                  <label>Rating</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star ${reviewData.rating >= star ? 'active' : ''}`}
                        onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      </button>
                    ))}
                    <span className="rating-text">({reviewData.rating} star{reviewData.rating !== 1 ? 's' : ''})</span>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reviewComment">Your Review</label>
                  <textarea 
                    id="reviewComment"
                    value={reviewData.comment}
                    onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
                    rows="4"
                    placeholder="Share your experience with this business..."
                    className="form-textarea"
                    required
                  ></textarea>
                </div>

                {/* Show existing reviews */}
                {selectedBusiness.userReviews && selectedBusiness.userReviews.length > 0 && (
                  <div className="existing-reviews">
                    <h4>Recent Reviews</h4>
                    <div className="reviews-list">
                      {selectedBusiness.userReviews.slice(-3).map((review, index) => (
                        <div key={index} className="review-item">
                          <div className="review-header">
                            <span className="reviewer-name">{review.user}</span>
                            <div className="review-stars">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg key={star} width="14" height="14" viewBox="0 0 24 24" fill={star <= review.rating ? "#FFD700" : "#E5E5E5"}>
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                              ))}
                            </div>
                          </div>
                          <p className="review-comment">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={handleReviewClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Submit Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessPage;