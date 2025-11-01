import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './StoriesPageStyles.css';

const StoriesPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Stories');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
    image: null
  });
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState({
    'All Stories': true,
    'Food & Cuisine': false,
    'Arts & Crafts': false,
    'Music & Dance': false,
    'Architecture': false,
    'Personal Journeys': false
  });
  const [selectedRegions, setSelectedRegions] = useState({
    'Himal': false,
    'Pahad': false
  });

  const categories = ['All Stories', 'Food & Cuisine', 'Arts & Crafts', 'Music', 'Architecture', 'Personal Journeys'];

  const [stories, setStories] = useState([
    {
      id: 1,
      title: 'Changu Narayan: Where Time Stands Still',
      author: 'Prakash Shrestha',
      timeAgo: '3 hours ago',
      image: '/assets/changu-narayan_temple01.jpg',
      excerpt: 'Perched atop a hill in Bhaktapur, Changu Narayan Temple stands as Nepal\'s oldest Hindu temple, dating back to the 4th century. Walking through its ancient courtyards, you can feel the weight of centuries of devotion. The intricate wood carvings tell stories of gods and kings, while the stone inscriptions speak of a civilization that flourished when the world was young. Every morning, as the first rays of sun illuminate the pagoda-style architecture, pilgrims gather to witness a tradition that has remained unchanged for over 1,600 years...',
      category: 'Architecture',
      featured: true,
      likes: 247,
      comments: 38
    },
    {
      id: 2,
      title: 'Pashupatinath: The Sacred Flames of Eternity',
      author: 'Sita Paudel',
      timeAgo: '6 hours ago',
      image: '/assets/Pashupatinath-Temple-Pooja.webp',
      excerpt: 'At the banks of the sacred Bagmati River, Pashupatinath Temple pulses with spiritual energy that transcends time. The evening aarti ceremony transforms the temple complex into a symphony of bells, chants, and flickering oil lamps. Devotees from across the subcontinent gather here, believing that Lord Shiva himself resides in this sacred space. The temple\'s golden roof gleams against the twilight sky as sadhus in saffron robes perform ancient rituals that connect the earthly realm with the divine...',
      category: 'Personal Journeys',
      featured: false,
      likes: 189,
      comments: 31
    },
    {
      id: 3,
      title: 'Lumbini: Birthplace of Enlightenment',
      author: 'Tenzin Norbu',
      timeAgo: '1 day ago',
      image: '/assets/Lumbini_-_Mayadevi_Temple_from_South,_Lumbini_(9244243566).jpg',
      excerpt: 'In the serene gardens of Lumbini, where Queen Maya Devi gave birth to Prince Siddhartha, peace seems to emanate from the very earth. The Maya Devi Temple houses the exact spot where the Buddha was born over 2,500 years ago. Pilgrims from around the world come here not just to see, but to feel the profound tranquility that this sacred birthplace offers. The ancient Ashoka Pillar stands as a testament to the historical significance of this holy site, marking it as the fountain of Buddhist philosophy that would eventually spread across continents...',
      category: 'Architecture',
      featured: false,
      likes: 312,
      comments: 45
    },
    {
      id: 4,
      title: 'Ghodaghodi Lake: Nepal\'s Hidden Paradise',
      author: 'Binod Chaudhary',
      timeAgo: '2 days ago',
      image: '/assets/Ghodaghodi-lake-1290x540.jpg',
      excerpt: 'Nestled in the far-western region of Nepal, Ghodaghodi Lake remains one of the country\'s best-kept secrets. This pristine wetland ecosystem, surrounded by lush forests and rolling hills, is home to over 150 species of birds and countless aquatic life forms. Local Tharu communities have protected these waters for generations, understanding that this lake system is not just a source of livelihood, but a sacred trust passed down from their ancestors. As dawn breaks over the mirror-like surface, the lake reflects not just the sky, but the soul of rural Nepal...',
      category: 'Personal Journeys',
      featured: false,
      likes: 156,
      comments: 22
    },
    {
      id: 5,
      title: 'The Rhythms of Newari Music',
      author: 'Suman Maharjan',
      timeAgo: '3 days ago',
      image: '/assets/card-bhaktapur.jpg',
      excerpt: 'In the ancient courtyards of Bhaktapur, traditional Newari music echoes through narrow alleys, carrying stories that span centuries. The dhimay drums and traditional instruments create melodies that have accompanied festivals, celebrations, and daily life for generations...',
      category: 'Music',
      featured: false,
      likes: 98,
      comments: 15
    },
    {
      id: 6,
      title: 'Flavors of the Himalayas: Gundruk and Tradition',
      author: 'Maya Gurung',
      timeAgo: '4 days ago',
      image: '/assets/images (1) (1).jpeg',
      excerpt: 'High in the mountain villages, the art of fermenting leafy greens into gundruk represents more than just food preservation—it\'s a connection to ancestral wisdom and the harsh realities of mountain life...',
      category: 'Food & Cuisine',
      featured: false,
      likes: 134,
      comments: 28
    }
  ]);

  const handleCategoryChange = (category) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleRegionChange = (region) => {
    setSelectedRegions(prev => ({
      ...prev,
      [region]: !prev[region]
    }));
  };

  // Filter stories based on active category and selected filters
  const filteredStories = stories.filter(story => {
    // Filter by active category tab
    if (activeCategory !== 'All Stories' && story.category !== activeCategory) {
      return false;
    }

    // Filter by search query
    if (searchQuery && !story.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !story.excerpt.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filter by selected categories in sidebar
    const selectedCategoryKeys = Object.keys(selectedCategories).filter(key => selectedCategories[key]);
    if (selectedCategoryKeys.length > 0 && !selectedCategoryKeys.includes('All Stories') && 
        !selectedCategoryKeys.includes(story.category)) {
      return false;
    }

    return true;
  });

  const handleCreateStory = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setFormData({
      title: '',
      category: '',
      content: '',
      image: null
    });
    setSelectedFileName('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      setSelectedFileName(file.name);
    }
  };

  const handleSubmitStory = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || !formData.content) {
      alert('Please fill in all required fields');
      return;
    }

    // Create new story object
    const newStory = {
      id: stories.length + 1,
      title: formData.title,
      author: 'Anonymous User', // In a real app, this would come from user authentication
      timeAgo: 'Just now',
      image: formData.image ? URL.createObjectURL(formData.image) : '/assets/card-kathmandu.jpg', // Default image if none uploaded
      excerpt: formData.content.substring(0, 200) + (formData.content.length > 200 ? '...' : ''),
      category: formData.category,
      featured: false,
      likes: 0,
      comments: 0
    };

    // Add new story to the beginning of the array
    setStories(prev => [newStory, ...prev]);
    
    // Close modal and reset form
    handleCloseModal();
    
    // Show success message
    alert('Your story has been published successfully!');
  };

  return (
    <div className="stories-page">
      {/* Navigation */}
      <nav className="stories-nav">
        <div className="stories-brand" onClick={() => navigate('/home')}>
          <span className="nepal">Nepal</span> <span className="connect">Connect</span>
        </div>
        <div className="stories-nav-links">
          <Link to="/home">Homepage</Link>
          <a href="#business">List Your Business</a>
          <Link to="/stories" className="active">Stories</Link>
        </div>
        <div className="stories-nav-profile">
          <button className="profile-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="stories-header">
        <div className="stories-header-content">
          <div className="nepali-title">कथाहरू</div>
          <h1 className="stories-main-title">Community Stories</h1>
          <p className="stories-subtitle">SHARE YOUR JOURNEY, INSPIRE OTHERS</p>
          <div className="decorative-line">
            <svg width="40" height="20" viewBox="0 0 40 20" fill="none">
              <path d="M20 2L22 8L28 10L22 12L20 18L18 12L12 10L18 8L20 2Z" fill="#D4A574"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        <div className="category-tabs-container">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-tab ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="stories-main">
        {/* Sidebar */}
        <div className="stories-sidebar">
          {/* Search */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">Search Stories</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">Categories</h3>
            <div className="filter-options">
              {Object.keys(selectedCategories).map((category) => (
                <label key={category} className="filter-option">
                  <input
                    type="checkbox"
                    checked={selectedCategories[category]}
                    onChange={() => handleCategoryChange(category)}
                  />
                  <span className="checkmark"></span>
                  {category}
                </label>
              ))}
            </div>
          </div>

          {/* Region */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">Region</h3>
            <div className="filter-options">
              {Object.keys(selectedRegions).map((region) => (
                <label key={region} className="filter-option">
                  <input
                    type="checkbox"
                    checked={selectedRegions[region]}
                    onChange={() => handleRegionChange(region)}
                  />
                  <span className="checkmark"></span>
                  {region}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Stories Content */}
        <div className="stories-content">
          {filteredStories.length === 0 ? (
            <div className="no-stories">
              <h3>No stories found</h3>
              <p>Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <div className="stories-grid">
              {filteredStories.map((story) => (
              <div key={story.id} className={`story-card ${story.featured ? 'featured' : ''}`}>
                {story.featured && <div className="featured-badge">FEATURED</div>}
                
                <div className="story-image">
                  <img src={story.image} alt={story.title} />
                </div>
                
                <div className="story-content">
                  <div className="story-meta">
                    <div className="author-info">
                      <div className="author-avatar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                          <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <div className="author-name">{story.author}</div>
                        <div className="story-time">{story.timeAgo}</div>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="story-title">{story.title}</h3>
                  <p className="story-excerpt">{story.excerpt}</p>
                  
                  <div className="story-tags">
                    <span className="story-tag">{story.category}</span>
                    {story.id === 1 && <span className="story-tag">Heritage Site</span>}
                    {story.id === 2 && <span className="story-tag">Hindu Temple</span>}
                    {story.id === 3 && <span className="story-tag">Buddhist Heritage</span>}
                    {story.id === 4 && <span className="story-tag">Natural Beauty</span>}
                    {story.id === 5 && <span className="story-tag">Traditional Music</span>}
                    {story.id === 6 && <span className="story-tag">Mountain Culture</span>}
                  </div>
                  
                  <div className="story-actions">
                    <button className="action-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {story.likes}
                    </button>
                    <button className="action-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {story.comments}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fab" onClick={handleCreateStory}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Create Story Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Your Story</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <form className="create-story-form" onSubmit={handleSubmitStory}>
                <div className="form-group">
                  <label htmlFor="story-title">Story Title</label>
                  <input 
                    type="text" 
                    id="story-title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="Enter your story title..."
                    className="form-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="story-category">Category</label>
                  <select 
                    id="story-category" 
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="Food & Cuisine">Food & Cuisine</option>
                    <option value="Arts & Crafts">Arts & Crafts</option>
                    <option value="Music">Music</option>
                    <option value="Architecture">Architecture</option>
                    <option value="Personal Journeys">Personal Journeys</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="story-image">Upload Image</label>
                  <div className="file-upload-wrapper">
                    <input 
                      type="file" 
                      id="story-image" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="file-upload-input"
                    />
                    <div className={`file-upload-button ${selectedFileName ? 'has-file' : ''}`}>
                      <svg className="upload-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {selectedFileName || 'Choose an image file'}
                    </div>
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="story-content">Your Story</label>
                  <textarea 
                    id="story-content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    rows="8"
                    placeholder="Share your journey, inspire others..."
                    className="form-textarea"
                    required
                  ></textarea>
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Publish Story
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

export default StoriesPage;
