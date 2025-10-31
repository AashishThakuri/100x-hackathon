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
  async searchNearbyPlaces(lat, lng, type, radius = 5000) {
    const cacheKey = `nearby_${lat}_${lng}_${type}_${radius}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, {
        params: {
          location: `${lat},${lng}`,
          radius: radius,
          type: type,
          key: this.apiKey
        }
      });

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

        // Cache the result
        this.cache.set(cacheKey, {
          data: places,
          timestamp: Date.now()
        });

        return places;
      }
      return [];
    } catch (error) {
      console.error('Nearby search error:', error);
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

    try {
      const response = await axios.get(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          fields: 'name,rating,formatted_phone_number,formatted_address,website,opening_hours,photos,reviews,price_level,user_ratings_total,geometry',
          key: this.apiKey
        }
      });

      if (response.data.status === 'OK') {
        const details = response.data.result;
        
        // Cache the result
        this.cache.set(cacheKey, {
          data: details,
          timestamp: Date.now()
        });

        return details;
      }
      return null;
    } catch (error) {
      console.error('Place details error:', error);
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
      // First geocode the location
      const geocode = await this.geocodeLocation(location);
      if (!geocode) {
        throw new Error('Could not geocode location');
      }

      // Search for nearby places
      const places = await this.searchNearbyPlaces(geocode.lat, geocode.lng, type);
      
      // Get detailed information for top places
      const detailedPlaces = [];
      const limitedPlaces = places.slice(0, limit);
      
      for (const place of limitedPlaces) {
        const details = await this.getPlaceDetails(place.place_id);
        if (details) {
          const enhancedPlace = {
            ...place,
            ...details,
            photos: details.photos ? details.photos.map(photo => 
              this.getPlacePhoto(photo.photo_reference)
            ) : [],
            reviews: details.reviews || [],
            contact: {
              phone: details.formatted_phone_number || '',
              website: details.website || '',
              address: details.formatted_address || place.vicinity
            }
          };
          detailedPlaces.push(enhancedPlace);
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return detailedPlaces;
    } catch (error) {
      console.error('Search places by type error:', error);
      return [];
    }
  }

  // Get comprehensive location data
  async getLocationData(location) {
    try {
      const geocode = await this.geocodeLocation(location);
      if (!geocode) return null;

      const [hotels, restaurants, attractions, agencies] = await Promise.all([
        this.searchPlacesByType(location, 'lodging', 8),
        this.searchPlacesByType(location, 'restaurant', 8),
        this.searchPlacesByType(location, 'tourist_attraction', 8),
        this.searchPlacesByType(location, 'travel_agency', 5)
      ]);

      return {
        location: geocode,
        hotels,
        restaurants,
        attractions,
        agencies,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Get location data error:', error);
      return null;
    }
  }

  // Search for text-based queries
  async textSearch(query, location = null) {
    try {
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
        return response.data.results.map(place => ({
          place_id: place.place_id,
          name: place.name,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          formatted_address: place.formatted_address,
          geometry: place.geometry,
          photos: place.photos,
          types: place.types
        }));
      }
      return [];
    } catch (error) {
      console.error('Text search error:', error);
      return [];
    }
  }
}

module.exports = GooglePlacesService;
