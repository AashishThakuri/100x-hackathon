const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const GooglePlacesService = require('./googlePlacesService');

class RealTimeAnalyzer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.placesService = new GooglePlacesService();
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  // Analyze tourist responses and create precise trip plan
  async analyzeTouristResponses(conversationHistory) {
    try {
      let model;
      const candidates = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'];
      for (const name of candidates) {
        try { model = this.genAI.getGenerativeModel({ model: name }); break; } catch { continue; }
      }
      
      const analysisPrompt = `
        Analyze this conversation history and extract detailed trip planning information:
        ${JSON.stringify(conversationHistory)}
        
        Extract and return a JSON object with:
        {
          "destination": "specific location in Nepal",
          "duration": "number of days",
          "budget": "budget range in USD",
          "travelStyle": "luxury/mid-range/budget/backpacking",
          "interests": ["list of specific interests"],
          "groupSize": "number of people",
          "accommodation": "preferred type",
          "activities": ["specific activities mentioned"],
          "travelDates": "when they want to travel",
          "specialRequirements": ["any special needs"],
          "confidence": "high/medium/low based on information completeness"
        }
      `;

      const result = await model.generateContent(analysisPrompt);
      let responseText = result.response.text();
      
      // Remove markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const analysis = JSON.parse(responseText);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing tourist responses:', error);
      return null;
    }
  }

  // NOTE: Removed all scraping. We now use official Google Places API data via GooglePlacesService.

  // Get real-time pricing from multiple sources
  async getRealTimePricing(location, tripDetails) {
    try {
      const pricing = {
        hotels: [],
        restaurants: [],
        activities: [],
        transportation: [],
        totalEstimate: 0
      };

      // Use Google Places data for hotel pricing approximation
      const locData = await this.placesService.getLocationData(location);
      const hotels = locData?.hotels || [];
      pricing.hotels = hotels.map(hotel => ({
        name: hotel.name,
        pricePerNight: hotel.price_level ? hotel.price_level * 25 : undefined,
        rating: hotel.rating,
        source: 'Google Places'
      }));

      // Calculate average hotel cost
      const avgHotelPrice = pricing.hotels.reduce((sum, hotel) => sum + (hotel.pricePerNight || 0), 0) / pricing.hotels.length || 50;
      
      // Estimate other costs based on location and travel style
      const baseCosts = this.getBaseCosts(location, tripDetails.travelStyle);
      
      pricing.restaurants = baseCosts.restaurants;
      pricing.activities = baseCosts.activities;
      pricing.transportation = baseCosts.transportation;
      
      // Calculate total estimate
      const duration = parseInt(tripDetails.duration) || 7;
      pricing.totalEstimate = (avgHotelPrice * duration) + 
                             (baseCosts.dailyFood * duration) + 
                             baseCosts.activities.reduce((sum, act) => sum + act.price, 0) +
                             baseCosts.transportation.total;

      return pricing;
    } catch (error) {
      console.error('Error getting real-time pricing:', error);
      return null;
    }
  }

  // Helper method to extract price from text
  extractPrice(priceText) {
    if (!priceText) return 0;
    const match = priceText.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, '')) : 0;
  }

  // Get base costs for different locations and travel styles
  getBaseCosts(location, travelStyle = 'mid-range') {
    const costMultipliers = {
      'luxury': 3,
      'mid-range': 1.5,
      'budget': 1,
      'backpacking': 0.7
    };

    const multiplier = costMultipliers[travelStyle] || 1.5;
    
    return {
      dailyFood: 25 * multiplier,
      restaurants: [
        { name: 'Local Restaurant', type: 'Local Cuisine', price: 15 * multiplier },
        { name: 'Mid-range Restaurant', type: 'International', price: 30 * multiplier },
        { name: 'Fine Dining', type: 'Upscale', price: 60 * multiplier }
      ],
      activities: [
        { name: 'City Tour', price: 40 * multiplier },
        { name: 'Trekking Guide', price: 50 * multiplier },
        { name: 'Cultural Experience', price: 25 * multiplier },
        { name: 'Adventure Activity', price: 80 * multiplier }
      ],
      transportation: {
        localTransport: 10 * multiplier,
        intercityBus: 20 * multiplier,
        domesticFlight: 150 * multiplier,
        total: 100 * multiplier
      }
    };
  }

  // Comprehensive analysis combining all data sources
  async generateComprehensiveRecommendations(tripAnalysis, options = {}, locationDataOverride = null) {
    try {
      console.log('Generating comprehensive recommendations for:', tripAnalysis);
      
      // Parallel data fetching
      const mode = options.mode || 'fast';
      const [locationData, pricingData] = await Promise.all([
        Promise.resolve(locationDataOverride || this.placesService.getLocationData(tripAnalysis.destination, options)),
        this.getRealTimePricing(tripAnalysis.destination, tripAnalysis)
      ]);

      // Check if we have any data at all
      if (!locationData) {
        console.error('❌ No location data available');
        return {
          hotels: [],
          restaurants: [],
          activities: [],
          agencies: [],
          guides: [],
          budgetBreakdown: pricingData || {},
          itinerary: this.generateBasicItinerary(tripAnalysis),
          lastUpdated: new Date().toISOString(),
          dataSource: 'None - API error or no data',
          confidence: 'low'
        };
      }

      // Use AI to analyze and rank all collected data
      // Fast mode: return structured, ranked recommendations without LLM
      // Filter recommendations based on trip plan destination and interests
      if (mode === 'fast') {
        const byRating = (arr) => (arr || []).slice().sort((a,b) => (b.rating||0) - (a.rating||0));
        
        // Filter and limit to 4 recommendations per category based on trip plan
        const destinationLower = (tripAnalysis.destination || '').toLowerCase();
        const interests = (tripAnalysis.interests || []).map(i => i.toLowerCase());
        
        // Filter hotels based on destination
        let filteredHotels = (locationData?.hotels || []).filter(h => {
          const address = (h.formatted_address || h.vicinity || h.address || '').toLowerCase();
          return !destinationLower || address.includes(destinationLower) || destinationLower.includes(address.split(',')[0]);
        });
        const hotels = byRating(filteredHotels).slice(0, 4);
        
        // Filter restaurants
        let filteredRestaurants = (locationData?.restaurants || []).filter(r => {
          const address = (r.formatted_address || r.vicinity || r.address || '').toLowerCase();
          return !destinationLower || address.includes(destinationLower) || destinationLower.includes(address.split(',')[0]);
        });
        const restaurants = byRating(filteredRestaurants).slice(0, 4);
        
        // Filter activities based on interests and destination
        let filteredActivities = (locationData?.attractions || []).filter(a => {
          const address = (a.formatted_address || a.vicinity || a.address || '').toLowerCase();
          const name = (a.name || '').toLowerCase();
          const types = (a.types || []).join(' ').toLowerCase();
          const matchesDestination = !destinationLower || address.includes(destinationLower) || destinationLower.includes(address.split(',')[0]);
          const matchesInterests = interests.length === 0 || interests.some(i => name.includes(i) || types.includes(i));
          return matchesDestination && matchesInterests;
        });
        const activities = byRating(filteredActivities).slice(0, 4);
        
        const agencies = byRating(locationData?.agencies || []).slice(0, 4);
        const guides = byRating(locationData?.guides || []).slice(0, 4);
        
        console.log(`✅ Fast mode recommendations: ${hotels.length} hotels, ${restaurants.length} restaurants, ${activities.length} activities, ${agencies.length} agencies, ${guides.length} guides`);
        
        return {
          hotels,
          restaurants,
          activities,
          agencies,
          guides,
          budgetBreakdown: pricingData || {},
          itinerary: this.generateBasicItinerary(tripAnalysis),
          lastUpdated: new Date().toISOString(),
          dataSource: 'Google Places (fast mode)',
          confidence: locationData?.hotels?.length > 0 ? (tripAnalysis.confidence || 'high') : 'low'
        };
      }

      // Full mode: Use AI to analyze and rank collected data
      let model;
      const candidates = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'];
      for (const name of candidates) {
        try { model = this.genAI.getGenerativeModel({ model: name }); break; } catch { continue; }
      }
      
      const byRating = (arr) => (arr || []).slice().sort((a,b) => (b.rating||0) - (a.rating||0));
      
      const analysisPrompt = `Create the best recommendations based only on this REAL DATA from Google Places API.
Trip Details: ${JSON.stringify(tripAnalysis)}
Hotels: ${JSON.stringify((locationData?.hotels || []).slice(0, 10))}
Restaurants: ${JSON.stringify((locationData?.restaurants || []).slice(0, 10))}
Attractions: ${JSON.stringify((locationData?.attractions || []).slice(0, 10))}
Travel Agencies: ${JSON.stringify((locationData?.agencies || []).slice(0, 10))}
Guides: ${JSON.stringify((locationData?.guides || []).slice(0, 10))}
Pricing: ${JSON.stringify(pricingData)}

Return JSON with ONLY the actual data provided (no fake/dummy data):
- hotels (top 5-10 from the data above)
- restaurants (top 5-10 from the data above)
- activities (top 5-10 from attractions above)
- agencies (top 3-5 from the data above)
- guides (top 3-5 from the data above)
- budgetBreakdown (from pricing data)
- itinerary (array based on trip details)
- lastUpdated, confidence

IMPORTANT: Only return real places from the data provided, never create fake recommendations.
`;
      const result = await model.generateContent(analysisPrompt);
      let recommendations;
      try {
        const responseText = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        recommendations = JSON.parse(responseText);
        
        // Always ensure we use real data from locationData, not AI-generated fake data
        // Filter to only include places that exist in our real data
        const hotelNames = new Set((locationData?.hotels || []).map(h => h.name?.toLowerCase()));
        const restaurantNames = new Set((locationData?.restaurants || []).map(r => r.name?.toLowerCase()));
        const attractionNames = new Set((locationData?.attractions || []).map(a => a.name?.toLowerCase()));
        const agencyNames = new Set((locationData?.agencies || []).map(a => a.name?.toLowerCase()));
        const guideNames = new Set((locationData?.guides || []).map(g => g.name?.toLowerCase()));
        
        // Filter recommendations to only include real places
        if (recommendations.hotels) {
          recommendations.hotels = recommendations.hotels.filter(h => hotelNames.has(h.name?.toLowerCase()));
        }
        if (recommendations.restaurants) {
          recommendations.restaurants = recommendations.restaurants.filter(r => restaurantNames.has(r.name?.toLowerCase()));
        }
        if (recommendations.activities) {
          recommendations.activities = recommendations.activities.filter(a => attractionNames.has(a.name?.toLowerCase()));
        }
        if (recommendations.agencies) {
          recommendations.agencies = recommendations.agencies.filter(a => agencyNames.has(a.name?.toLowerCase()));
        }
        if (recommendations.guides) {
          recommendations.guides = recommendations.guides.filter(g => guideNames.has(g.name?.toLowerCase()));
        }
        
        // Filter based on trip plan and limit to 4 per category
        const destinationLower = (tripAnalysis.destination || '').toLowerCase();
        const interests = (tripAnalysis.interests || []).map(i => i.toLowerCase());
        
        // Filter and limit hotels
        let hotelList = recommendations.hotels?.length > 0 ? recommendations.hotels : byRating(locationData?.hotels || []);
        hotelList = hotelList.filter(h => {
          const address = (h.formatted_address || h.vicinity || h.address || '').toLowerCase();
          return !destinationLower || address.includes(destinationLower) || destinationLower.includes(address.split(',')[0]);
        }).slice(0, 4);
        recommendations.hotels = hotelList;
        
        // Filter and limit restaurants
        let restaurantList = recommendations.restaurants?.length > 0 ? recommendations.restaurants : byRating(locationData?.restaurants || []);
        restaurantList = restaurantList.filter(r => {
          const address = (r.formatted_address || r.vicinity || r.address || '').toLowerCase();
          return !destinationLower || address.includes(destinationLower) || destinationLower.includes(address.split(',')[0]);
        }).slice(0, 4);
        recommendations.restaurants = restaurantList;
        
        // Filter and limit activities based on interests
        let activityList = recommendations.activities?.length > 0 ? recommendations.activities : byRating(locationData?.attractions || []);
        activityList = activityList.filter(a => {
          const address = (a.formatted_address || a.vicinity || a.address || '').toLowerCase();
          const name = (a.name || '').toLowerCase();
          const types = (a.types || []).join(' ').toLowerCase();
          const matchesDestination = !destinationLower || address.includes(destinationLower) || destinationLower.includes(address.split(',')[0]);
          const matchesInterests = interests.length === 0 || interests.some(i => name.includes(i) || types.includes(i));
          return matchesDestination && matchesInterests;
        }).slice(0, 4);
        recommendations.activities = activityList;
        
        recommendations.agencies = (recommendations.agencies?.length > 0 ? recommendations.agencies : byRating(locationData?.agencies || [])).slice(0, 4);
        recommendations.guides = (recommendations.guides?.length > 0 ? recommendations.guides : byRating(locationData?.guides || [])).slice(0, 4);
      } catch (parseError) {
        console.warn('AI parsing failed, using fallback with real data:', parseError.message);
        recommendations = this.createFallbackRecommendations(tripAnalysis, locationData);
      }

      // Enrich with real-time data from Google Places
      recommendations.lastUpdated = new Date().toISOString();
      recommendations.dataSource = 'Google Places + AI analysis';
      recommendations.confidence = locationData?.hotels?.length > 0 ? (tripAnalysis.confidence || 'high') : 'low';
      
      return recommendations;
    } catch (error) {
      console.error('Error generating comprehensive recommendations:', error);
      return this.createFallbackRecommendations(tripAnalysis, locationData);
    }
  }

  // Fallback recommendations if AI analysis fails - only use real data, no dummy data
  createFallbackRecommendations(tripAnalysis, locationData = {}) {
    const byRating = (arr) => (arr || []).slice().sort((a,b) => (b.rating||0) - (a.rating||0));
    const destinationLower = (tripAnalysis.destination || '').toLowerCase();
    const interests = (tripAnalysis.interests || []).map(i => i.toLowerCase());
    
    // Filter hotels by destination
    let filteredHotels = (locationData?.hotels || []).filter(h => {
      const address = (h.formatted_address || h.vicinity || h.address || '').toLowerCase();
      return !destinationLower || address.includes(destinationLower) || destinationLower.includes(address.split(',')[0]);
    });
    
    // Filter restaurants by destination
    let filteredRestaurants = (locationData?.restaurants || []).filter(r => {
      const address = (r.formatted_address || r.vicinity || r.address || '').toLowerCase();
      return !destinationLower || address.includes(destinationLower) || destinationLower.includes(address.split(',')[0]);
    });
    
    // Filter activities by destination and interests
    let filteredActivities = (locationData?.attractions || []).filter(a => {
      const address = (a.formatted_address || a.vicinity || a.address || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      const types = (a.types || []).join(' ').toLowerCase();
      const matchesDestination = !destinationLower || address.includes(destinationLower) || destinationLower.includes(address.split(',')[0]);
      const matchesInterests = interests.length === 0 || interests.some(i => name.includes(i) || types.includes(i));
      return matchesDestination && matchesInterests;
    });
    
    return {
      hotels: byRating(filteredHotels).slice(0, 4),
      restaurants: byRating(filteredRestaurants).slice(0, 4),
      activities: byRating(filteredActivities).slice(0, 4),
      agencies: byRating(locationData?.agencies || []).slice(0, 4),
      guides: byRating(locationData?.guides || []).slice(0, 4),
      budgetBreakdown: {},
      itinerary: this.generateBasicItinerary(tripAnalysis),
      lastUpdated: new Date().toISOString(),
      dataSource: 'Google Places (fallback)',
      confidence: locationData?.hotels?.length > 0 ? 'medium' : 'low'
    };
  }

  generateBasicItinerary(tripAnalysis) {
    const duration = parseInt(tripAnalysis.duration) || 7;
    const itinerary = [];
    
    for (let day = 1; day <= duration; day++) {
      itinerary.push({
        day,
        title: `Day ${day} - ${tripAnalysis.destination}`,
        activities: tripAnalysis.activities?.slice(0, 2) || ['Explore local area', 'Cultural experience'],
        location: tripAnalysis.destination
      });
    }
    
    return itinerary;
  }
}

module.exports = RealTimeAnalyzer;
