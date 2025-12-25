// reverse-proxy/ip-location.js
// Optional: Use IP-API for more accurate location data

const axios = require('axios');
const geoip = require('geoip-lite');

// Cache to avoid repeated API calls for same IP
const locationCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get location using IP-API (more accurate than geoip-lite)
 * Free tier: 45 requests/minute
 * Falls back to geoip-lite if API fails
 */
async function getAccurateLocation(ip) {
  // Handle localhost
  if (ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1') {
    return {
      country: 'Local',
      city: 'Development'
    };
  }

  // Check cache first
  const cached = locationCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Try IP-API first (more accurate)
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,query`, {
      timeout: 2000 // 2 second timeout
    });

    if (response.data.status === 'success') {
      const location = {
        country: response.data.countryCode || 'Unknown',
        city: response.data.city || 'Unknown'
      };

      // Cache the result
      locationCache.set(ip, {
        data: location,
        timestamp: Date.now()
      });

      return location;
    }
  } catch (error) {
    console.log('IP-API failed, falling back to geoip-lite');
  }

  // Fallback to geoip-lite
  const geo = geoip.lookup(ip);
  if (geo) {
    const location = {
      country: geo.country || 'Unknown',
      city: geo.city || 'Unknown'
    };

    // Cache fallback too
    locationCache.set(ip, {
      data: location,
      timestamp: Date.now()
    });

    return location;
  }

  return {
    country: 'Unknown',
    city: 'Unknown'
  };
}

// Clean up old cache entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [ip, cache] of locationCache.entries()) {
    if (now - cache.timestamp > CACHE_DURATION) {
      locationCache.delete(ip);
    }
  }
}, 60 * 60 * 1000);

module.exports = { getAccurateLocation };