const axios = require('axios');

class GooglePlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    this.geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1 hour cache
  }

  // Geocode a location to get coordinates using free Nominatim (OpenStreetMap)
  async geocodeLocation(location) {
    const cacheKey = `geocode_${location}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // Add ", Nepal" if not already included
      const searchLocation = location.toLowerCase().includes('nepal') ? location : `${location}, Nepal`;
      
      console.log(`Geocoding with Nominatim: ${searchLocation}`);
      
      // Use free Nominatim API (OpenStreetMap)
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: searchLocation,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'NepalTravelPlanner/1.0'
        }
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const geocodeData = {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formatted_address: result.display_name,
          place_id: result.place_id
        };

        console.log(`✅ Geocoded "${location}": ${geocodeData.lat}, ${geocodeData.lng}`);

        // Cache the result
        this.cache.set(cacheKey, {
          data: geocodeData,
          timestamp: Date.now()
        });

        return geocodeData;
      }
      
      console.warn(`❌ Geocoding failed for "${location}"`);
      return null;
    } catch (error) {
      console.error('Geocoding error:', error.message);
      return null;
    }
  }

  // Search for nearby places
  async searchNearbyPlaces(lat, lng, type, radius = 5000, keyword = undefined) {
    const cacheKey = `nearby_${lat}_${lng}_${type || 'any'}_${radius}_${keyword || 'none'}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    if (!this.apiKey) {
      console.error('❌ GOOGLE_PLACES_API_KEY is not set! Cannot search places.');
      return [];
    }

    try {
      const params = {
        location: `${lat},${lng}`,
        radius: radius,
        key: this.apiKey
      };
      if (type) params.type = type;
      if (keyword) params.keyword = keyword;

      const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, { params });

      if (response.data.status === 'OK') {
        const places = response.data.results.map(place => ({
          place_id: place.place_id,
          name: place.name,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          price_level: place.price_level,
          types: place.types,
          vicinity: place.vicinity,
          geometry: place.geometry,
          photos: place.photos,
          opening_hours: place.opening_hours
        }));

        console.log(`✅ Found ${places.length} places nearby (${type || 'any'}) at ${lat},${lng}`);

        // Cache the result
        this.cache.set(cacheKey, {
          data: places,
          timestamp: Date.now()
        });

        return places;
      } else if (response.data.status === 'ZERO_RESULTS') {
        console.warn(`⚠️ No results found for nearby search: ${type || 'any'} at ${lat},${lng}`);
        console.warn(`   Search params: location=${lat},${lng}, radius=${radius}, type=${type}`);
        return [];
      } else {
        console.error('❌ Nearby search API error:', {
          status: response.data.status,
          error_message: response.data.error_message,
          type: type,
          location: `${lat},${lng}`
        });
        
        if (response.data.error_message) {
          if (response.data.error_message.includes('API key') || response.data.error_message.includes('keyInvalid')) {
            console.error('💡 CRITICAL: Invalid or missing GOOGLE_PLACES_API_KEY');
            console.error('💡 Please check your GOOGLE_PLACES_API_KEY in backend/.env file');
          } else if (response.data.error_message.includes('REQUEST_DENIED')) {
            console.error('💡 API request denied. Check API key permissions and billing.');
          } else if (response.data.error_message.includes('OVER_QUERY_LIMIT')) {
            console.error('💡 API quota exceeded. Check your Google Cloud billing.');
          }
        }
        return [];
      }
    } catch (error) {
      console.error('❌ Nearby search exception:', error?.response?.data || error.message);
      if (error?.response?.data?.error_message?.includes('API key')) {
        console.error('💡 Invalid or missing GOOGLE_PLACES_API_KEY');
      }
      return [];
    }
  }

  // Get detailed place information
  async getPlaceDetails(placeId) {
    const cacheKey = `details_${placeId}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    if (!this.apiKey) {
      console.error('❌ GOOGLE_PLACES_API_KEY is not set! Cannot get place details.');
      return null;
    }

    try {
      // Request comprehensive fields including reviews
      const response = await axios.get(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          fields: 'name,rating,formatted_phone_number,formatted_address,address_components,website,opening_hours,photos,reviews,price_level,user_ratings_total,geometry,types,business_status,url',
          key: this.apiKey
        }
      });

      if (response.data.status === 'OK') {
        const details = response.data.result;
        
        // Ensure reviews are properly formatted
        if (!details.reviews && response.data.result.reviews) {
          details.reviews = response.data.result.reviews;
        }
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: details,
          timestamp: Date.now()
        });

        return details;
      } else {
        console.warn(`⚠️ Place details error for ${placeId}:`, response.data.status, response.data.error_message);
        return null;
      }
    } catch (error) {
      console.error('❌ Place details exception:', error?.response?.data || error.message);
      return null;
    }
  }

  // Get place photo
  async getPlacePhoto(photoReference, maxWidth = 800) {
    try {
      const photoUrl = `${this.baseUrl}/photo?photoreference=${photoReference}&maxwidth=${maxWidth}&key=${this.apiKey}`;
      return photoUrl;
    } catch (error) {
      console.error('Photo URL error:', error);
      return null;
    }
  }

  // Search for specific types of places with enhanced data
  async searchPlacesByType(location, type, limit = 10) {
    try {
      if (!this.apiKey) {
        console.error('❌ GOOGLE_PLACES_API_KEY is not set! Cannot search places.');
        return [];
      }

      // First geocode the location
      const geocode = await this.geocodeLocation(location);
      if (!geocode) {
        console.warn(`⚠️ Could not geocode location: ${location}`);
        // Try text search as fallback
        return await this.textSearchFallback(location, type, limit);
      }

      console.log(`🔍 Searching for ${type || 'places'} near ${location} (${geocode.lat}, ${geocode.lng})`);

      // Search for nearby places
      let places = await this.searchNearbyPlaces(geocode.lat, geocode.lng, type, 10000); // Increased radius to 10km
      
      // If nearby search returns few results, try text search as supplement
      if (places.length < 3 && type) {
        console.log(`⚠️ Nearby search returned only ${places.length} results, trying text search...`);
        const textResults = await this.textSearchFallback(location, type, limit - places.length);
        // Merge results, avoiding duplicates
        const existingIds = new Set(places.map(p => p.place_id));
        const newResults = textResults.filter(p => !existingIds.has(p.place_id));
        places = [...places, ...newResults];
      }
      
      if (places.length === 0) {
        console.warn(`⚠️ No places found for ${type} in ${location}`);
        return [];
      }
      
      // Get detailed information for top places (parallel for speed)
      const limitedPlaces = places.slice(0, limit);
      console.log(`📋 Getting details for ${limitedPlaces.length} places...`);
      
      const detailsArray = await Promise.all(
        limitedPlaces.map(p => this.getPlaceDetails(p.place_id))
      );

      const detailedPlaces = limitedPlaces.map((place, idx) => {
        const details = detailsArray[idx];
        if (!details) return null;
        
        // Get photo URLs if available
        const photoUrls = details.photos ? details.photos.slice(0, 5).map(photo => 
          this.getPlacePhoto(photo.photo_reference)
        ) : (place.photos ? place.photos.slice(0, 5).map(photo => 
          this.getPlacePhoto(photo.photo_reference)
        ) : []);
        
        return {
          ...place,
          name: details.name || place.name,
          rating: details.rating || place.rating,
          user_ratings_total: details.user_ratings_total || place.user_ratings_total,
          formatted_address: details.formatted_address || place.vicinity,
          photos: photoUrls,
          photo_reference: place.photos?.[0]?.photo_reference || details.photos?.[0]?.photo_reference,
          reviews: details.reviews || [],
          contact: {
            phone: details.formatted_phone_number || '',
            website: details.website || '',
            address: details.formatted_address || place.vicinity
          },
          geometry: details.geometry || place.geometry,
          types: details.types || place.types,
          price_level: details.price_level || place.price_level
        };
      }).filter(Boolean);

      console.log(`✅ Found ${detailedPlaces.length} detailed places for ${type} in ${location}`);
      return detailedPlaces;
    } catch (error) {
      console.error('❌ Search places by type error:', error.message);
      return [];
    }
  }

  // Fallback text search when nearby search fails
  async textSearchFallback(location, type, limit = 10) {
    try {
      if (!this.apiKey) return [];
      
      // Create appropriate search query based on type
      let query = `${type} in ${location}, Nepal`;
      if (type === 'lodging') query = `hotels in ${location}, Nepal`;
      if (type === 'restaurant') query = `restaurants in ${location}, Nepal`;
      if (type === 'tourist_attraction') query = `tourist attractions in ${location}, Nepal`;
      if (type === 'travel_agency') query = `travel agencies in ${location}, Nepal`;
      
      console.log(`🔍 Text search fallback: ${query}`);
      const textResults = await this.textSearch(query, location);
      
      if (textResults.length > 0) {
        // Get details for text search results
        const limited = textResults.slice(0, limit);
        const detailsArray = await Promise.all(limited.map(p => this.getPlaceDetails(p.place_id)));
        
        return limited.map((place, idx) => {
          const details = detailsArray[idx];
          if (!details) return null;
          
          return {
            ...place,
            ...details,
            photos: details.photos ? details.photos.slice(0, 5).map(photo => 
              this.getPlacePhoto(photo.photo_reference)
            ) : [],
            reviews: details.reviews || [],
            contact: {
              phone: details.formatted_phone_number || '',
              website: details.website || '',
              address: details.formatted_address || place.formatted_address
            }
          };
        }).filter(Boolean);
      }
      
      return [];
    } catch (error) {
      console.error('Text search fallback error:', error.message);
      return [];
    }
  }

  // Search for guides using text search (guides don't have a specific place type)
  async searchGuides(location, limit = 10) {
    try {
      if (!this.apiKey) {
        console.error('❌ GOOGLE_PLACES_API_KEY is not set! Cannot search guides.');
        return [];
      }

      console.log(`🔍 Searching for guides in ${location}`);
      
      // Use multiple search queries for guides
      const queries = [
        `tour guide ${location} Nepal`,
        `trekking guide ${location} Nepal`,
        `local guide ${location} Nepal`,
        `travel guide ${location} Nepal`
      ];

      const allResults = [];
      for (const query of queries) {
        const results = await this.textSearch(query, location);
        // Add results avoiding duplicates
        const existingIds = new Set(allResults.map(r => r.place_id));
        results.forEach(r => {
          if (!existingIds.has(r.place_id)) {
            allResults.push(r);
          }
        });
        if (allResults.length >= limit) break;
      }

      if (allResults.length === 0) {
        console.warn(`⚠️ No guides found for ${location}`);
        return [];
      }

      // Get details for top results
      const limited = allResults.slice(0, limit);
      const detailsArray = await Promise.all(limited.map(p => this.getPlaceDetails(p.place_id)));

      const guides = limited.map((place, idx) => {
        const details = detailsArray[idx];
        if (!details) return null;
        
        return {
          name: details.name || place.name,
          place_id: place.place_id,
          rating: details.rating || place.rating,
          user_ratings_total: details.user_ratings_total || place.user_ratings_total,
          formatted_address: details.formatted_address || place.formatted_address,
          geometry: details.geometry || place.geometry,
          photos: details.photos ? details.photos.slice(0, 3).map(photo => 
            this.getPlacePhoto(photo.photo_reference)
          ) : [],
          reviews: details.reviews || [],
          contact: {
            phone: details.formatted_phone_number || '',
            website: details.website || '',
            address: details.formatted_address || place.formatted_address
          },
          types: details.types || place.types
        };
      }).filter(Boolean);

      console.log(`✅ Found ${guides.length} guides in ${location}`);
      return guides;
    } catch (error) {
      console.error('❌ Search guides error:', error.message);
      return [];
    }
  }

  // Get comprehensive location data
  async getLocationData(location, options = {}) {
    try {
      if (!this.apiKey) {
        console.error('❌ GOOGLE_PLACES_API_KEY is not set! Cannot get location data.');
        return null;
      }

      const mode = options.mode || 'fast';
      const limits = mode === 'fast' 
        ? { hotels: 5, restaurants: 5, attractions: 5, agencies: 3, guides: 5 } 
        : { hotels: 8, restaurants: 8, attractions: 8, agencies: 5, guides: 8 };
      
      const geocode = await this.geocodeLocation(location);
      if (!geocode) {
        console.warn(`⚠️ Could not geocode ${location}, but continuing with text searches...`);
      }

      console.log(`📊 Fetching comprehensive location data for: ${location}`);
      
      // Fetch all data in parallel
      const [hotels, restaurants, attractions, agencies, guides] = await Promise.all([
        this.searchPlacesByType(location, 'lodging', limits.hotels),
        this.searchPlacesByType(location, 'restaurant', limits.restaurants),
        this.searchPlacesByType(location, 'tourist_attraction', limits.attractions),
        this.searchPlacesByType(location, 'travel_agency', limits.agencies),
        this.searchGuides(location, limits.guides)
      ]);

      const result = {
        location: geocode || { lat: null, lng: null, formatted_address: location },
        hotels: hotels || [],
        restaurants: restaurants || [],
        attractions: attractions || [],
        agencies: agencies || [],
        guides: guides || [],
        lastUpdated: new Date().toISOString()
      };

      console.log(`✅ Location data fetched:`, {
        hotels: result.hotels.length,
        restaurants: result.restaurants.length,
        attractions: result.attractions.length,
        agencies: result.agencies.length,
        guides: result.guides.length
      });

      return result;
    } catch (error) {
      console.error('❌ Get location data error:', error.message);
      return null;
    }
  }

  // Search for text-based queries
  async textSearch(query, location = null) {
    try {
      if (!this.apiKey) {
        console.error('❌ GOOGLE_PLACES_API_KEY is not set! Cannot perform text search.');
        return [];
      }

      const params = {
        query: query,
        key: this.apiKey
      };

      if (location) {
        const geocode = await this.geocodeLocation(location);
        if (geocode) {
          params.location = `${geocode.lat},${geocode.lng}`;
          params.radius = 50000; // 50km radius
        }
      }

      const response = await axios.get(`${this.baseUrl}/textsearch/json`, { params });

      if (response.data.status === 'OK') {
        const results = response.data.results.map(place => ({
          place_id: place.place_id,
          name: place.name,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          formatted_address: place.formatted_address,
          geometry: place.geometry,
          photos: place.photos,
          types: place.types,
          vicinity: place.vicinity || place.formatted_address
        }));
        console.log(`✅ Text search found ${results.length} results for: ${query}`);
        return results;
      } else if (response.data.status === 'ZERO_RESULTS') {
        console.warn(`⚠️ No results for text search: ${query}`);
        return [];
      } else {
        console.error('❌ Text search error:', response.data.status, response.data.error_message);
        return [];
      }
    } catch (error) {
      console.error('❌ Text search exception:', error?.response?.data || error.message);
      return [];
    }
  }
}

module.exports = GooglePlacesService;
