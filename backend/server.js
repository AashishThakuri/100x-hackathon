const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import services
const TripPlanningService = require('./services/tripPlanningService');
const GooglePlacesService = require('./services/googlePlacesService');
const RealTimeAnalyzer = require('./services/realTimeAnalyzer');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize services
const tripPlanner = new TripPlanningService();
const placesService = new GooglePlacesService();
const analyzer = new RealTimeAnalyzer();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Nepal Travel Planner API - Real-time recommendations powered by AI' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

// Main trip planning endpoint
app.post('/api/plan-trip', async (req, res) => {
  try {
    const { conversationHistory } = req.body;
    
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({ 
        error: 'Conversation history is required and must be an array' 
      });
    }

    console.log('Processing trip planning request...');
    const recommendations = await tripPlanner.processTouristResponses(conversationHistory);
    
    res.json({
      success: true,
      data: recommendations,
      message: 'Trip recommendations generated successfully'
    });
  } catch (error) {
    console.error('Trip planning error:', error);
    res.status(500).json({ 
      error: 'Failed to generate trip recommendations',
      details: error.message 
    });
  }
});

// Google Places integration endpoints
app.get('/api/places/search', async (req, res) => {
  try {
    const { location, type, limit = 10 } = req.query;
    
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is required' });
    }

    const places = await placesService.searchPlacesByType(location, type, parseInt(limit));
    
    res.json({
      success: true,
      data: places,
      count: places.length
    });
  } catch (error) {
    console.error('Places search error:', error);
    res.status(500).json({ error: 'Failed to search places' });
  }
});

app.get('/api/places/details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const details = await placesService.getPlaceDetails(placeId);
    
    if (!details) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('Place details error:', error);
    res.status(500).json({ error: 'Failed to get place details' });
  }
});

app.get('/api/places/photo', async (req, res) => {
  try {
    const { photoReference, maxWidth = 800 } = req.query;
    
    if (!photoReference) {
      return res.status(400).json({ error: 'Photo reference is required' });
    }

    const photoUrl = await placesService.getPlacePhoto(photoReference, parseInt(maxWidth));
    
    if (!photoUrl) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Redirect to the actual photo URL
    res.redirect(photoUrl);
  } catch (error) {
    console.error('Photo error:', error);
    res.status(500).json({ error: 'Failed to get photo' });
  }
});

// Real-time analysis endpoints
app.post('/api/analyze/conversation', async (req, res) => {
  try {
    const { conversationHistory } = req.body;
    const analysis = await analyzer.analyzeTouristResponses(conversationHistory);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Conversation analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze conversation' });
  }
});

app.get('/api/scrape/hotels', async (req, res) => {
  try {
    const { location, checkIn, checkOut, guests = 2 } = req.query;
    
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is required' });
    }

    const hotels = await analyzer.scrapeGoogleHotels(location, checkIn, checkOut, parseInt(guests));
    
    res.json({
      success: true,
      data: hotels,
      count: hotels.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Hotel scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape hotel data' });
  }
});

app.get('/api/scrape/social-reviews', async (req, res) => {
  try {
    const { location, businessName } = req.query;
    
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is required' });
    }

    const reviews = await analyzer.scrapeSocialMediaReviews(location, businessName);
    
    res.json({
      success: true,
      data: reviews,
      count: reviews.length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Social media scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape social media reviews' });
  }
});

// Geocoding endpoint
app.get('/api/geocode', async (req, res) => {
  try {
    const { location } = req.query;
    
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is required' });
    }

    const geocode = await placesService.geocodeLocation(location);
    
    if (!geocode) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({
      success: true,
      data: geocode
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({ error: 'Failed to geocode location' });
  }
});

// Get comprehensive location data
app.get('/api/location-data/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const locationData = await placesService.getLocationData(decodeURIComponent(location));
    
    if (!locationData) {
      return res.status(404).json({ error: 'Location data not found' });
    }

    res.json({
      success: true,
      data: locationData
    });
  } catch (error) {
    console.error('Location data error:', error);
    res.status(500).json({ error: 'Failed to get location data' });
  }
});

// Missing API endpoints that BookingPage needs
app.get('/api/maps/geocode', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    console.log(`Geocoding request for: ${q}`);
    const geocode = await placesService.geocodeLocation(q);
    
    if (!geocode) {
      console.warn(`Geocode not found for: ${q}`);
      return res.json({
        success: false,
        result: null,
        message: 'Location not found or API key not configured'
      });
    }

    res.json({
      success: true,
      result: {
        lat: geocode.lat,
        lon: geocode.lng,
        display_name: geocode.formatted_address
      }
    });
  } catch (error) {
    console.error('Maps geocode error:', error);
    res.json({
      success: false,
      result: null,
      error: error.message
    });
  }
});

app.get('/api/places/nearby', async (req, res) => {
  try {
    const { lat, lon, type, radius = 5000 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const places = await placesService.searchNearbyPlaces(
      parseFloat(lat), 
      parseFloat(lon), 
      type, 
      parseInt(radius)
    );

    res.json({
      success: true,
      results: places.map(place => ({
        name: place.name,
        lat: place.geometry?.location?.lat,
        lon: place.geometry?.location?.lng,
        place_id: place.place_id,
        address: place.vicinity,
        rating: place.rating,
        reviewsCount: place.user_ratings_total,
        types: place.types,
        photo_reference: place.photos?.[0]?.photo_reference
      }))
    });
  } catch (error) {
    console.error('Places nearby error:', error);
    res.status(500).json({ error: 'Failed to search nearby places' });
  }
});

app.get('/api/places/reviews', async (req, res) => {
  try {
    const { place_id } = req.query;
    
    if (!place_id) {
      return res.status(400).json({ error: 'Place ID is required' });
    }

    const details = await placesService.getPlaceDetails(place_id);
    
    if (!details) {
      return res.status(404).json({ error: 'Place not found' });
    }

    res.json({
      success: true,
      result: {
        rating: details.rating,
        user_ratings_total: details.user_ratings_total,
        reviews: details.reviews || [],
        photos: details.photos || []
      }
    });
  } catch (error) {
    console.error('Places reviews error:', error);
    res.status(500).json({ error: 'Failed to get place reviews' });
  }
});

// Legacy endpoints for backward compatibility
app.get('/api/data', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: 'Trip Planning Service', description: 'AI-powered trip planning with real-time data' },
      { id: 2, name: 'Places Service', description: 'Google Places integration for venue data' },
      { id: 3, name: 'Real-time Analyzer', description: 'Web scraping and social media analysis' }
    ]
  });
});

app.post('/api/data', (req, res) => {
  const { name, description } = req.body;
  res.json({
    success: true,
    message: 'Data received',
    data: { id: 4, name, description }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
