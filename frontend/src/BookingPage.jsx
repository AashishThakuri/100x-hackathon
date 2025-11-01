import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './BookingPageStyles.css';
import GoogleMapPreview from './components/GoogleMapPreview';

function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState({
    tripItinerary: [],
    hotels: [],
    agencies: [],
    guides: [],
    restaurants: []
  });
  const [currentStep, setCurrentStep] = useState('searching');
  const [progress, setProgress] = useState(0);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sideMissions, setSideMissions] = useState([]);

  const tripPlan = location.state?.tripPlan || {};
  const realTimeData = location.state?.realTimeData || null;
  const conversationHistory = location.state?.conversationHistory || [];

  useEffect(() => {
    simulateDataCrawling();
  }, []);

  const simulateDataCrawling = async () => {
    // If we already have real-time data, skip the simulation
    if (realTimeData && realTimeData.tripAnalysis) {
      console.log('Using real-time data:', realTimeData);
      setCurrentStep('complete');
      setProgress(100);
      await loadRealTimeRecommendations();
      setIsLoading(false);
      return;
    }

    // Check if we have a valid trip plan to work with
    if (!tripPlan || typeof tripPlan !== 'string' || tripPlan.length < 100) {
      console.error('No valid trip plan provided');
      setCurrentStep('error');
      setIsLoading(false);
      return;
    }

    // Load recommendations while showing progress
    const steps = [
      { step: 'searching', message: 'Searching travel websites...', progress: 25 },
      { step: 'google', message: 'Analyzing Google reviews...', progress: 55 },
      { step: 'filtering', message: 'Filtering best recommendations...', progress: 85 },
      { step: 'complete', message: 'Complete!', progress: 100 }
    ];

    // Start loading recommendations in parallel
    const loadPromise = loadRecommendations();
    
    // Show progress animation synchronized with loading
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(steps[i].step);
      setProgress(steps[i].progress);
      
      if (i < steps.length - 1) {
        // Wait progressively less for each step to match actual load time
        const delay = i === 0 ? 1000 : (i === 1 ? 800 : 600);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Wait for actual data to load (this should complete by now or shortly after)
    try {
      await Promise.race([
        loadPromise,
        new Promise(resolve => setTimeout(resolve, 1000)) // Max 1s wait after animation
      ]);
    } catch (err) {
      console.error('Error loading recommendations:', err);
    }
    
    setIsLoading(false);
  };

  // Helper: call backend JSON
  const apiGet = async (url) => {
    // Use full URL in development if proxy isn't working
    const fullUrl = url.startsWith('http') ? url : `http://localhost:5000${url}`;
    const resp = await fetch(fullUrl);
    if (!resp.ok) throw new Error(`Request failed: ${resp.status}`);
    return resp.json();
  };

  // Parse side missions from trip plan
  const parseSideMissions = async (planText) => {
    if (!planText || typeof planText !== 'string') return [];
    
    const sideMissions = [];
    const lines = planText.split('\n');
    const sideMissionRe = /SIDE\s+MISSION|Side\s+Mission/i;
    let inSideMission = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (sideMissionRe.test(line)) {
        inSideMission = true;
        continue;
      }
      
      if (inSideMission) {
        // Check if line contains business info in format: Business Name | Location | Contact
        const businessMatch = line.match(/^[-•]\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$/);
        if (businessMatch) {
          const [, name, location, contact] = businessMatch;
          sideMissions.push({
            name: name.trim(),
            location: location.trim(),
            contact: contact.trim()
          });
        } else if (line.match(/^DAY\s+\d+|BUDGET|WHAT'S|How does/i)) {
          // End of side mission section
          break;
        }
      }
    }
    
    // If side missions found, fetch matching businesses from API
    if (sideMissions.length > 0) {
      const fetchedMissions = [];
      for (const mission of sideMissions) {
        try {
          const response = await apiGet(`/api/businesses?location=${encodeURIComponent(mission.location)}`);
          if (response.success && response.businesses.length > 0) {
            // Use the first matching business or the parsed one
            const business = response.businesses.find(b => 
              b.name.toLowerCase().includes(mission.name.toLowerCase()) ||
              mission.name.toLowerCase().includes(b.name.toLowerCase())
            ) || response.businesses[0];
            fetchedMissions.push(business);
          } else {
            // Use parsed data if API doesn't return match
            fetchedMissions.push(mission);
          }
        } catch (err) {
          console.warn('Failed to fetch business for side mission:', err);
          fetchedMissions.push(mission);
        }
      }
      return fetchedMissions;
    }
    
    return [];
  };

  // Derive itinerary skeleton from free-form AI trip plan text
  const deriveItineraryFromPlan = (planText) => {
    if (!planText || typeof planText !== 'string') return [];
    console.log('Parsing trip plan:', planText);
    
    const lines = planText.split('\n');
    const days = [];
    let current = null;
    const dayRe = /^\s*(?:#+\s*)?Day\s*(\d+)\s*[-:–—]\s*(.+)$/i;
    const knownPlaces = ['Kathmandu','Pokhara','Lumbini','Chitwan','Nagarkot','Bhaktapur','Patan','Bandipur','Mustang','Jomsom','Gosaikunda','Annapurna','Everest','Langtang','Gorkha','Manang','Lukla','Namche','Dhulikhel','Bandipur'];
    
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      
      const m = line.match(dayRe);
      if (m) {
        const dayNum = Number(m[1]);
        const title = m[2].trim();
        
        // Extract location from title - look for known places or last destination
        let location = '';
        const titleLower = title.toLowerCase();
        const foundPlace = knownPlaces.find(p => titleLower.includes(p.toLowerCase()));
        
        if (foundPlace) {
          location = foundPlace;
        } else {
          // Try to extract from patterns like "A to B" or "Journey to X"
          const toMatch = title.match(/(?:to|→|arrive\s+(?:in|at))\s+([^,\-–]+)/i);
          if (toMatch) {
            location = toMatch[1].trim();
          } else {
            // Use the whole title as location
            location = title.split(/[,\-–]/)[0].trim();
          }
        }
        
        current = { 
          day: dayNum, 
          date: `Day ${dayNum}`, 
          title, 
          location: location || 'Nepal', 
          description: '',
          activities: []
        };
        days.push(current);
        console.log(`Parsed Day ${dayNum}: ${location} - ${title}`);
      } else if (current && line) {
        // Add to description or extract activities
        if (line.includes('Activity:') || line.includes('Visit:') || line.includes('Trek:')) {
          current.activities.push(line.replace(/^(Activity:|Visit:|Trek:)\s*/i, ''));
        } else {
          current.description = (current.description ? current.description + ' ' : '') + line;
        }
      }
    }
    
    console.log('Parsed itinerary:', days);
    return days;
  };

  // Try to augment with real Google Maps + Places data
  const augmentWithOsm = async (data) => {
    const days = data.tripItinerary || [];
    const enhancedDays = [];

    for (const d of days) {
      // Geocode day location
      let lat = null, lon = null, display_name = '';
      try {
        const normalizePlace = (place) => {
          if (!place) return '';
          // If the string contains 'to' or '-' assume last token is destination for the day
          const parts = place.split(/to|→|\-|–/i).map(s => s.trim()).filter(Boolean);
          return parts.length ? parts[parts.length - 1] : place;
        };
        const queryPlace = normalizePlace(d.location);
        console.log(`Geocoding location: ${queryPlace}`);
        const g = await apiGet(`/api/maps/geocode?q=${encodeURIComponent(queryPlace)}`);
        console.log('Geocode result:', g);
        if (g?.success && g?.result) {
          lat = g.result.lat; lon = g.result.lon; display_name = g.result.display_name;
          console.log(`Found coordinates: ${lat}, ${lon}`);
        } else {
          console.warn(`Geocoding failed for ${queryPlace}:`, g?.message || 'No result');
        }
      } catch (err) {
        console.warn('Geocoding error:', err.message);
      }

      const fetchCategory = async (type) => {
        if (lat == null || lon == null) {
          console.warn(`⚠️ Skipping ${type} fetch - no coordinates`);
          return [];
        }
        try {
          console.log(`🔍 Fetching ${type} near ${lat}, ${lon}`);
          const list = await apiGet(`/api/places/nearby?lat=${lat}&lon=${lon}&type=${type}&radius=10000`);
          
          if (!list || !list.success) {
            console.warn(`⚠️ Failed to fetch ${type}:`, list?.error);
            return [];
          }
          
          const resultCount = list.results?.length || 0;
          console.log(`✅ Found ${resultCount} ${type} results`);
          
          if (!list.results || list.results.length === 0) {
            console.warn(`⚠️ No ${type} found. This might indicate:`);
            console.warn(`   1. GOOGLE_PLACES_API_KEY not configured in backend/.env`);
            console.warn(`   2. API quota exceeded`);
            console.warn(`   3. No places of this type in the area`);
            return [];
          }
          
          const items = (list.results || []).map((r) => ({
            name: r.name,
            lat: r.lat,
            lon: r.lon,
            place_id: r.place_id,
            location: r.address || d.location,
            rating: r.rating || null,
            reviewsCount: r.reviewsCount || 0,
            price: '',
            contact: { phone: '', email: '', website: '' },
            googleReviews: [],
            amenities: (r.types || []).map(t => t.replace(/_/g, ' ')).slice(0, 5),
            image: r.photo_reference ? `/api/places/photo?ref=${encodeURIComponent(r.photo_reference)}&maxwidth=800` : '',
            mapLocation: `${r.lat?.toFixed?.(4)}°, ${r.lon?.toFixed?.(4)}°`,
          }));

          // Enrich with detailed reviews and photos (limit to avoid too many API calls)
          const enriched = [];
          const maxEnrich = Math.min(items.length, 5); // Limit enrichment to top 5
          for (let i = 0; i < maxEnrich; i++) {
            const it = items[i];
            if (it.place_id) {
              try {
                const det = await apiGet(`/api/places/reviews?place_id=${encodeURIComponent(it.place_id)}`);
                const res = det?.result;
                if (res) {
                  it.rating = res.rating || it.rating;
                  it.reviewsCount = res.user_ratings_total || it.reviewsCount;
                  if (Array.isArray(res.reviews)) {
                    it.reviews = res.reviews.slice(0, 3).map(rv => ({
                      author: rv.author_name,
                      rating: rv.rating,
                      text: rv.text,
                      time: rv.relative_time_description,
                    }));
                  }
                  if (Array.isArray(res.photos) && res.photos.length > 0) {
                    const photos = res.photos.slice(0, 5);
                    it.image = `/api/places/photo?ref=${encodeURIComponent(photos[0].photo_reference)}&maxwidth=800`;
                    it.gallery = photos.map(p => `/api/places/photo?ref=${encodeURIComponent(p.photo_reference)}&maxwidth=600`);
                  }
                }
              } catch (err) {
                console.warn('⚠️ Failed to fetch details for', it.name, err.message);
              }
            }
            enriched.push(it);
          }
          
          // Add remaining items without enrichment
          for (let i = maxEnrich; i < items.length; i++) {
            enriched.push(items[i]);
          }
          
          return enriched;
        } catch (err) {
          console.error(`❌ Error fetching ${type}:`, err.message);
          return [];
        }
      };

      const [hotels, restaurants, agencies, guides, attractions] = await Promise.all([
        fetchCategory('hotel'),
        fetchCategory('restaurant'),
        fetchCategory('agency'),
        fetchCategory('guide'),
        fetchCategory('attraction'),
      ]);

      enhancedDays.push({
        ...d,
        geocoded: { lat, lon, display_name },
        hotels: hotels.slice(0, 4),
        restaurants: restaurants.slice(0, 4),
        activities: attractions.slice(0, 4),
        agencies: agencies.slice(0, 4),
        guides: guides.slice(0, 4),
      });
    }

    return { ...data, tripItinerary: enhancedDays };
  };

  // Load real-time recommendations from backend
  const loadRealTimeRecommendations = async () => {
    try {
      if (!realTimeData) {
        console.error('No real-time data available, falling back to loadRecommendations');
        await loadRecommendations();
        return;
      }

      console.log('Processing real-time recommendations:', realTimeData);

      // Transform the real-time data into the expected format
      const transformedData = {
        tripItinerary: realTimeData.itinerary || [],
        hotels: realTimeData.hotels || [],
        agencies: realTimeData.agencies || [],
        guides: realTimeData.guides || [],
        restaurants: realTimeData.restaurants || [],
        activities: realTimeData.activities || [],
        budgetSummary: {
          duration: realTimeData.tripAnalysis?.duration ? `${realTimeData.tripAnalysis.duration} Days` : (realTimeData.itinerary?.length ? `${realTimeData.itinerary.length} Days` : "5 Days"),
          travelers: realTimeData.tripAnalysis?.groupSize || 2,
          accommodation: realTimeData.budget?.breakdown?.accommodation?.total !== undefined ? `$${Math.round(realTimeData.budget.breakdown.accommodation.total)}` : (realTimeData.budget?.breakdown?.accommodation?.perNight && realTimeData.tripAnalysis?.duration ? `$${Math.round(realTimeData.budget.breakdown.accommodation.perNight * realTimeData.tripAnalysis.duration)}` : "Calculating..."),
          activities: realTimeData.budget?.breakdown?.activities?.total !== undefined ? `$${Math.round(realTimeData.budget.breakdown.activities.total)}` : "Calculating...",
          meals: realTimeData.budget?.breakdown?.meals?.total !== undefined ? `$${Math.round(realTimeData.budget.breakdown.meals.total)}` : (realTimeData.budget?.breakdown?.meals?.perPersonPerDay && realTimeData.tripAnalysis?.duration && realTimeData.tripAnalysis?.groupSize ? `$${Math.round(realTimeData.budget.breakdown.meals.perPersonPerDay * realTimeData.tripAnalysis.duration * realTimeData.tripAnalysis.groupSize)}` : "Calculating..."),
          transportation: realTimeData.budget?.breakdown?.transportation?.total !== undefined ? `$${Math.round(realTimeData.budget.breakdown.transportation.total)}` : "Calculating...",
          permits: realTimeData.budget?.breakdown?.permits?.total !== undefined ? `$${Math.round(realTimeData.budget.breakdown.permits.total)}` : "Calculating...",
          guide: realTimeData.budget?.breakdown?.guide?.total !== undefined ? `$${Math.round(realTimeData.budget.breakdown.guide.total)}` : (realTimeData.budget?.breakdown?.guide?.perDay && realTimeData.tripAnalysis?.duration ? `$${Math.round(realTimeData.budget.breakdown.guide.perDay * realTimeData.tripAnalysis.duration)}` : "Calculating..."),
          total: realTimeData.budget?.summary?.total !== undefined ? `$${Math.round(realTimeData.budget.summary.total)}` : (realTimeData.budget?.summary?.perPerson && realTimeData.tripAnalysis?.groupSize ? `$${Math.round(realTimeData.budget.summary.perPerson * realTimeData.tripAnalysis.groupSize)}` : "Calculating...")
        },
        socialInsights: realTimeData.socialInsights || [],
        lastUpdated: realTimeData.lastUpdated || new Date().toISOString(),
        dataConfidence: realTimeData.dataConfidence || 'high'
      };

      // Enhance itinerary with location data
      if (transformedData.tripItinerary.length > 0) {
        const enhancedItinerary = transformedData.tripItinerary.map(day => ({
          ...day,
          hotels: realTimeData.hotels?.slice(0, 3) || [],
          restaurants: realTimeData.restaurants?.slice(0, 3) || [],
          agencies: realTimeData.agencies?.slice(0, 2) || [],
          guides: realTimeData.guides?.slice(0, 2) || [],
          activities: day.activities || []
        }));
        transformedData.tripItinerary = enhancedItinerary;
      }

      console.log('Transformed real-time data:', transformedData);
      
      // Check if we actually have any data
      const hasData = transformedData.hotels.length > 0 || 
                      transformedData.agencies.length > 0 || 
                      transformedData.guides.length > 0 || 
                      transformedData.restaurants.length > 0 ||
                      transformedData.activities.length > 0;
      
      if (!hasData) {
        console.warn('No real-time data found, falling back to loadRecommendations');
        await loadRecommendations();
        return;
      }
      
      setRecommendations(transformedData);
    } catch (error) {
      console.error('Error loading real-time recommendations:', error);
      // Fallback to original method
      await loadRecommendations();
    }
  };

  const loadRecommendations = async () => {
    // Parse side missions from trip plan
    const missions = await parseSideMissions(tripPlan);
    setSideMissions(missions);
    
    // Parse the actual trip plan from AI
    const fromPlan = deriveItineraryFromPlan(tripPlan);
    if (fromPlan.length === 0) {
      console.error('No trip plan found!');
      return;
    }

    const seedItinerary = fromPlan;

    const mockData = {
      tripItinerary: seedItinerary,
      hotels: [],
      agencies: [],
      guides: [],
      restaurants: [],
      budgetSummary: {
        duration: `${seedItinerary.length} Days`,
        travelers: 2,
        accommodation: "Calculating...",
        activities: "Calculating...",
        meals: "Calculating...",
        transportation: "Calculating...",
        permits: "Calculating...",
        guide: "Calculating...",
        total: "Calculating..."
      }
    };

    // Augment with live Google Maps/Places data
    try {
      console.log('Fetching real data from Google Maps API...');
      const augmented = await augmentWithOsm(mockData);
      console.log('Real data fetched successfully:', augmented);
      
      // Aggregate all hotels, restaurants, agencies, guides, and activities from all days
      const allHotels = [];
      const allRestaurants = [];
      const allAgencies = [];
      const allGuides = [];
      const allActivities = [];
      
      augmented.tripItinerary.forEach(day => {
        if (day.hotels) allHotels.push(...day.hotels);
        if (day.restaurants) allRestaurants.push(...day.restaurants);
        if (day.agencies) allAgencies.push(...day.agencies);
        if (day.guides) allGuides.push(...day.guides);
        if (day.activities) allActivities.push(...day.activities);
      });
      
      // Remove duplicates based on name
      const uniqueHotels = Array.from(new Map(allHotels.map(h => [h.name, h])).values());
      const uniqueRestaurants = Array.from(new Map(allRestaurants.map(r => [r.name, r])).values());
      const uniqueAgencies = Array.from(new Map(allAgencies.map(a => [a.name, a])).values());
      const uniqueGuides = Array.from(new Map(allGuides.map(g => [g.name, g])).values());
      const uniqueActivities = Array.from(new Map(allActivities.map(a => [a.name || a.activity || a, a])).values());
      
      augmented.hotels = uniqueHotels.slice(0, 4);
      augmented.restaurants = uniqueRestaurants.slice(0, 4);
      augmented.agencies = uniqueAgencies.slice(0, 4);
      augmented.guides = uniqueGuides.slice(0, 4);
      augmented.activities = uniqueActivities.slice(0, 4);
      
      console.log('Aggregated recommendations:', {
        hotels: augmented.hotels.length,
        restaurants: augmented.restaurants.length,
        agencies: augmented.agencies.length,
        guides: augmented.guides.length,
        activities: augmented.activities.length
      });
      
      setRecommendations(augmented);
    } catch (err) {
      console.error('Failed to fetch real data, using mock data:', err);
      setRecommendations(mockData);
    }
  };

  const handleBookNow = (item, type) => {
    // In real implementation, this would handle booking
    alert(`Booking ${item.name}... This would integrate with booking systems.`);
  };

  const handleContactNow = (contact) => {
    if (contact.phone) {
      window.open(`tel:${contact.phone}`);
    }
  };

  const handleViewDetails = (item, type) => {
    setSelectedDetail({ ...item, type });
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDetail(null);
  };

  if (isLoading) {
    return (
      <div className="booking-page loading">
        <div className="loading-container">
          <div className="loading-animation">
            <div className="search-icon">
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="#E76F51" strokeWidth="2"/>
                <path d="m21 21-4.35-4.35" stroke="#E76F51" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <h2>Finding the Best Recommendations for You</h2>
          <p className="loading-message">
            {currentStep === 'searching' && 'Searching travel websites...'}
            {currentStep === 'social' && 'Crawling social media reviews...'}
            {currentStep === 'google' && 'Analyzing Google reviews...'}
            {currentStep === 'filtering' && 'Filtering best recommendations...'}
            {currentStep === 'complete' && 'Complete!'}
          </p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <div className="booking-header">
        <button className="back-btn" onClick={() => navigate('/chat', { state: { preserveChat: true, tripPlan } })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Back to Chat
        </button>
        <h1>Your Personalized Recommendations</h1>
      </div>

      <div className="recommendations-container">
        <div className="recommendations-main">

        {/* Trip Timeline with Side Missions */}
        {recommendations.tripItinerary && recommendations.tripItinerary.length > 0 && (
          <section className="recommendation-section">
            <h2>Trip Itinerary</h2>
            <div className="trip-timeline">
              {recommendations.tripItinerary.map((day, index) => (
                <React.Fragment key={day.day || index}>
                  <div className="timeline-day">
                    <div className="day-header">
                      <div className="day-number">{day.day || index + 1}</div>
                      <div className="day-info">
                        <h3>{day.title || `Day ${day.day || index + 1}`}</h3>
                        <h4>{day.location}</h4>
                        {day.description && <p className="day-description">{day.description}</p>}
                      </div>
                    </div>
                  </div>
                  
                  {/* Side Mission between days (show after Day 1, Day 3, etc.) */}
                  {sideMissions.length > 0 && index > 0 && index % 2 === 0 && (
                    <div className="side-mission-card">
                      <div className="side-mission-header">
                        <h4>Side Mission</h4>
                        <p className="side-mission-subtitle">Support local businesses</p>
                      </div>
                      <div className="side-mission-businesses">
                        {sideMissions.slice(0, 2).map((business, idx) => (
                          <div key={idx} className="side-mission-business">
                            <div className="business-name">{business.name}</div>
                            <div className="business-location">{business.location}</div>
                            <div className="business-contact">{business.contact}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </section>
        )}

        {/* Hotels Section */}
        <section className="recommendation-section">
          <h2>Recommended Hotels</h2>
          <p className="section-description">Carefully selected hotels based on your trip destinations, budget, and preferences</p>
          <div className="recommendation-grid">
            {recommendations.hotels.map((hotel, index) => (
              <div key={index} className="recommendation-card">
                <div className="card-image">
                  <img src={hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop'} alt={hotel.name} />
                  <div className="location-box">{hotel.mapLocation || hotel.location}</div>
                </div>
                <div className="card-header">
                  <h3>{hotel.name}</h3>
                  <div className="rating">
                    {hotel.rating && <span className="stars">{'★'.repeat(Math.floor(hotel.rating))}</span>}
                    <span className="rating-number">{hotel.rating || 'N/A'}</span>
                    <span className="review-count">({hotel.reviewsCount || 0} reviews)</span>
                  </div>
                </div>
                <div className="card-content">
                  <p className="location">{hotel.location}</p>
                  <p className="price">{hotel.price || 'Contact for pricing'}</p>
                  <div className="amenities">
                    {(hotel.amenities || []).slice(0, 4).map((amenity, i) => (
                      <span key={i} className="amenity-tag">{amenity}</span>
                    ))}
                  </div>
                  <div className="contact-info">
                    <p>{hotel.contact?.phone || 'Contact available'}</p>
                    <p>{hotel.contact?.email || 'Email available'}</p>
                    {hotel.contact?.website && <p>{hotel.contact.website}</p>}
                  </div>
                </div>
                <div className="card-actions">
                  <button className="details-btn" onClick={() => handleViewDetails(hotel, 'hotel')}>
                    View Details
                  </button>
                  <button className="book-btn" onClick={() => handleBookNow(hotel, 'hotel')}>
                    Book Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Places to Visit Section */}
        <section className="recommendation-section">
          <h2>Must-Visit Places</h2>
          <p className="section-description">Top destinations and attractions based on your trip plan and real-time analysis</p>
          <div className="recommendation-grid">
            {(recommendations.activities || []).map((place, index) => (
              <div key={index} className="recommendation-card">
                <div className="card-image">
                  <img src={place.image || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&h=250&fit=crop'} alt={place.name} />
                  <div className="location-box">{place.mapLocation || place.location}</div>
                </div>
                <div className="card-header">
                  <h3>{place.name}</h3>
                  <div className="rating">
                    {place.rating && <span className="stars">{'★'.repeat(Math.floor(place.rating))}</span>}
                    <span className="rating-number">{place.rating || 'N/A'}</span>
                    <span className="review-count">({place.reviewsCount || 0} reviews)</span>
                  </div>
                </div>
                <div className="card-content">
                  <p className="location">{place.location}</p>
                  <p className="duration">{place.duration || 'Half day'}</p>
                  <p className="price">{place.price || 'Free entry'}</p>
                  <p className="description">{place.description}</p>
                  <div className="amenities">
                    {(place.amenities || []).slice(0, 3).map((feature, i) => (
                      <span key={i} className="amenity-tag">{feature}</span>
                    ))}
                  </div>
                </div>
                <div className="card-actions">
                  <button className="details-btn" onClick={() => handleViewDetails(place, 'place')}>
                    View Details
                  </button>
                  <button className="book-btn" onClick={() => handleBookNow(place, 'place')}>
                    Add to Plan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Travel Agencies Section */}
        <section className="recommendation-section">
          <h2>Recommended Travel Agencies</h2>
          <p className="section-description">Professional travel agencies with real-time reviews and verified credentials</p>
          <div className="recommendation-grid">
            {recommendations.agencies.map((agency, index) => (
              <div key={index} className="recommendation-card">
                <div className="card-image">
                  <img src={agency.image || 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=250&fit=crop'} alt={agency.name} />
                  <div className="location-box">{agency.mapLocation || agency.location}</div>
                </div>
                <div className="card-header">
                  <h3>{agency.name}</h3>
                  <div className="rating">
                    {agency.rating && <span className="stars">{'★'.repeat(Math.floor(agency.rating))}</span>}
                    <span className="rating-number">{agency.rating || 'N/A'}</span>
                    <span className="review-count">({agency.reviewsCount || agency.reviews || 0} reviews)</span>
                  </div>
                </div>
                <div className="card-content">
                  <p className="location">{agency.location}</p>
                  <p className="speciality">{agency.speciality || 'Full service travel agency'}</p>
                  <div className="services">
                    {(agency.services || agency.amenities || []).slice(0, 4).map((service, i) => (
                      <span key={i} className="service-tag">{service}</span>
                    ))}
                  </div>
                  <div className="contact-info">
                    <p>{agency.contact?.phone || 'Contact available'}</p>
                    <p>{agency.contact?.email || 'Email available'}</p>
                    {agency.contact?.website && <p>{agency.contact.website}</p>}
                  </div>
                </div>
                <div className="card-actions">
                  <button className="details-btn" onClick={() => handleViewDetails(agency, 'agency')}>
                    View Details
                  </button>
                  <button className="book-btn" onClick={() => handleBookNow(agency, 'agency')}>
                    Get Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Guides Section */}
        <section className="recommendation-section">
          <h2>🥾 Recommended Local Guides</h2>
          <p className="section-description">Experienced local guides with verified credentials and real-time reviews</p>
          <div className="recommendation-grid">
            {recommendations.guides.map((guide, index) => (
              <div key={index} className="recommendation-card">
                <div className="card-image">
                  <img src={guide.image || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=250&fit=crop'} alt={guide.name} />
                  <div className="location-box">{guide.mapLocation || guide.location}</div>
                </div>
                <div className="card-header">
                  <h3>{guide.name}</h3>
                  <div className="rating">
                    {guide.rating && <span className="stars">{'★'.repeat(Math.floor(guide.rating))}</span>}
                    <span className="rating-number">{guide.rating || 'N/A'}</span>
                    <span className="review-count">({guide.reviewsCount || guide.reviews || 0} reviews)</span>
                  </div>
                </div>
                <div className="card-content">
                  <p className="experience">🎖️ {guide.experience || '5+ years'} experience</p>
                  <p className="speciality">🏔️ {guide.speciality || 'Mountain trekking & cultural tours'}</p>
                  <div className="languages">
                    <strong>Languages:</strong> {(guide.languages || ['English', 'Nepali']).join(', ')}
                  </div>
                  <div className="certifications">
                    {(guide.certifications || guide.amenities || []).slice(0, 3).map((cert, i) => (
                      <span key={i} className="cert-tag">{cert}</span>
                    ))}
                  </div>
                  <div className="contact-info">
                    <p>{guide.contact?.phone || 'Contact available'}</p>
                    <p>{guide.contact?.email || 'Email available'}</p>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="details-btn" onClick={() => handleViewDetails(guide, 'guide')}>
                    View Details
                  </button>
                  <button className="book-btn" onClick={() => handleBookNow(guide, 'guide')}>
                    Hire Guide
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Restaurants Section */}
        <section className="recommendation-section">
          <h2>Recommended Restaurants</h2>
          <p className="section-description">Top-rated restaurants and local eateries based on your trip destinations and real-time reviews</p>
          <div className="recommendation-grid">
            {recommendations.restaurants.map((restaurant, index) => (
              <div key={index} className="recommendation-card">
                <div className="card-image">
                  <img src={restaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=250&fit=crop'} alt={restaurant.name} />
                  <div className="location-box">{restaurant.mapLocation || restaurant.location}</div>
                </div>
                <div className="card-header">
                  <h3>{restaurant.name}</h3>
                  <div className="rating">
                    {restaurant.rating && <span className="stars">{'★'.repeat(Math.floor(restaurant.rating))}</span>}
                    <span className="rating-number">{restaurant.rating || 'N/A'}</span>
                    <span className="review-count">({restaurant.reviewsCount || restaurant.reviews || 0} reviews)</span>
                  </div>
                </div>
                <div className="card-content">
                  <p className="location">{restaurant.location}</p>
                  <p className="cuisine">{restaurant.cuisine || 'Local cuisine'}</p>
                  <p className="price-range">{restaurant.priceRange || restaurant.price || 'Moderate pricing'}</p>
                  <div className="amenities">
                    {(restaurant.amenities || []).slice(0, 3).map((feature, i) => (
                      <span key={i} className="amenity-tag">{feature}</span>
                    ))}
                  </div>
                  <div className="contact-info">
                    <p>{restaurant.contact?.phone || 'Contact available'}</p>
                    <p>{restaurant.contact?.email || 'Email available'}</p>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="details-btn" onClick={() => handleViewDetails(restaurant, 'restaurant')}>
                    View Details
                  </button>
                  <button className="book-btn" onClick={() => handleBookNow(restaurant, 'restaurant')}>
                    Reserve Table
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
        </div>


        {/* Detail Modal */}
        {showDetailModal && selectedDetail && (
          <div className="detail-modal-overlay" onClick={closeDetailModal}>
            <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedDetail.name}</h2>
                <button className="close-modal-btn" onClick={closeDetailModal}>×</button>
              </div>
              
              <div className="modal-content">
                <div className="modal-main">
                  <div className="modal-gallery">
                    <div className="main-image">
                      <img src={selectedDetail.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop'} alt={selectedDetail.name} />
                    </div>
                    {selectedDetail.gallery && (
                      <div className="gallery-thumbnails">
                        {selectedDetail.gallery.map((img, index) => (
                          <img key={index} src={img} alt={`${selectedDetail.name} ${index + 1}`} />
                        ))}
                      </div>
                    )}
                    {/* Exact Map Location */}
                    {selectedDetail.lat && selectedDetail.lon && (
                      <div className="modal-map-block">
                        <GoogleMapPreview lat={selectedDetail.lat} lon={selectedDetail.lon} name={selectedDetail.name} height={220} />
                        <div className="map-links">
                          <a href={`https://www.google.com/maps/search/?api=1&query=${selectedDetail.lat},${selectedDetail.lon}`} target="_blank" rel="noreferrer">View on Google Maps</a>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="modal-details">
                    <div className="detail-rating">
                      {selectedDetail.rating && <span className="stars">{'★'.repeat(Math.floor(selectedDetail.rating))}</span>}
                      {selectedDetail.rating && <span className="rating-number">{selectedDetail.rating}</span>}
                      {(() => { const c = selectedDetail.reviewsCount ?? (Array.isArray(selectedDetail.reviews) ? selectedDetail.reviews.length : null); return c ? <span className="review-count">({c} reviews)</span> : null; })()}
                    </div>

                    <div className="detail-location">
                      <h4>Location</h4>
                      <p>{selectedDetail.location}</p>
                      {selectedDetail.mapLocation && (
                        <p className="coordinates">{selectedDetail.mapLocation}</p>
                      )}
                    </div>

                    {selectedDetail.contact && (
                      <div className="detail-contact">
                        <h4>Contact Information</h4>
                        <p>Phone: {selectedDetail.contact.phone}</p>
                        <p>Email: {selectedDetail.contact.email}</p>
                        {selectedDetail.contact.website && (
                          <p>Website: {selectedDetail.contact.website}</p>
                        )}
                      </div>
                    )}

                    {selectedDetail.amenities && (
                      <div className="detail-amenities">
                        <h4>Amenities</h4>
                        <div className="amenities-grid">
                          {selectedDetail.amenities.map((amenity, index) => (
                            <span key={index} className="amenity-badge">{amenity}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedDetail.priceRange && (
                      <div className="detail-price">
                        <h4>Price Range</h4>
                        <p>{selectedDetail.priceRange}</p>
                      </div>
                    )}

                    {selectedDetail.price && (
                      <div className="detail-price">
                        <h4>Price</h4>
                        <p>{selectedDetail.price}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-reviews">
                  <h4>Recent Reviews</h4>
                  <div className="reviews-list">
                    {(selectedDetail.reviews?.length ? selectedDetail.reviews : (selectedDetail.googleReviews || [])).map((review, index) => (
                      <div key={index} className="review-item">
                        <div className="review-header">
                          <span className="reviewer-name">{review.author || `Traveler ${index + 1}`}</span>
                          {review.rating ? (
                            <span className="review-stars">{'★'.repeat(Math.round(review.rating))}</span>
                          ) : (
                            <span className="review-stars">{'★'.repeat(5)}</span>
                          )}
                        </div>
                        <p className="review-text">"{review.text || review}"</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button 
                    className="contact-modal-btn"
                    onClick={() => handleContactNow(selectedDetail.contact)}
                  >
                    Contact Now
                  </button>
                  <button 
                    className="book-modal-btn"
                    onClick={() => handleBookNow(selectedDetail, selectedDetail.type)}
                  >
                    {selectedDetail.type === 'restaurant' ? 'Reserve Table' : 
                     selectedDetail.type === 'activity' ? 'Book Activity' : 'Book Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookingPage;
