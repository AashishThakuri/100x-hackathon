const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Warn early if keys are missing/misconfigured
if (!process.env.GEMINI_API_KEY) {
  console.warn('[WARN] GEMINI_API_KEY is not set. /api/chat and AI features will fail.');
}
if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error('❌ [CRITICAL] GOOGLE_PLACES_API_KEY is not set!');
  console.error('   Please add GOOGLE_PLACES_API_KEY to backend/.env file');
  console.error('   Real-time place details and reviews will be empty.');
} else {
  console.log('✅ GOOGLE_PLACES_API_KEY is configured');
}

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

// Businesses API - returns businesses from "List Your Business" feature
app.get('/api/businesses', (req, res) => {
  try {
    const { location } = req.query;
    
    // Sample businesses data (in production, this would come from a database)
    const businesses = [
      {
        id: 1,
        name: 'Ama Ko Chiya Pasal',
        category: 'Restaurant & Cafe',
        location: 'Thamel, Kathmandu',
        contact: '+977-1-4441234',
        email: 'amakochiya@gmail.com'
      },
      {
        id: 2,
        name: 'Sherpa Guide Service',
        category: 'Tour & Travel',
        location: 'Namche Bazaar, Everest Region',
        contact: '+977-38-540123',
        email: 'sherpaguide@yahoo.com'
      },
      {
        id: 3,
        name: 'Magar Handicrafts',
        category: 'Arts & Crafts',
        location: 'Pokhara, Kaski',
        contact: '+977-61-462345',
        email: 'magarcraft@hotmail.com'
      },
      {
        id: 4,
        name: 'Gurung Family Lodge',
        category: 'Accommodation',
        location: 'Ghandruk, Annapurna Region',
        contact: '+977-61-460789',
        email: 'gurungfamily@gmail.com'
      },
      {
        id: 5,
        name: 'Tharu Organic Farm',
        category: 'Agriculture & Food',
        location: 'Chitwan District',
        contact: '+977-56-420567',
        email: 'tharuorganic@gmail.com'
      },
      {
        id: 6,
        name: 'Local Tailor Shop',
        category: 'Other',
        location: 'Bhaktapur',
        contact: '+977-1-6612890',
        email: 'localtailor@yahoo.com'
      },
      {
        id: 7,
        name: 'Newari Momo Corner',
        category: 'Restaurant & Cafe',
        location: 'Bhaktapur Durbar Square',
        contact: '+977-1-6615678',
        email: 'newarimomo@gmail.com'
      },
      {
        id: 8,
        name: 'Tamang Weaving Center',
        category: 'Arts & Crafts',
        location: 'Rasuwa District',
        contact: '+977-10-560234',
        email: 'tamangweaving@yahoo.com'
      }
    ];
    
    // Filter by location if provided
    let filteredBusinesses = businesses;
    if (location) {
      const locationLower = location.toLowerCase();
      filteredBusinesses = businesses.filter(b => 
        b.location.toLowerCase().includes(locationLower) ||
        locationLower.includes(b.location.toLowerCase().split(',')[0])
      );
    }
    
    // Return minimalistic format: name, location, contact only
    const minimalBusinesses = filteredBusinesses.map(b => ({
      name: b.name,
      location: b.location,
      contact: b.contact
    }));
    
    res.json({ 
      success: true, 
      businesses: minimalBusinesses,
      count: minimalBusinesses.length
    });
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch businesses' });
  }
});

// Secure chat endpoint: generates assistant replies server-side (keeps API key private)
app.get('/api/chat', (req, res) => {
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'Use POST /api/chat with JSON body to get a response from the assistant.',
    example: {
      systemPrompt: 'You are a helpful travel planner for Nepal.',
      messages: [
        { role: 'user', content: 'Plan a 1-day trip in Kathmandu' }
      ]
    }
  });
});

app.post('/api/chat', async (req, res) => {
  try {
  const { systemPrompt, messages, model: requestedModel, maxTokens } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Optional override via header (useful for local dev). NOTE: This exposes your key to the server logs and is not recommended for production.
    const overrideKey = req.headers['x-gemini-api-key'];
  const aiClient = overrideKey ? new GoogleGenerativeAI(overrideKey) : genAI;

    // Prefer gemini-2.5-flash; gracefully fall back if not available
    const candidateModels = [
      requestedModel || 'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash'
    ];

    const history = messages
      .slice(0, -1)
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const userMsg = messages[messages.length - 1]?.content || '';
    const prompt = systemPrompt ? `${systemPrompt}\n\nUser message: ${userMsg}` : userMsg;

    let text = '';
    let lastErr = null;
    for (const modelName of candidateModels) {
      try {
        const model = aiClient.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
          history,
          generationConfig: { maxOutputTokens: Math.min(Number(maxTokens) || 4096, 8192), temperature: 0.75 },
        });
        const result = await chat.sendMessage(prompt);
        text = result?.response?.text?.() || '';
        if (text) {
          res.setHeader('x-model-used', modelName);
          break;
        }
      } catch (e) {
        lastErr = e;
        continue;
      }
    }

    if (!text) {
      throw lastErr || new Error('No text generated');
    }

    return res.json({ success: true, text });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({ error: 'Failed to generate response', details: err.message });
  }
});

// Main trip planning endpoint
app.post('/api/plan-trip', async (req, res) => {
  try {
    const { conversationHistory, mode } = req.body || {};
    const modeFromQuery = req.query.mode;
    const effectiveMode = modeFromQuery || mode || 'fast';
    
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({ 
        error: 'Conversation history is required and must be an array' 
      });
    }

    console.log('Processing trip planning request...');
  const recommendations = await tripPlanner.processTouristResponses(conversationHistory, { mode: effectiveMode });
    
    res.json({
      success: true,
      data: recommendations,
      message: 'Trip recommendations generated successfully',
      mode: effectiveMode
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
    const photoReference = req.query.photoReference || req.query.ref || req.query.photoreference;
    const maxWidth = parseInt(req.query.maxWidth || req.query.maxwidth || 800);

    if (!photoReference) {
      return res.status(400).json({ error: 'Photo reference is required' });
    }

    if (!process.env.GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({ error: 'Google Places API key not configured' });
    }

    // Proxy the image to avoid CORS and 403 errors
    const axios = require('axios');
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?photoreference=${photoReference}&maxwidth=${maxWidth}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
    
    try {
      const response = await axios.get(photoUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'image/*'
        }
      });

      // Determine content type from response
      const contentType = response.headers['content-type'] || 'image/jpeg';
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.send(response.data);
    } catch (proxyError) {
      console.error('Photo proxy error:', proxyError.message);
      // Fallback: redirect to the URL (may have CORS/403 issues but better than nothing)
      res.redirect(photoUrl);
    }
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
    const { lat, lon } = req.query;
    let { type, radius = 10000, keyword } = req.query;
    
    if (!lat || !lon) {
      return res.json({ success: false, error: 'Latitude and longitude are required', results: [] });
    }

    // Check if API key is set
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      console.error('❌ GOOGLE_PLACES_API_KEY is not set!');
      return res.json({ 
        success: false, 
        error: 'Google Places API key not configured',
        results: [],
        message: 'Please configure GOOGLE_PLACES_API_KEY in backend/.env file'
      });
    }

    // Normalize frontend types to Google Places types
    const t = (type || '').toLowerCase();
    let places = [];
    
    console.log(`🔍 Searching for ${type} near ${lat}, ${lon} with radius ${radius}m`);

    if (t === 'guide') {
      // Use text search for guides
      try {
        // Get location name from reverse geocoding
        const axios = require('axios');
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
        const geoResponse = await axios.get(geocodeUrl);
        let locationName = 'Pokhara, Nepal';
        
        if (geoResponse.data?.results?.length > 0) {
          const addressComponents = geoResponse.data.results[0].address_components;
          const cityComponent = addressComponents.find(c => c.types.includes('locality'));
          if (cityComponent) {
            locationName = `${cityComponent.long_name}, Nepal`;
          }
        }
        places = await placesService.searchGuides(locationName, 15);
      } catch (err) {
        console.error('❌ Guide search error:', err.message);
        places = [];
      }
    } else {
      // Map frontend types to Google Places types
      if (t === 'hotel') type = 'lodging';
      else if (t === 'agency') type = 'travel_agency';
      else if (t === 'attraction' || t === 'place') type = 'tourist_attraction';
      else if (t === 'restaurant') type = 'restaurant';

      // First try nearby search
      places = await placesService.searchNearbyPlaces(
        parseFloat(lat),
        parseFloat(lon),
        type,
        parseInt(radius),
        keyword
      );

      // If nearby search returns few results, try text search as fallback
      if (places.length < 5 && type) {
        console.log(`⚠️ Nearby search returned ${places.length} results, trying text search...`);
        
        const axios = require('axios');
        let locationName = 'Pokhara';
        try {
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
          const geoResponse = await axios.get(geocodeUrl);
          if (geoResponse.data?.results?.length > 0) {
            const addressComponents = geoResponse.data.results[0].address_components;
            const cityComponent = addressComponents.find(c => 
              c.types.includes('locality') || c.types.includes('administrative_area_level_2')
            );
            if (cityComponent) {
              locationName = cityComponent.long_name;
            }
          }
        } catch (e) {
          console.warn('⚠️ Reverse geocoding failed');
        }

        let query = '';
        if (type === 'lodging') query = `hotels ${locationName} Nepal`;
        else if (type === 'restaurant') query = `restaurants ${locationName} Nepal`;
        else if (type === 'travel_agency') query = `travel agencies ${locationName} Nepal`;
        else if (type === 'tourist_attraction') query = `tourist attractions ${locationName} Nepal`;

        const textResults = await placesService.textSearch(query, locationName);
        const existingIds = new Set(places.map(p => p.place_id));
        const newResults = textResults.filter(p => !existingIds.has(p.place_id));
        places = [...places, ...newResults];
        console.log(`✅ After text search: ${places.length} total results`);
      }
    }

    const results = places.map(place => ({
      name: place.name,
      lat: place.geometry?.location?.lat || place.geometry?.lat,
      lon: place.geometry?.location?.lng || place.geometry?.lng,
      place_id: place.place_id,
      address: place.vicinity || place.formatted_address || place.address || '',
      rating: place.rating,
      reviewsCount: place.user_ratings_total,
      types: place.types,
      photo_reference: place.photos?.[0]?.photo_reference || place.photo_reference
    }));

    console.log(`✅ Returning ${results.length} results for ${type || t}`);

    res.json({
      success: true,
      results: results,
      count: results.length
    });
  } catch (error) {
    console.error('❌ Places nearby error:', error);
    res.json({ 
      success: false, 
      error: 'Failed to search nearby places', 
      details: error.message,
      results: []
    });
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
