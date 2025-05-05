// modules/restaurantManager.js

const logger = require('../utilities/logger');
const config = require('../config/appConfig');
const axios = require('axios');

/**
 * Get restaurant information
 * @param {string} restaurantId - ID of the restaurant
 * @returns {object} Restaurant information
 */
async function getRestaurantInfo(restaurantId) {
  try {
    logger.info('Fetching restaurant information', { restaurantId });
    
    // In demo mode, return mock data
    if (config.demoMode) {
      return getMockRestaurantInfo(restaurantId);
    }
    
    // In production, call the restaurant service API
    const response = await axios.get(
      `${config.apiBaseUrl}/restaurants/${restaurantId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching restaurant information', { error: error.message, restaurantId });
    
    // Return minimal mock data if real data fetch fails
    return {
      id: restaurantId,
      name: 'Restaurant',
      error: 'Unable to retrieve restaurant information'
    };
  }
}

/**
 * Report an issue with a restaurant
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} issueType - Type of issue
 * @param {array} items - Affected items
 * @param {string} orderId - ID of the order
 * @returns {boolean} Success status
 */
async function reportIssue(restaurantId, issueType, items, orderId) {
  try {
    logger.info('Reporting issue to restaurant', { 
      restaurantId, 
      issueType, 
      items, 
      orderId 
    });
    
    // In demo mode, return success
    if (config.demoMode) {
      return true;
    }
    
    // In production, call the restaurant service API
    await axios.post(
      `${config.apiBaseUrl}/restaurants/${restaurantId}/issues`,
      {
        orderId,
        issueType,
        items,
        timestamp: new Date()
      },
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return true;
  } catch (error) {
    logger.error('Error reporting issue to restaurant', { error: error.message, restaurantId });
    
    return false;
  }
}

/**
 * Check if a restaurant is open
 * @param {string} restaurantId - ID of the restaurant
 * @returns {boolean} Whether the restaurant is open
 */
async function isRestaurantOpen(restaurantId) {
  try {
    logger.info('Checking if restaurant is open', { restaurantId });
    
    // In demo mode, return mock data
    if (config.demoMode) {
      // 80% chance of being open
      return Math.random() < 0.8;
    }
    
    // In production, call the restaurant service API
    const response = await axios.get(
      `${config.apiBaseUrl}/restaurants/${restaurantId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return response.data.isOpen;
  } catch (error) {
    logger.error('Error checking if restaurant is open', { error: error.message, restaurantId });
    
    // Default to closed on error
    return false;
  }
}

/**
 * Get restaurant metrics
 * @param {string} restaurantId - ID of the restaurant
 * @returns {object} Restaurant metrics
 */
async function getRestaurantMetrics(restaurantId) {
  try {
    logger.info('Fetching restaurant metrics', { restaurantId });
    
    // In demo mode, return mock data
    if (config.demoMode) {
      return getMockRestaurantMetrics(restaurantId);
    }
    
    // In production, call the restaurant service API
    const response = await axios.get(
      `${config.apiBaseUrl}/restaurants/${restaurantId}/metrics`,
      {
        headers: {
          'Authorization': `Bearer ${config.internalApiKey}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    logger.error('Error fetching restaurant metrics', { error: error.message, restaurantId });
    
    // Return minimal mock data if real data fetch fails
    return {
      id: restaurantId,
      orderAccuracy: 0.9,
      avgDeliveryTime: 30,
      error: 'Unable to retrieve restaurant metrics'
    };
  }
}

// Helper functions for mock data

/**
 * Get mock restaurant information for demo mode
 * @param {string} restaurantId - ID of the restaurant
 * @returns {object} Mock restaurant information
 */
function getMockRestaurantInfo(restaurantId) {
  // Generate a consistent restaurant based on the restaurant ID
  const restaurantIdNum = parseInt(restaurantId.replace(/\D/g, '')) || 12345;
  
  // Restaurant names
  const restaurantNames = [
    'Spice Route', 'Tandoori Nights', 'Beijing Palace', 
    'Pasta Paradise', 'Burger Bliss', 'Sushi Station',
    'Mediterranean Delight', 'Taco Express', 'Pizza Heaven'
  ];
  
  const nameIndex = restaurantIdNum % restaurantNames.length;
  const name = restaurantNames[nameIndex];
  
  // Cuisine types
  const cuisines = [
    'Indian', 'Chinese', 'Italian', 'American', 
    'Japanese', 'Mediterranean', 'Mexican', 'Thai'
  ];
  
  const cuisineIndex = restaurantIdNum % cuisines.length;
  const cuisine = cuisines[cuisineIndex];
  
  // Generate open hours
  const openHour = 8 + (restaurantIdNum % 4); // Between 8 AM and 11 AM
  const closeHour = 21 + (restaurantIdNum % 4); // Between 9 PM and 12 AM
  
  // Current operational status
  const now = new Date();
  const currentHour = now.getHours();
  const isOpen = currentHour >= openHour && currentHour < closeHour;
  
  // Calculate ratings
  const rating = 3.5 + (restaurantIdNum % 15) / 10; // Between 3.5 and 5.0
  const ratingCount = 100 + (restaurantIdNum % 900); // Between 100 and 999
  
  return {
    id: restaurantId,
    name,
    cuisine,
    address: `${restaurantIdNum} Food Street, City`,
    openingTime: `${openHour}:00`,
    closingTime: `${closeHour}:00`,
    isOpen,
    rating,
    ratingCount,
    deliveryTime: 25 + (restaurantIdNum % 20), // Between 25 and 44 minutes
    costForTwo: 300 + (restaurantIdNum % 700), // Between 300 and 999
    partnerSince: new Date(now.getFullYear() - (restaurantIdNum % 5), now.getMonth(), now.getDate()),
    contactPhone: `+91 9${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
    contactEmail: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`
  };
}

/**
 * Get mock restaurant metrics for demo mode
 * @param {string} restaurantId - ID of the restaurant
 * @returns {object} Mock restaurant metrics
 */
function getMockRestaurantMetrics(restaurantId) {
  // Generate consistent metrics based on the restaurant ID
  const restaurantIdNum = parseInt(restaurantId.replace(/\D/g, '')) || 12345;
  
  // Calculate metrics
  const orderAccuracy = 0.85 + (restaurantIdNum % 15) / 100; // Between 0.85 and 0.99
  const avgDeliveryTime = 25 + (restaurantIdNum % 20); // Between 25 and 44 minutes
  const avgPrepTime = 15 + (restaurantIdNum % 15); // Between 15 and 29 minutes
  const avgWaitTime = avgDeliveryTime - avgPrepTime; // Delivery time minus prep time
  
  // Calculate issues
  const wrongOrderRate = 0.01 + (restaurantIdNum % 5) / 100; // Between 0.01 and 0.05
  const missingItemRate = 0.02 + (restaurantIdNum % 4) / 100; // Between 0.02 and 0.05
  const lateDeliveryRate = 0.05 + (restaurantIdNum % 10) / 100; // Between 0.05 and 0.14
  
  return {
    id: restaurantId,
    orderAccuracy,
    avgDeliveryTime,
    avgPrepTime,
    avgWaitTime,
    wrongOrderRate,
    missingItemRate,
    lateDeliveryRate,
    orderVolume: {
      daily: 50 + (restaurantIdNum % 150), // Between 50 and 199
      weekly: 350 + (restaurantIdNum % 650), // Between 350 and 999
      monthly: 1500 + (restaurantIdNum % 1500) // Between 1500 and 2999
    },
    peakHours: [
      { hour: 12, orderVolume: 'HIGH' }, // Lunch
      { hour: 19, orderVolume: 'HIGH' }, // Dinner
      { hour: 20, orderVolume: 'HIGH' } // Dinner
    ]
  };
}

module.exports = {
  getRestaurantInfo,
  reportIssue,
  isRestaurantOpen,
  getRestaurantMetrics
};