import axios from 'axios';
import { logger } from '../config/logger';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_URL = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';

// Reverse geocode coordinates to address
export const reverseGeocode = async (lat: number, lon: number): Promise<string | null> => {
  try {
    const response = await axios.get(GEOCODING_URL, {
      params: {
        latlng: `${lat},${lon}`,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].formatted_address;
    }
    return null;
  } catch (error) {
    logger.error(`Reverse geocoding failed: ${error}`);
    return null;
  }
};

// Get nearby dangerous places (hospitals, police, fire stations)
export const getNearbyEmergencyServices = async (
  lat: number,
  lon: number,
  radiusMeters: number = 5000
) => {
  try {
    const hospitals = await axios.get(PLACES_URL, {
      params: {
        location: `${lat},${lon}`,
        radius: radiusMeters,
        type: 'hospital',
        key: GOOGLE_MAPS_API_KEY
      }
    });

    const police = await axios.get(PLACES_URL, {
      params: {
        location: `${lat},${lon}`,
        radius: radiusMeters,
        type: 'police',
        key: GOOGLE_MAPS_API_KEY
      }
    });

    const fireStations = await axios.get(PLACES_URL, {
      params: {
        location: `${lat},${lon}`,
        radius: radiusMeters,
        type: 'fire_station',
        key: GOOGLE_MAPS_API_KEY
      }
    });

    return {
      hospitals: hospitals.data.results.slice(0, 3),
      police: police.data.results.slice(0, 3),
      fireStations: fireStations.data.results.slice(0, 3)
    };
  } catch (error) {
    logger.error(`Failed to get emergency services: ${error}`);
    return null;
  }
};

// Calculate distance between two points
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};
