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

      // Use AI to analyze and rank all collected data
      // Fast mode: return structured, ranked recommendations without LLM
      if (mode === 'fast') {
        const byRating = (arr) => (arr || []).slice().sort((a,b) => (b.rating||0) - (a.rating||0));
        const hotels = byRating(locationData?.hotels).slice(0,5);
        const restaurants = byRating(locationData?.restaurants).slice(0,5);
        const activities = byRating(locationData?.attractions).slice(0,5);
        return {
          hotels,
          restaurants,
          activities,
          agencies: (locationData?.agencies || []).slice(0,3),
          budgetBreakdown: pricingData || {},
          itinerary: this.generateBasicItinerary(tripAnalysis),
          lastUpdated: new Date().toISOString(),
          dataSource: 'Google Places (fast mode)',
          confidence: tripAnalysis.confidence || 'high'
        };
      }

      // Full mode: Use AI to analyze and rank collected data
      let model;
      const candidates = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'];
      for (const name of candidates) {
        try { model = this.genAI.getGenerativeModel({ model: name }); break; } catch { continue; }
      }
      const analysisPrompt = `Create the best recommendations based only on this data.
Trip Details: ${JSON.stringify(tripAnalysis)}
Hotels: ${JSON.stringify((locationData?.hotels || []).slice(0, 10))}
Restaurants: ${JSON.stringify((locationData?.restaurants || []).slice(0, 10))}
Attractions: ${JSON.stringify((locationData?.attractions || []).slice(0, 10))}
Pricing: ${JSON.stringify(pricingData)}

Return JSON with:
- hotels (top 5), restaurants (top 5), activities (top 5), agencies (3)
- budgetBreakdown (numbers), itinerary (array), lastUpdated, confidence.
`;
      const result = await model.generateContent(analysisPrompt);
      let recommendations;
      try {
        recommendations = JSON.parse(result.response.text());
      } catch (parseError) {
        recommendations = this.createFallbackRecommendations(tripAnalysis, {
          hotels: locationData?.hotels || [],
          attractions: locationData?.attractions || [],
          pricing: pricingData
        });
      }

      // Enrich with real-time data
      recommendations.lastUpdated = new Date().toISOString();
      recommendations.dataSource = 'Real-time web scraping + AI analysis';
      recommendations.confidence = tripAnalysis.confidence || 'high';
      
      return recommendations;
    } catch (error) {
      console.error('Error generating comprehensive recommendations:', error);
      return this.createFallbackRecommendations(tripAnalysis);
    }
  }

  // Fallback recommendations if AI analysis fails
  createFallbackRecommendations(tripAnalysis, scrapedData = {}) {
    const duration = parseInt(tripAnalysis.duration) || 7;
    const budget = tripAnalysis.budget || 'mid-range';
    
    return {
      hotels: scrapedData.hotels?.slice(0, 5) || [],
      restaurants: [
        { name: 'Dal Bhat House', cuisine: 'Nepali', rating: 4.5, price: '$10-15' },
        { name: 'Himalayan Kitchen', cuisine: 'Local', rating: 4.3, price: '$8-12' },
        { name: 'Mountain View Restaurant', cuisine: 'International', rating: 4.2, price: '$15-25' }
      ],
      activities: scrapedData.attractions?.slice(0, 5) || [],
      agencies: [
        { name: 'Nepal Adventure Tours', speciality: 'Trekking', contact: { phone: '+977-1-4444444' } },
        { name: 'Himalayan Expeditions', speciality: 'Mountain Tours', contact: { phone: '+977-1-5555555' } }
      ],
      guides: [
        { name: 'Pemba Sherpa', speciality: 'Everest Region', experience: '15 years' },
        { name: 'Ang Dorje', speciality: 'Annapurna Circuit', experience: '12 years' }
      ],
      budgetBreakdown: {
        accommodation: `$${30 * duration} (${duration} nights)`,
        meals: `$${25 * duration} (${duration} days)`,
        activities: '$200-400',
        transportation: '$100-200',
        guide: '$50/day',
        total: `$${(30 + 25) * duration + 300}`
      },
      itinerary: this.generateBasicItinerary(tripAnalysis)
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
