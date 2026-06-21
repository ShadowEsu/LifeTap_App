/**
 * Google Maps Service
 * Performs reverse geocoding (coordinates → address) with Redis caching.
 * Caches results for 24 hours to minimize API usage and cost.
 */

import { config } from '../config/env';
import { logger } from '../utils/logger';
import { cacheGet, cacheSet } from '../config/redis';

const GEOCODE_CACHE_TTL_SECONDS = 86400; // 24 hours

interface GeocodingResult {
  address: string;
  components: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
}

interface GoogleGeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
}

/**
 * Converts GPS coordinates to a human-readable address.
 * Results are cached in Redis to reduce API calls and costs.
 *
 * Returns null if geocoding fails or is disabled.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  if (!config.features.geocoding || !config.googleMaps.apiKey) {
    logger.debug({ lat, lon }, 'Geocoding disabled or not configured');
    return null;
  }

  // Round to 4 decimal places (~11m precision) for cache key
  const cacheKey = `geocode:${lat.toFixed(4)},${lon.toFixed(4)}`;

  // Check cache first
  const cached = await cacheGet<string>(cacheKey);
  if (cached) {
    logger.debug({ lat, lon, address: cached }, 'Geocoding cache hit');
    return cached;
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lon}`);
    url.searchParams.set('key', config.googleMaps.apiKey);
    url.searchParams.set('result_type', 'street_address|locality');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      logger.warn({ status: response.status, lat, lon }, 'Google Maps API returned non-200');
      return null;
    }

    const data = (await response.json()) as GoogleGeocodeResponse;

    if (data.status !== 'OK' || !data.results.length) {
      logger.warn({ status: data.status, lat, lon }, 'Geocoding returned no results');
      return null;
    }

    const address = data.results[0]?.formatted_address;
    if (!address) return null;

    // Cache the result
    await cacheSet(cacheKey, address, GEOCODE_CACHE_TTL_SECONDS);

    logger.debug({ lat, lon, address }, 'Geocoding result cached');
    return address;
  } catch (err) {
    logger.error({ err, lat, lon }, 'Reverse geocoding failed');
    return null;
  }
}

/**
 * Parses a Google Maps geocoding result into structured components.
 */
export function parseAddressComponents(
  components: Array<{ long_name: string; types: string[] }>,
): GeocodingResult['components'] {
  const result: GeocodingResult['components'] = {};

  for (const component of components) {
    if (component.types.includes('street_number') || component.types.includes('route')) {
      result.street = result.street
        ? `${result.street} ${component.long_name}`
        : component.long_name;
    } else if (component.types.includes('locality')) {
      result.city = component.long_name;
    } else if (component.types.includes('administrative_area_level_1')) {
      result.state = component.long_name;
    } else if (component.types.includes('country')) {
      result.country = component.long_name;
    } else if (component.types.includes('postal_code')) {
      result.postalCode = component.long_name;
    }
  }

  return result;
}

/**
 * Calculates the distance between two GPS coordinates in kilometers.
 * Uses the Haversine formula for spherical Earth approximation.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
