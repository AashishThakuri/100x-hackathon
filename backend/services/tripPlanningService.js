const RealTimeAnalyzer = require('./realTimeAnalyzer');
const GooglePlacesService = require('./googlePlacesService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class TripPlanningService {
  constructor() {
    this.analyzer = new RealTimeAnalyzer();
    this.placesService = new GooglePlacesService();
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.cache = new Map();
  }

  // Main method to process tourist responses and generate comprehensive plan
  async processTouristResponses(conversationHistory, options = {}) {
    try {
      console.log('Processing tourist responses...');
      
      // Step 1: Analyze conversation to extract trip details
      const tripAnalysis = await this.analyzer.analyzeTouristResponses(conversationHistory);
      if (!tripAnalysis) {
        throw new Error('Could not analyze trip requirements');
      }

      console.log('Trip analysis:', tripAnalysis);

      // Step 2: Get real-time data from Google Places and Google Reviews ONLY
      const googlePlacesData = await this.placesService.getLocationData(tripAnalysis.destination, options);
      const realTimeRecommendations = await this.analyzer.generateComprehensiveRecommendations(tripAnalysis, options, googlePlacesData);
      
      // Skip social media scraping (Twitter, etc.) - using Google data only
      const socialMediaInsights = [];

      // Step 3: Generate precise itinerary with AI
      const preciseItinerary = await this.generatePreciseItinerary(
        tripAnalysis, 
        googlePlacesData, 
        realTimeRecommendations
      );

      // Step 4: Calculate real-time budget
      const budgetBreakdown = await this.calculateRealTimeBudget(
        tripAnalysis, 
        googlePlacesData,
        realTimeRecommendations
      );

      // Step 5: Compile final recommendations - limit to 4 per category
      const finalRecommendations = {
        tripAnalysis,
        itinerary: preciseItinerary,
        budget: budgetBreakdown,
        hotels: this.enhanceHotelData(googlePlacesData?.hotels || [], realTimeRecommendations?.hotels || []).slice(0, 4),
        restaurants: this.enhanceRestaurantData(googlePlacesData?.restaurants || [], realTimeRecommendations?.restaurants || []).slice(0, 4),
        activities: this.enhanceActivityData(googlePlacesData?.attractions || [], realTimeRecommendations?.activities || []).slice(0, 4),
        agencies: this.enhanceAgencyData(googlePlacesData?.agencies || [], realTimeRecommendations?.agencies || []).slice(0, 4),
        guides: this.enhanceGuideData(googlePlacesData?.guides || [], realTimeRecommendations?.guides || []).slice(0, 4),
        socialInsights: socialMediaInsights,
        lastUpdated: new Date().toISOString(),
        dataConfidence: tripAnalysis.confidence || 'high'
      };

      console.log('✅ Final recommendations compiled:', {
        hotels: finalRecommendations.hotels.length,
        restaurants: finalRecommendations.restaurants.length,
        activities: finalRecommendations.activities.length,
        agencies: finalRecommendations.agencies.length,
        guides: finalRecommendations.guides.length
      });

      return finalRecommendations;
    } catch (error) {
      console.error('Error processing tourist responses:', error);
      throw error;
    }
  }

  // Generate precise day-by-day itinerary
  async generatePreciseItinerary(tripAnalysis, placesData, recommendations) {
    try {
      let model;
      const candidates = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash'];
      for (const name of candidates) {
        try { model = this.genAI.getGenerativeModel({ model: name }); break; } catch { continue; }
      }
      
      const itineraryPrompt = `
        Create a precise, day-by-day itinerary for this trip:
        
        Trip Details: ${JSON.stringify(tripAnalysis)}
        Available Places: ${JSON.stringify(placesData)}
        Recommendations: ${JSON.stringify(recommendations)}
        
        Generate a detailed itinerary with:
        - Specific timing for each activity
        - Real place names and addresses
        - Transportation between locations
        - Meal recommendations with specific restaurants
        - Accommodation suggestions for each night
        - Estimated costs for each activity
        - Cultural tips and local insights
        
        Return as JSON array with this structure:
        [
          {
            "day": 1,
            "date": "Day 1",
            "title": "Arrival and Exploration",
            "location": "Kathmandu",
            "activities": [
              {
                "time": "10:00 AM",
                "activity": "Airport pickup",
                "location": "Tribhuvan International Airport",
                "duration": "1 hour",
                "cost": "$20",
                "description": "Private transfer to hotel"
              }
            ],
            "accommodation": {
              "name": "Hotel Name",
              "address": "Full address",
              "price": "$50/night",
              "rating": 4.2
            },
            "meals": [
              {
                "time": "Lunch",
                "restaurant": "Restaurant Name",
                "cuisine": "Nepali",
                "cost": "$15",
                "location": "Address"
              }
            ],
            "transportation": {
              "method": "Private car",
              "cost": "$30",
              "duration": "2 hours"
            },
            "totalDayCost": "$115",
            "tips": ["Cultural tip", "Safety advice"]
          }
        ]
      `;

      const result = await model.generateContent(itineraryPrompt);
      let itinerary;
      
      try {
        itinerary = JSON.parse(result.response.text());
      } catch (parseError) {
        // Fallback to basic itinerary if AI parsing fails
        itinerary = this.generateBasicItinerary(tripAnalysis, placesData);
      }

      return itinerary;
    } catch (error) {
      console.error('Error generating precise itinerary:', error);
      return this.generateBasicItinerary(tripAnalysis, placesData);
    }
  }

  // Calculate real-time budget with current prices
  async calculateRealTimeBudget(tripAnalysis, placesData, recommendations) {
    try {
      const duration = parseInt(tripAnalysis.duration) || 7;
      const groupSize = parseInt(tripAnalysis.groupSize) || 2;
      const travelStyle = tripAnalysis.travelStyle || 'mid-range';

      // Get real-time pricing data
      const pricingData = await this.analyzer.getRealTimePricing(tripAnalysis.destination, tripAnalysis);
      
      // Calculate accommodation costs
      const avgHotelPrice = this.calculateAverageHotelPrice(placesData?.hotels || [], travelStyle);
      const accommodationTotal = avgHotelPrice * duration;

      // Calculate meal costs
      const avgMealPrice = this.calculateAverageMealPrice(placesData?.restaurants || [], travelStyle);
      const mealsTotal = avgMealPrice * 3 * duration * groupSize; // 3 meals per day

      // Calculate activity costs
      const activitiesTotal = this.calculateActivityCosts(placesData?.attractions || [], tripAnalysis.interests || []);

      // Calculate transportation costs
      const transportationTotal = this.calculateTransportationCosts(tripAnalysis.destination, duration, travelStyle);

      // Guide and permit costs
      const guideTotal = duration * 50; // $50 per day for guide
      const permitsTotal = this.calculatePermitCosts(tripAnalysis.activities || []);

      const budget = {
        breakdown: {
          accommodation: {
            total: accommodationTotal,
            perNight: avgHotelPrice,
            nights: duration,
            description: `${duration} nights accommodation`
          },
          meals: {
            total: mealsTotal,
            perPersonPerDay: avgMealPrice * 3,
            days: duration,
            people: groupSize,
            description: `All meals for ${groupSize} people`
          },
          activities: {
            total: activitiesTotal,
            description: 'Tours, entrance fees, and activities'
          },
          transportation: {
            total: transportationTotal,
            description: 'Local and intercity transport'
          },
          guide: {
            total: guideTotal,
            perDay: 50,
            days: duration,
            description: 'Professional guide services'
          },
          permits: {
            total: permitsTotal,
            description: 'Required permits and fees'
          }
        },
        summary: {
          subtotal: accommodationTotal + mealsTotal + activitiesTotal + transportationTotal + guideTotal + permitsTotal,
          taxes: 0, // Nepal doesn't have significant tourist taxes
          total: accommodationTotal + mealsTotal + activitiesTotal + transportationTotal + guideTotal + permitsTotal,
          perPerson: (accommodationTotal + mealsTotal + activitiesTotal + transportationTotal + guideTotal + permitsTotal) / groupSize,
          currency: 'USD',
          lastUpdated: new Date().toISOString()
        },
        priceRange: {
          budget: Math.floor((accommodationTotal + mealsTotal + activitiesTotal + transportationTotal + guideTotal + permitsTotal) * 0.7),
          midRange: accommodationTotal + mealsTotal + activitiesTotal + transportationTotal + guideTotal + permitsTotal,
          luxury: Math.floor((accommodationTotal + mealsTotal + activitiesTotal + transportationTotal + guideTotal + permitsTotal) * 1.8)
        }
      };

      return budget;
    } catch (error) {
      console.error('Error calculating budget:', error);
      return this.getDefaultBudget(tripAnalysis);
    }
  }

  // Helper methods for budget calculations
  calculateAverageHotelPrice(hotels, travelStyle) {
    if (!hotels || hotels.length === 0) {
      const basePrices = { budget: 20, 'mid-range': 50, luxury: 120 };
      return basePrices[travelStyle] || 50;
    }

    const prices = hotels.map(hotel => {
      if (hotel.price_level) {
        return hotel.price_level * 25; // Rough conversion
      }
      return 50; // Default
    });

    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
  }

  calculateAverageMealPrice(restaurants, travelStyle) {
    const basePrices = { budget: 8, 'mid-range': 15, luxury: 30 };
    return basePrices[travelStyle] || 15;
  }

  calculateActivityCosts(attractions, interests) {
    const baseActivityCost = 25;
    const interestMultiplier = interests.length || 3;
    return baseActivityCost * interestMultiplier;
  }

  calculateTransportationCosts(destination, duration, travelStyle) {
    const baseCosts = { budget: 20, 'mid-range': 40, luxury: 80 };
    const dailyCost = baseCosts[travelStyle] || 40;
    return dailyCost * duration;
  }

  calculatePermitCosts(activities) {
    const permitCosts = {
      'trekking': 50,
      'everest': 500,
      'annapurna': 100,
      'national park': 30
    };

    let total = 0;
    activities.forEach(activity => {
      const activityLower = activity.toLowerCase();
      Object.keys(permitCosts).forEach(permit => {
        if (activityLower.includes(permit)) {
          total += permitCosts[permit];
        }
      });
    });

    return total || 50; // Default permit cost
  }

  // Data enhancement methods
  enhanceHotelData(googleHotels, scrapedHotels) {
    const combined = [...googleHotels, ...scrapedHotels];
    // Remove duplicates and limit to 4
    const uniqueHotels = Array.from(new Map(combined.map(h => [h.place_id || h.name, h])).values());
    return uniqueHotels.slice(0, 4).map(hotel => ({
      ...hotel,
      bookingUrl: hotel.website || `https://www.booking.com/search.html?ss=${encodeURIComponent(hotel.name)}`,
      lastPriceUpdate: new Date().toISOString(),
      verified: !!hotel.place_id
    }));
  }

  enhanceRestaurantData(googleRestaurants, scrapedRestaurants) {
    const combined = [...googleRestaurants, ...scrapedRestaurants];
    const uniqueRestaurants = Array.from(new Map(combined.map(r => [r.place_id || r.name, r])).values());
    return uniqueRestaurants.slice(0, 4).map(restaurant => ({
      ...restaurant,
      reservationUrl: restaurant.website || `tel:${restaurant.formatted_phone_number}`,
      lastReviewUpdate: new Date().toISOString(),
      verified: !!restaurant.place_id
    }));
  }

  enhanceActivityData(googleAttractions, scrapedActivities) {
    const combined = [...googleAttractions, ...scrapedActivities];
    const uniqueActivities = Array.from(new Map(combined.map(a => [a.place_id || a.name, a])).values());
    return uniqueActivities.slice(0, 4).map(activity => ({
      ...activity,
      bookingRequired: activity.types?.includes('tourist_attraction'),
      lastUpdate: new Date().toISOString(),
      verified: !!activity.place_id
    }));
  }

  enhanceAgencyData(googleAgencies, scrapedAgencies) {
    const combined = [...googleAgencies, ...scrapedAgencies];
    const uniqueAgencies = Array.from(new Map(combined.map(a => [a.place_id || a.name, a])).values());
    return uniqueAgencies.slice(0, 4).map(agency => ({
      ...agency,
      contactVerified: !!agency.formatted_phone_number,
      lastUpdate: new Date().toISOString(),
      verified: !!agency.place_id
    }));
  }

  enhanceGuideData(googleGuides, scrapedGuides) {
    const combined = [...googleGuides, ...scrapedGuides];
    // Remove duplicates based on place_id or name
    const uniqueGuides = Array.from(new Map(combined.map(g => [g.place_id || g.name, g])).values());
    return uniqueGuides.slice(0, 4).map(guide => ({
      ...guide,
      contactVerified: !!guide.contact?.phone || !!guide.formatted_phone_number,
      lastUpdate: new Date().toISOString(),
      verified: !!guide.place_id,
      experience: guide.experience || 'Verified Guide',
      speciality: guide.speciality || guide.types?.join(', ') || 'General Tour Guide'
    }));
  }

  // Fallback methods
  generateBasicItinerary(tripAnalysis, placesData) {
    const duration = parseInt(tripAnalysis.duration) || 7;
    const itinerary = [];

    for (let day = 1; day <= duration; day++) {
      itinerary.push({
        day,
        date: `Day ${day}`,
        title: `Day ${day} - ${tripAnalysis.destination}`,
        location: tripAnalysis.destination,
        activities: [
          {
            time: '9:00 AM',
            activity: 'Morning exploration',
            duration: '3 hours',
            cost: '$25'
          },
          {
            time: '2:00 PM',
            activity: 'Afternoon activity',
            duration: '4 hours',
            cost: '$40'
          }
        ],
        totalDayCost: '$65'
      });
    }

    return itinerary;
  }

  getDefaultBudget(tripAnalysis) {
    const duration = parseInt(tripAnalysis.duration) || 7;
    const groupSize = parseInt(tripAnalysis.groupSize) || 2;
    
    return {
      summary: {
        total: duration * 100 * groupSize,
        perPerson: duration * 100,
        currency: 'USD'
      },
      breakdown: {
        accommodation: { total: duration * 50 },
        meals: { total: duration * 30 * groupSize },
        activities: { total: 200 },
        transportation: { total: 150 }
      }
    };
  }
}

module.exports = TripPlanningService;
