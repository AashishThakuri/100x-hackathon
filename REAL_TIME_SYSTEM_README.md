# Real-Time Nepal Travel Planner System

## Overview
This system provides **real-time, AI-powered trip planning** that analyzes tourist conversations and generates precise recommendations by crawling live data from Google, social media, and travel websites.

## 🚀 Key Features

### 1. **Advanced Conversation Analysis**
- AI analyzes complete conversation history to understand tourist preferences
- Extracts destination, budget, travel style, interests, and special requirements
- Confidence scoring based on information completeness

### 2. **Real-Time Web Scraping**
- **Google Hotels**: Live pricing and availability data
- **TripAdvisor**: Reviews and ratings for attractions and restaurants
- **Social Media**: Recent mentions and reviews from Twitter/X
- **Google Places API**: Verified venue data with photos and reviews

### 3. **Comprehensive Trip Planning**
- Day-by-day itinerary with specific timing
- Real accommodation recommendations with current pricing
- Restaurant suggestions with authentic local reviews
- Activity recommendations with booking information
- Travel agency and guide contacts with verification

### 4. **Dynamic Budget Calculation**
- Real-time pricing from multiple sources
- Accommodation costs based on current market rates
- Activity pricing with seasonal adjustments
- Transportation costs by travel style
- Permit and guide service fees

## 🛠️ Technical Architecture

### Backend Services

#### 1. **RealTimeAnalyzer** (`/backend/services/realTimeAnalyzer.js`)
- **Conversation Analysis**: Uses Gemini AI to extract trip requirements
- **Web Scraping**: Puppeteer-based scraping of Google Hotels and social media
- **Data Integration**: Combines multiple data sources for comprehensive recommendations
- **Caching**: 30-minute cache for performance optimization

#### 2. **GooglePlacesService** (`/backend/services/googlePlacesService.js`)
- **Geocoding**: Convert locations to coordinates
- **Place Search**: Find hotels, restaurants, attractions by type
- **Detailed Data**: Reviews, photos, contact information
- **Photo Integration**: Direct photo URLs from Google Places

#### 3. **TripPlanningService** (`/backend/services/tripPlanningService.js`)
- **Main Orchestrator**: Coordinates all data sources
- **AI Itinerary Generation**: Creates detailed day-by-day plans
- **Budget Calculation**: Real-time cost analysis
- **Data Enhancement**: Enriches recommendations with verification status

### API Endpoints

#### Core Trip Planning
- `POST /api/plan-trip` - Main endpoint for comprehensive trip planning
- `POST /api/analyze/conversation` - Analyze conversation for trip requirements

#### Google Places Integration
- `GET /api/places/search` - Search places by location and type
- `GET /api/places/details/:placeId` - Get detailed place information
- `GET /api/places/photo` - Get place photos

#### Real-Time Data
- `GET /api/scrape/hotels` - Live hotel data from Google
- `GET /api/scrape/social-reviews` - Social media reviews and mentions
- `GET /api/geocode` - Location geocoding
- `GET /api/location-data/:location` - Comprehensive location data

### Frontend Integration

#### ChatPage Updates
- **Smart Trigger Detection**: Recognizes satisfaction keywords (done, perfect, ready, etc.)
- **Real-Time API Integration**: Calls backend for comprehensive analysis
- **Enhanced User Feedback**: Shows analysis progress to users
- **Fallback Handling**: Graceful degradation if APIs fail

#### BookingPage Enhancements
- **Real-Time Data Display**: Shows live recommendations with confidence indicators
- **Data Freshness**: Displays last update timestamps
- **Verification Status**: Shows which data is verified vs. estimated
- **Enhanced Budget Display**: Real-time pricing with breakdown

## 🔧 Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env` and configure:
```env
PORT=5000
GOOGLE_PLACES_API_KEY=your_google_places_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 3. API Keys Required
- **Google Places API**: For venue data and geocoding
- **Gemini AI API**: For conversation analysis and itinerary generation

### 4. Start the System
```bash
# Backend
cd backend
npm run dev

# Frontend (in separate terminal)
cd frontend
npm start
```

## 📊 Data Flow

### 1. **Tourist Interaction**
```
Tourist chats → AI responds → Tourist confirms satisfaction
```

### 2. **Real-Time Analysis**
```
Conversation History → AI Analysis → Trip Requirements Extraction
```

### 3. **Data Gathering**
```
Parallel API Calls:
├── Google Places API (venues, reviews, photos)
├── Web Scraping (hotel prices, social media)
├── TripAdvisor (reviews and ratings)
└── Budget Calculation (real-time pricing)
```

### 4. **Recommendation Generation**
```
Combined Data → AI Processing → Structured Recommendations → User Display
```

## 🎯 Confidence Scoring

### High Confidence (🎯)
- Complete trip requirements extracted
- Real-time data successfully gathered
- Multiple data sources verified

### Medium Confidence (⚡)
- Most requirements extracted
- Some real-time data available
- Partial verification

### Low Confidence (📊)
- Basic requirements only
- Limited real-time data
- Fallback recommendations used

## 🔄 Caching Strategy

### Data Caching
- **Google Places**: 1 hour cache
- **Hotel Scraping**: 30 minutes cache
- **Social Media**: 30 minutes cache
- **Geocoding**: 1 hour cache

### Performance Optimization
- Parallel API calls for faster response
- Smart fallback to cached data
- Progressive loading of recommendations

## 🚨 Error Handling

### Graceful Degradation
1. **API Failures**: Falls back to cached or mock data
2. **Parsing Errors**: Uses structured fallback recommendations
3. **Network Issues**: Shows appropriate user messages
4. **Rate Limiting**: Implements request queuing and retry logic

### User Experience
- Clear loading indicators during data gathering
- Confidence badges showing data quality
- Fallback messages when real-time data unavailable

## 📈 Monitoring & Analytics

### Data Quality Metrics
- API success rates
- Cache hit ratios
- User satisfaction indicators
- Recommendation accuracy

### Performance Monitoring
- Response times for each service
- Error rates by endpoint
- User engagement with recommendations

## 🔮 Future Enhancements

### Planned Features
1. **Redis Integration**: Distributed caching for scalability
2. **More Data Sources**: Booking.com, Airbnb, local travel sites
3. **Machine Learning**: Recommendation improvement based on user feedback
4. **Real-Time Updates**: WebSocket integration for live price updates
5. **Mobile Optimization**: Progressive Web App features

### Advanced Analytics
- User behavior tracking
- Recommendation effectiveness scoring
- A/B testing for different recommendation strategies

## 🤝 Contributing

### Development Guidelines
1. All new services should include comprehensive error handling
2. API endpoints must have proper validation and documentation
3. Frontend components should handle loading and error states
4. Real-time data should always have fallback options

### Testing Strategy
- Unit tests for all service methods
- Integration tests for API endpoints
- End-to-end tests for complete user flows
- Performance tests for data gathering operations

---

## 📞 Support

For technical issues or questions about the real-time system:
1. Check the console logs for detailed error messages
2. Verify API keys are properly configured
3. Ensure all required services are running
4. Review the confidence indicators for data quality assessment

This system represents a significant advancement in travel planning technology, providing tourists with the most current and comprehensive recommendations available anywhere on the internet.
