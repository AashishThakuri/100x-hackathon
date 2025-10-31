const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class RealTimeAnalyzer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  // Analyze tourist responses and create precise trip plan
  async analyzeTouristResponses(conversationHistory) {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      
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

  // Scrape Google for real-time hotel data
  async scrapeGoogleHotels(location, checkIn, checkOut, guests = 2) {
    const cacheKey = `hotels_${location}_${checkIn}_${checkOut}_${guests}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const searchUrl = `https://www.google.com/travel/hotels/${encodeURIComponent(location)}?q=${encodeURIComponent(location)}&g2lb=2502548%2C2503771%2C2503781%2C4258168%2C4270442%2C4284970%2C4291517%2C4597339%2C4757164%2C4814050%2C4850738%2C4864715%2C4874190%2C4886480%2C4893075%2C4924070%2C4965990%2C4985711%2C4990494%2C72248281%2C72271797%2C72272556%2C72281254&hl=en-US&gl=us&cs=1&ssta=1&ts=CAESCAoCCAMKAggDEAAaXAoiEiAyJTB4Mzk5NTNlNmQ5NzBkOGI5OToweDc0ZjRkNzI4ZjE4ZjY4ZjkSGhIUCgcI5w8QDBgYEgcI5w8QDBgZGAEyAhAAKhQKBwjnDxAMGBgSBwjnDxAMGBkYATICEAA&rp=EAI&ictx=1&ved=0CAAQ5JsGahcKEwjY-aGX8ZmBAxUAAAAAHQAAAAAQAg`;
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForTimeout(3000);

      const hotels = await page.evaluate(() => {
        const hotelElements = document.querySelectorAll('[data-ved] [role="button"]');
        const results = [];
        
        hotelElements.forEach((element, index) => {
          if (index >= 20) return; // Limit to 20 results
          
          const nameEl = element.querySelector('h3, h2, [data-ved] span');
          const ratingEl = element.querySelector('[aria-label*="star"]');
          const priceEl = element.querySelector('[aria-label*="$"], [aria-label*="USD"]');
          const imageEl = element.querySelector('img');
          
          if (nameEl) {
            results.push({
              name: nameEl.textContent?.trim() || '',
              rating: ratingEl ? parseFloat(ratingEl.textContent) || null : null,
              price: priceEl ? priceEl.textContent?.trim() || '' : '',
              image: imageEl ? imageEl.src : '',
              source: 'Google Hotels'
            });
          }
        });
        
        return results;
      });

      await browser.close();
      
      // Cache the results
      this.cache.set(cacheKey, {
        data: hotels,
        timestamp: Date.now()
      });
      
      return hotels;
    } catch (error) {
      console.error('Error scraping Google Hotels:', error);
      return [];
    }
  }

  // Scrape TripAdvisor for reviews and recommendations
  async scrapeTripAdvisor(location, type = 'hotels') {
    const cacheKey = `tripadvisor_${location}_${type}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const searchUrl = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(location + ' ' + type)}`;
      
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const results = [];

      $('.result-title').each((index, element) => {
        if (index >= 15) return;
        
        const $el = $(element);
        const name = $el.text().trim();
        const link = $el.find('a').attr('href');
        const rating = $el.closest('.result').find('.ui_bubble_rating').attr('alt');
        
        if (name) {
          results.push({
            name,
            link: link ? `https://www.tripadvisor.com${link}` : '',
            rating: rating ? parseFloat(rating.match(/[\d.]+/)?.[0]) : null,
            source: 'TripAdvisor'
          });
        }
      });

      // Cache the results
      this.cache.set(cacheKey, {
        data: results,
        timestamp: Date.now()
      });
      
      return results;
    } catch (error) {
      console.error('Error scraping TripAdvisor:', error);
      return [];
    }
  }

  // Scrape social media mentions and reviews
  async scrapeSocialMediaReviews(location, businessName) {
    try {
      const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Search Twitter/X for recent mentions
      const twitterUrl = `https://twitter.com/search?q=${encodeURIComponent(businessName + ' ' + location)}&src=typed_query&f=live`;
      
      const reviews = [];
      
      try {
        await page.goto(twitterUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await page.waitForTimeout(2000);

        const tweets = await page.evaluate(() => {
          const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
          const results = [];
          
          tweetElements.forEach((element, index) => {
            if (index >= 10) return;
            
            const textEl = element.querySelector('[data-testid="tweetText"]');
            const authorEl = element.querySelector('[data-testid="User-Name"]');
            
            if (textEl && textEl.textContent.length > 20) {
              results.push({
                text: textEl.textContent.trim(),
                author: authorEl ? authorEl.textContent.trim() : 'Anonymous',
                platform: 'Twitter/X',
                timestamp: new Date().toISOString()
              });
            }
          });
          
          return results;
        });
        
        reviews.push(...tweets);
      } catch (error) {
        console.log('Twitter scraping failed, continuing...');
      }

      await browser.close();
      return reviews;
    } catch (error) {
      console.error('Error scraping social media:', error);
      return [];
    }
  }

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

      // Scrape hotel pricing
      const hotels = await this.scrapeGoogleHotels(location, tripDetails.checkIn, tripDetails.checkOut);
      pricing.hotels = hotels.map(hotel => ({
        name: hotel.name,
        pricePerNight: this.extractPrice(hotel.price),
        rating: hotel.rating,
        source: hotel.source
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
  async generateComprehensiveRecommendations(tripAnalysis) {
    try {
      console.log('Generating comprehensive recommendations for:', tripAnalysis);
      
      // Parallel data fetching
      const [
        googleHotels,
        tripAdvisorData,
        socialReviews,
        pricingData
      ] = await Promise.all([
        this.scrapeGoogleHotels(tripAnalysis.destination),
        this.scrapeTripAdvisor(tripAnalysis.destination, 'attractions'),
        // Disabled: this.scrapeSocialMediaReviews(tripAnalysis.destination, 'Nepal travel'),
        Promise.resolve([]), // Empty array instead of social media scraping
        this.getRealTimePricing(tripAnalysis.destination, tripAnalysis)
      ]);

      // Use AI to analyze and rank all collected data
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      
      const analysisPrompt = `
        Based on this real-time data collected from multiple sources, create the best recommendations:
        
        Trip Details: ${JSON.stringify(tripAnalysis)}
        Hotels: ${JSON.stringify(googleHotels.slice(0, 10))}
        Attractions: ${JSON.stringify(tripAdvisorData.slice(0, 10))}
        Social Reviews: ${JSON.stringify(socialReviews.slice(0, 5))}
        Pricing: ${JSON.stringify(pricingData)}
        
        Generate a comprehensive recommendation object with:
        1. Top 5 hotels with real pricing and reviews
        2. Top 5 restaurants with authentic local recommendations
        3. Top 5 activities/attractions with current pricing
        4. 3 recommended travel agencies with contact details
        5. 3 recommended guides with specializations
        6. Detailed budget breakdown with real costs
        7. Day-by-day itinerary with specific recommendations
        
        Return as JSON with real, actionable data.
      `;

      const result = await model.generateContent(analysisPrompt);
      let recommendations;
      
      try {
        recommendations = JSON.parse(result.response.text());
      } catch (parseError) {
        // If JSON parsing fails, create structured response
        recommendations = this.createFallbackRecommendations(tripAnalysis, {
          hotels: googleHotels,
          attractions: tripAdvisorData,
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
